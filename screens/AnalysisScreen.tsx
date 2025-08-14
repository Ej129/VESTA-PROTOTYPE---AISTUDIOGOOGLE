import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NavigateTo, Screen, AnalysisReport, Finding, User, FindingStatus, AuditLogAction, FeedbackReason, KnowledgeSource, DismissalRule, UserRole, ScreenLayoutProps } from '../types';
import { SidebarMainLayout } from '../components/Layout';
import { SparklesIcon, DownloadIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, AlertTriangleIcon, AlertCircleIcon } from '../components/Icons';
import UploadModal from '../components/UploadModal';
import { analyzePlan, improvePlan } from '../api/vesta';
import { AnimatedChecklist } from '../components/AnimatedChecklist';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';
import { useTour } from '../contexts/TourContext';
import TourTooltip from '../components/TourTooltip';
import { sampleReportForTour } from '../data/sample-report';
import FeedbackModal from '../components/FeedbackModal';


// --- SUB-COMPONENTS for AnalysisScreen ---

const MetricCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg card-shadow">
        <p className="text-sm font-semibold text-secondary-text-light dark:text-secondary-text-dark">{title}</p>
        <div className="mt-2">
            {children}
        </div>
    </div>
);

const ProgressBar: React.FC<{ value: number, colorClass: string }> = ({ value, colorClass }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
      <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
);

const FindingCard: React.FC<{ finding: Finding; onDismiss: (finding: Finding) => void; onResolve: (id: string) => void; onHover: (id: string | null) => void; }> = ({ finding, onDismiss, onResolve, onHover }) => {
    const severityInfo = {
        critical: { border: 'border-accent-critical', bg: 'bg-red-500/10', tagBg: 'bg-accent-critical', tagText: 'CRITICAL' },
        warning: { border: 'border-accent-warning', bg: 'bg-yellow-500/10', tagBg: 'bg-accent-warning', tagText: 'WARNING' }
    };
    const classes = severityInfo[finding.severity];

    return (
        <div className={`p-4 rounded-lg border-l-4 ${classes.border} ${classes.bg}`}
            onMouseEnter={() => onHover(finding.id)}
            onMouseLeave={() => onHover(null)}
        >
            <div className={`text-xs font-bold inline-block px-2 py-1 rounded-full text-white ${classes.tagBg} mb-2`}>{classes.tagText}</div>
            <h4 className="font-bold text-primary-text-light dark:text-primary-text-dark">{finding.title}</h4>
            <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark mt-2 leading-relaxed">{finding.recommendation}</p>
            {finding.status === 'active' && (
                <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-black/10 dark:border-white/10">
                    <button onClick={() => onDismiss(finding)} className="px-3 py-1 text-xs font-semibold text-secondary-text-light dark:text-secondary-text-dark bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md">
                        Dismiss
                    </button>
                    <button onClick={() => onResolve(finding.id)} className="px-3 py-1 text-xs font-semibold text-white bg-accent-success hover:bg-opacity-90 rounded-md">
                        Mark as Resolved
                    </button>
                </div>
            )}
            {finding.status !== 'active' && (
                 <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-black/10 dark:border-white/10">
                     <p className={`text-sm font-bold ${finding.status === 'resolved' ? 'text-accent-success' : 'text-secondary-text-dark'}`}>{finding.status.toUpperCase()}</p>
                 </div>
            )}
        </div>
    );
};

const createDiffHtml = (oldText: string, newText: string): string => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  // Basic LCS logic for lines to create a diff
  const dp = Array(oldLines.length + 1).fill(0).map(() => Array(newLines.length + 1).fill(0));
  for (let i = oldLines.length - 1; i >= 0; i--) {
    for (let j = newLines.length - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i+1][j+1];
      } else {
        dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
      }
    }
  }

  let i = 0;
  let j = 0;
  const resultLines: string[] = [];
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      resultLines.push(`<div>${oldLines[i] || '&nbsp;'}</div>`);
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || dp[i][j+1] >= dp[i+1][j])) {
      resultLines.push(`<div class="highlight-added">${newLines[j] || '&nbsp;'}</div>`);
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || dp[i][j+1] < dp[i+1][j])) {
      resultLines.push(`<div class="highlight-removed"><del>${oldLines[i] || '&nbsp;'}</del></div>`);
      i++;
    } else {
      break;
    }
  }
  return resultLines.join('');
};


// --- MAIN ANALYSIS SCREEN ---

const analysisSteps = [
    "Parsing document structure...",
    "Cross-referencing with BSP regulations...",
    "Evaluating operational risks...",
    "Generating actionable recommendations...",
];

const improvingSteps = [
    "Analyzing required changes...",
    "Integrating compliance clauses...",
    "Rewriting sections for clarity...",
    "Performing final grammar & tone check...",
    "Finalizing enhanced document...",
];

interface AnalysisScreenProps extends ScreenLayoutProps {
  activeReport: AnalysisReport | null;
  onAnalysisComplete: (report: AnalysisReport) => void;
  addAuditLog: (action: AuditLogAction, details: string) => void;
  knowledgeBaseSources: KnowledgeSource[];
  dismissalRules: DismissalRule[];
  onAddDismissalRule: (finding: Finding, reason: FeedbackReason) => void;
  userRole?: UserRole;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ activeReport, onAnalysisComplete, addAuditLog, knowledgeBaseSources, dismissalRules, onAddDismissalRule, userRole, ...layoutProps }) => {
  const { navigateTo } = layoutProps;
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [editorHtml, setEditorHtml] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(!activeReport);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackFinding, setFeedbackFinding] = useState<Finding | null>(null);
  
  const tour = useTour();
  const editorRef = useRef<HTMLDivElement>(null);
  const findingsRef = useRef<HTMLDivElement>(null);
  const autoFixRef = useRef<HTMLButtonElement>(null);
  const downloadButtonRef = useRef<HTMLDivElement>(null);
  
  const canEdit = useMemo(() => {
    if (!userRole) return false;
    return ['Administrator', 'Risk Management Officer', 'Strategy Officer', 'Compliance Officer'].includes(userRole);
  }, [userRole]);

  const highlightContent = (content: string, findings: Finding[]): string => {
    const paragraphs = content.split('\n');
    return paragraphs.map(p => {
        let highlightClass = '';
        for (const finding of findings) {
            if (p.includes(finding.sourceSnippet)) {
                highlightClass = `highlight-${finding.severity}`;
                break; // First finding wins
            }
        }
        return `<div id="p-${paragraphs.indexOf(p)}" class="${highlightClass}">${p || '&nbsp;'}</div>`;
    }).join('');
};


  const updateReportData = (report: AnalysisReport) => {
    setCurrentReport(report);
    const highlightedHtml = highlightContent(report.documentContent, report.findings);
    setEditorHtml(highlightedHtml);
    setPlainTextContent(report.documentContent);
    const firstActiveFinding = report.findings.find(f => f.status === 'active');
    setOpenAccordionId(firstActiveFinding?.id || report.findings[0]?.id || null);
  }

  useEffect(() => {
    if (activeReport) {
        if(tour && tour.isActive && activeReport.title === sampleReportForTour.title) {
            // This is the tour's sample report
        }
        updateReportData(activeReport);
        setShowUploadModal(false);
    } else {
      setShowUploadModal(true);
      setCurrentReport(null);
      setEditorHtml('');
    }
  }, [activeReport]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (downloadButtonRef.current && !downloadButtonRef.current.contains(event.target as Node)) {
              setIsDownloadOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
   useEffect(() => {
        if (tour && editorRef.current && findingsRef.current && autoFixRef.current) {
            tour.addStep({
                selector: '#editor-panel',
                title: 'Your Document',
                content: 'Your document appears here. The AI will highlight sections that need your attention.',
                position: 'right'
            });
            tour.addStep({
                selector: '#findings-panel',
                title: 'AI Findings',
                content: 'All findings from the analysis are listed here. Hover over one to see it in the document.',
                position: 'left'
            });
            tour.addStep({
                selector: '#auto-fix-button',
                title: 'One-Click Fix',
                content: 'Use the "Auto-Fix" button to let the AI rewrite your document and resolve all issues automatically.',
                position: 'bottom'
            });
        }
    }, [tour, editorRef.current, findingsRef.current, autoFixRef.current]);

  const handleFindingStatusChange = (findingId: string, status: FindingStatus) => {
    addAuditLog(status === 'resolved' ? 'Finding Resolved' : 'Finding Dismissed', `Status of finding ${findingId} changed to ${status}.`);
    setCurrentReport(prev => {
        if (!prev) return null;
        return {
            ...prev,
            findings: prev.findings.map(f => f.id === findingId ? { ...f, status } : f)
        };
    });
  };

  const handleHoverFinding = (findingId: string | null) => {
      // Future feature: This can be used to scroll document to highlighted paragraph.
      // For now, the visual connection is made via color-coded highlights.
  };

  const handleFileUpload = async (content: string, fileName: string) => {
      addAuditLog('Document Upload', `File uploaded: ${fileName}`);
      setShowUploadModal(false);
      setIsLoading(true);
      const report = await analyzePlan(content, knowledgeBaseSources, dismissalRules);
      report.title = fileName || "Pasted Text Analysis";
      onAnalysisComplete(report); // Add to dashboard history
      updateReportData(report);
      setIsLoading(false);
  };

  const handleAutoFix = async () => {
      if (!currentReport || !canEdit) return;
      addAuditLog('Auto-Fix', `Auto-fix initiated for: ${currentReport.title}`);
      setIsImproving(true);
      
      const originalPlainText = plainTextContent; // Save original content for diff
      const improvedText = await improvePlan(originalPlainText, currentReport);
      
      const newFindings = currentReport.findings.map(f => ({ ...f, status: 'resolved' as FindingStatus }));
      
      // Create HTML with diff highlights
      const diffHtml = createDiffHtml(originalPlainText, improvedText);

      // Directly update state to show diff
      setEditorHtml(diffHtml);
      setPlainTextContent(improvedText);
      setCurrentReport(prev => prev ? {
          ...prev,
          documentContent: improvedText,
          findings: newFindings
      } : null);

      setIsImproving(false);
  };

  const handleDownload = (format: 'PDF' | 'DOCX' | 'TXT') => {
      setIsDownloadOpen(false);
      const title = currentReport?.title.replace(/\.[^/.]+$/, "") || 'document';

      if (format === 'PDF') {
          const doc = new jsPDF();
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(plainTextContent, 180);
          doc.text(lines, 15, 15);
          doc.save(`${title}.pdf`);
      } else if (format === 'DOCX') {
          const doc = new Document({
              sections: [{
                  children: plainTextContent.split('\n').map(p => new Paragraph({ text: p })),
              }],
          });
          Packer.toBlob(doc).then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${title}.docx`;
              a.click();
              window.URL.revokeObjectURL(url);
          });
      } else if (format === 'TXT') {
          const blob = new Blob([plainTextContent], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title}.txt`;
          a.click();
          window.URL.revokeObjectURL(url);
      }
  };

  const handleSaveChanges = () => {
    setIsEditing(false);
    if (!currentReport) return;
    const newHighlightedHtml = highlightContent(plainTextContent, currentReport.findings);
    setEditorHtml(newHighlightedHtml);
    setCurrentReport(prev => prev ? {
      ...prev,
      documentContent: plainTextContent,
    } : null);
  };

  const handleDismissClick = (finding: Finding) => {
    setFeedbackFinding(finding);
  };

  const handleResolveClick = (findingId: string) => {
    handleFindingStatusChange(findingId, 'resolved');
  };

  const handleFeedbackSubmit = (reason: FeedbackReason) => {
    if (!feedbackFinding) return;
    onAddDismissalRule(feedbackFinding, reason);
    handleFindingStatusChange(feedbackFinding.id, 'dismissed');
    setFeedbackFinding(null);
  };

  if (showUploadModal) {
      return (
        <SidebarMainLayout {...layoutProps} activeScreen={Screen.Analysis}>
          <UploadModal onUpload={handleFileUpload} onClose={() => navigateTo(Screen.Dashboard)} showTourStep={tour?.isActive && tour?.currentStep === 1} />
        </SidebarMainLayout>
      );
  }
  
  if (isLoading) {
      return (
          <SidebarMainLayout {...layoutProps} activeScreen={Screen.Analysis}>
              <div className="flex-1 flex flex-col items-center justify-center">
                  <AnimatedChecklist steps={analysisSteps} title="Analyzing Your Document..." />
              </div>
          </SidebarMainLayout>
      );
  }

  if (!currentReport) return <div className="flex-1"></div>;
  
  return (
    <SidebarMainLayout {...layoutProps} activeScreen={Screen.Analysis}>
        <div className="p-6 space-y-6">
            {/* Header and Metrics */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-primary-text-light dark:text-primary-text-dark">{currentReport.title}</h1>
                    <p className="text-secondary-text-light dark:text-secondary-text-dark">Analysis Report</p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="relative" ref={downloadButtonRef}>
                        <button onClick={() => setIsDownloadOpen(o => !o)} className="flex items-center px-4 py-2 bg-light-card dark:bg-dark-card border border-border-light dark:border-border-dark rounded-lg text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-200 dark:hover:bg-dark-sidebar transition text-sm font-semibold focus:ring-2 focus:ring-primary-blue">
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Download
                            <ChevronDownIcon className="w-4 h-4 ml-1" />
                        </button>
                        {isDownloadOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-light-card dark:bg-dark-card rounded-md shadow-lg z-10 border border-border-light dark:border-border-dark">
                                <a onClick={() => handleDownload('PDF')} className="block px-4 py-2 text-sm text-primary-text-light dark:text-primary-text-dark hover:bg-light-main dark:hover:bg-dark-main cursor-pointer">PDF</a>
                                <a onClick={() => handleDownload('DOCX')} className="block px-4 py-2 text-sm text-primary-text-light dark:text-primary-text-dark hover:bg-light-main dark:hover:bg-dark-main cursor-pointer">DOCX</a>
                                <a onClick={() => handleDownload('TXT')} className="block px-4 py-2 text-sm text-primary-text-light dark:text-primary-text-dark hover:bg-light-main dark:hover:bg-dark-main cursor-pointer">TXT</a>
                            </div>
                        )}
                    </div>
                     {isEditing ? (
                        <button onClick={handleSaveChanges} disabled={!canEdit} className="flex items-center px-4 py-2 bg-accent-success text-white font-bold rounded-lg transition text-sm disabled:opacity-50">
                            Save Changes
                        </button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} disabled={!canEdit} className="flex items-center px-4 py-2 bg-light-card dark:bg-dark-card border border-border-light dark:border-border-dark rounded-lg text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-200 dark:hover:bg-dark-sidebar transition text-sm font-semibold focus:ring-2 focus:ring-primary-blue disabled:opacity-50">
                            Edit Manually
                        </button>
                    )}
                    <button id="auto-fix-button" ref={autoFixRef} onClick={handleAutoFix} disabled={isImproving || isEditing || !canEdit} className="relative flex items-center px-4 py-2 btn-primary text-white font-bold rounded-lg transition text-sm disabled:opacity-50">
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        Auto-Fix & Enhance
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Resilience Score">
                    <span className="text-4xl font-bold text-accent-success">{currentReport.resilienceScore}%</span>
                    <ProgressBar value={currentReport.resilienceScore} colorClass="bg-accent-success" />
                </MetricCard>
                <MetricCard title="Critical Issues">
                    <p className="text-4xl font-bold text-accent-critical">{currentReport.findings.filter(f => f.severity === 'critical' && f.status === 'active').length}</p>
                    <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark mt-2">Requires immediate attention.</p>
                </MetricCard>
                <MetricCard title="Warnings">
                     <p className="text-4xl font-bold text-accent-warning">{currentReport.findings.filter(f => f.severity === 'warning' && f.status === 'active').length}</p>
                     <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark mt-2">Potential issues found.</p>
                </MetricCard>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-5 gap-6">
                {/* Left Panel: Document Editor */}
                <div id="editor-panel" ref={editorRef} className="col-span-3 h-[60vh] flex flex-col relative bg-light-card dark:bg-dark-card rounded-lg card-shadow border border-border-light dark:border-border-dark">
                    {isImproving && (
                        <div className="absolute inset-0 bg-dark-main/80 flex items-center justify-center z-20 rounded-lg">
                            <AnimatedChecklist steps={improvingSteps} title="Enhancing Document..." textColorClass="text-gray-200"/>
                        </div>
                    )}
                    {isEditing ? (
                        <textarea
                            value={plainTextContent}
                            onChange={(e) => setPlainTextContent(e.target.value)}
                            className="flex-1 w-full p-6 bg-transparent text-primary-text-light dark:text-primary-text-dark leading-relaxed font-mono text-sm focus:outline-none resize-none border-0"
                            autoFocus
                        />
                    ) : (
                        <div
                            dangerouslySetInnerHTML={{ __html: editorHtml }}
                            className="flex-1 w-full p-6 text-primary-text-light dark:text-primary-text-dark leading-relaxed font-mono text-sm overflow-y-auto"
                        />
                    )}
                </div>

                {/* Right Panel: Findings */}
                <div id="findings-panel" ref={findingsRef} className="col-span-2 h-[60vh] overflow-y-auto pr-2 space-y-4">
                     {currentReport.findings.length > 0 ? (
                        currentReport.findings.map(finding => (
                            <FindingCard
                                key={finding.id}
                                finding={finding}
                                onDismiss={handleDismissClick}
                                onResolve={handleResolveClick}
                                onHover={handleHoverFinding}
                            />
                        ))
                    ) : (
                        <div className="bg-light-card dark:bg-dark-card p-8 rounded-lg card-shadow text-center h-full flex flex-col justify-center items-center">
                            <CheckCircleIcon className="w-12 h-12 text-accent-success" />
                            <h3 className="text-lg font-semibold text-accent-success mt-4">No Issues Found</h3>
                            <p className="text-secondary-text-light dark:text-secondary-text-dark mt-1">This document meets all checks.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {tour && tour.isActive && editorRef.current && tour.currentStep === 2 && <TourTooltip targetElement={editorRef.current} step={tour.steps[2]} onNext={tour.nextStep} onSkip={tour.endTour}/>}
        {tour && tour.isActive && findingsRef.current && tour.currentStep === 3 && <TourTooltip targetElement={findingsRef.current} step={tour.steps[3]} onNext={tour.nextStep} onSkip={tour.endTour}/>}
        {tour && tour.isActive && autoFixRef.current && tour.currentStep === 4 && <TourTooltip targetElement={autoFixRef.current} step={tour.steps[4]} onNext={tour.endTour} onSkip={tour.endTour} nextLabel="Finish"/>}
        {feedbackFinding && (
            <FeedbackModal 
                finding={feedbackFinding}
                onClose={() => setFeedbackFinding(null)}
                onSubmit={handleFeedbackSubmit}
            />
        )}
    </SidebarMainLayout>
  );
};

export default AnalysisScreen;
