
import React, { useState, useEffect, useRef } from 'react';
import { Screen, AnalysisReport, Finding, FindingStatus, AuditLogAction, FeedbackReason, KnowledgeSource, DismissalRule, ScreenLayoutProps, UserRole, CustomRegulation } from '../types';
import { SparklesIcon, DownloadIcon, CheckCircleIcon, ChevronDownIcon, RefreshIcon } from '../components/Icons';
import UploadZone from '../components/UploadZone';
import { analyzePlan, improvePlan } from '../api/vesta';
import { AnimatedChecklist } from '../components/AnimatedChecklist';
import jsPDF from 'jspdf';
import FeedbackModal from '../components/FeedbackModal';
import { useHeader } from '../components/Layout';

// --- SUB-COMPONENTS for AnalysisScreen ---

const MetricCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-vesta-card-light dark:bg-vesta-card-dark p-4 rounded-lg shadow-sm">
        <p className="text-sm font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{title}</p>
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
        critical: { border: 'border-vesta-red', bg: 'bg-vesta-red/10', tagBg: 'bg-vesta-red', tagText: 'CRITICAL' },
        warning: { border: 'border-vesta-gold', bg: 'bg-vesta-gold/10', tagBg: 'bg-vesta-gold', tagText: 'WARNING' }
    };
    const classes = severityInfo[finding.severity];

    return (
        <div className={`p-4 rounded-lg border-l-4 ${classes.border} ${classes.bg}`}
            onMouseEnter={() => onHover(finding.id)}
            onMouseLeave={() => onHover(null)}
        >
            <div className={`text-xs font-bold inline-block px-2 py-1 rounded-full text-white ${classes.tagBg} mb-2`}>{classes.tagText}</div>
            <h4 className="font-bold text-vesta-text-light dark:text-vesta-text-dark">{finding.title}</h4>
            <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-2 leading-relaxed">{finding.recommendation}</p>
            {finding.status === 'active' && (
                <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-black/10 dark:border-white/10">
                    <button onClick={() => onDismiss(finding)} className="px-3 py-1 text-xs font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md">
                        Dismiss
                    </button>
                    <button onClick={() => onResolve(finding.id)} className="px-3 py-1 text-xs font-semibold text-white bg-vesta-red hover:bg-vesta-red-dark rounded-md" style={{backgroundColor: '#b11116', color: '#f6f7ec'}}>
                        Mark as Resolved
                    </button>
                </div>
            )}
            {finding.status !== 'active' && (
                 <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-black/10 dark:border-white/10">
                     <p className={`text-sm font-bold ${finding.status === 'resolved' ? 'text-accent-success' : 'text-vesta-text-secondary-dark'}`}>{finding.status.toUpperCase()}</p>
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
  onAnalysisComplete: (report: Omit<AnalysisReport, 'id'|'workspaceId'|'createdAt'>) => void;
  onUpdateReport: (report: AnalysisReport) => void;
  addAuditLog: (action: AuditLogAction, details: string) => void;
  knowledgeBaseSources: KnowledgeSource[];
  dismissalRules: DismissalRule[];
  onAddDismissalRule: (finding: Finding, reason: FeedbackReason) => void;
  customRegulations: CustomRegulation[];
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ activeReport, onAnalysisComplete, onUpdateReport, addAuditLog, knowledgeBaseSources, dismissalRules, onAddDismissalRule, userRole, customRegulations, navigateTo, currentWorkspace }) => {
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [editorHtml, setEditorHtml] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackFinding, setFeedbackFinding] = useState<Finding | null>(null);
  
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(activeReport?.title || '');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { setTitleContent, setActions } = useHeader();
  const downloadButtonRef = useRef<HTMLDivElement>(null);

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


  const updateLocalReportData = (report: AnalysisReport) => {
    setCurrentReport(report);
    const highlightedHtml = highlightContent(report.documentContent, report.findings);
    setEditorHtml(highlightedHtml);
    setPlainTextContent(report.documentContent);
  }

  useEffect(() => {
    if (activeReport) {
        updateLocalReportData(activeReport);
        setEditedTitle(activeReport.title);
    } else {
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
    if (isTitleEditing) {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
    }
  }, [isTitleEditing]);

  const handleTitleSave = () => {
    if (currentReport && editedTitle.trim() && editedTitle !== currentReport.title) {
        const updatedReport = { ...currentReport, title: editedTitle.trim() };
        setCurrentReport(updatedReport); // Optimistic update
        onUpdateReport(updatedReport);
        addAuditLog('Analysis Renamed', JSON.stringify({ message: `Analysis "${currentReport.title}" renamed to "${editedTitle.trim()}"`, reportId: currentReport.id }));
    }
    setIsTitleEditing(false);
  };

  const handleDownload = (format: 'PDF' | 'TXT') => {
      setIsDownloadOpen(false);
      const title = currentReport?.title.replace(/\.[^/.]+$/, "") || 'document';

      if (format === 'PDF') {
          const doc = new jsPDF();
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          
          const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
          const margin = 15;
          let y = margin;
          
          const lines = doc.splitTextToSize(plainTextContent, 180); // 180mm width
          const lineHeight = 7; // Approx line height for font size 10

          lines.forEach((line: string) => {
              if (y + lineHeight > pageHeight - margin) {
                  doc.addPage();
                  y = margin;
              }
              doc.text(line, margin, y);
              y += lineHeight;
          });
          
          doc.save(`${title}.pdf`);
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

  const handleReanalyze = async () => {
    if (!currentReport) return;
    setIsLoading(true);
    const reportData = await analyzePlan(plainTextContent, knowledgeBaseSources, dismissalRules, customRegulations);
    const updatedReport = {
      ...currentReport,
      ...reportData,
      documentContent: plainTextContent, // Keep the edited content
      title: `${currentReport.title} (Re-analyzed)`
    };
    onUpdateReport(updatedReport);
    addAuditLog('Analysis Run', JSON.stringify({ message: `Re-analysis completed for: ${updatedReport.title}`, reportId: updatedReport.id }));
    setIsLoading(false);
  }

  const handleSaveChanges = () => {
    setIsEditing(false);
    if (!currentReport || currentReport.documentContent === plainTextContent) return;
    
    const updatedReport = {
      ...currentReport,
      documentContent: plainTextContent,
    };
    const newHighlightedHtml = highlightContent(plainTextContent, currentReport.findings);
    setEditorHtml(newHighlightedHtml);
    setCurrentReport(updatedReport);
    onUpdateReport(updatedReport);
  };
  
  const handleAutoFix = async () => {
      if (!currentReport) return;
      addAuditLog('Auto-Fix', JSON.stringify({message: `Auto-fix initiated for: ${currentReport.title}`, reportId: currentReport.id}));
      setIsImproving(true);
      
      const originalPlainText = plainTextContent;
      const improvedText = await improvePlan(originalPlainText, currentReport);
      
      const updatedReport = {
          ...currentReport,
          documentContent: improvedText,
          findings: currentReport.findings.map(f => ({ ...f, status: 'resolved' as FindingStatus }))
      };

      setPlainTextContent(improvedText);
      setEditorHtml(createDiffHtml(originalPlainText, improvedText));
      setCurrentReport(updatedReport);
      onUpdateReport(updatedReport);

      setIsImproving(false);
  };
  
  const canEdit = userRole === 'Administrator' || userRole === 'Member' || userRole === 'Risk Management Officer' || userRole === 'Strategy Officer';

  // Effect to manage the header content
  useEffect(() => {
    setTitleContent(null);
    setActions(null);

    if (currentReport) {
      const canEditTitle = userRole === 'Administrator' || userRole === 'Member';

      const analysisTitle = isTitleEditing && canEditTitle ? (
        <input
            ref={titleInputRef}
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                    setIsTitleEditing(false);
                    setEditedTitle(currentReport.title);
                }
            }}
            className="text-xl font-bold bg-transparent border-b-2 border-vesta-gold text-vesta-gold w-full focus:outline-none"
            onClick={e => e.stopPropagation()}
        />
      ) : (
        <h1 
            className={`text-xl font-bold text-vesta-gold truncate ${canEditTitle ? 'cursor-pointer hover:bg-white/10 rounded-md px-2 -mx-2' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                if(canEditTitle) setIsTitleEditing(true);
            }}
            title={canEditTitle ? "Click to rename" : ""}
        >
            {currentReport.title}
        </h1>
      );

      setTitleContent(analysisTitle);

      setActions(
        <div className="flex items-center space-x-2">
            <div className="relative" ref={downloadButtonRef}>
                <button onClick={() => setIsDownloadOpen(o => !o)} className="flex items-center px-4 py-2 bg-vesta-card-light dark:bg-vesta-card-dark border-2 border-vesta-gold rounded-lg text-sm font-bold text-vesta-red hover:bg-vesta-gold hover:text-white transition-colors focus:ring-2 focus:ring-vesta-red">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Download
                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                </button>
                {isDownloadOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-vesta-card-light dark:bg-vesta-card-dark rounded-md shadow-lg z-50 border border-vesta-border-light dark:border-vesta-border-dark">
                        <a onClick={() => handleDownload('PDF')} className="block px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-vesta-bg-light dark:hover:bg-vesta-bg-dark cursor-pointer">PDF</a>
                        <a onClick={() => handleDownload('TXT')} className="block px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-vesta-bg-light dark:hover:bg-vesta-bg-dark cursor-pointer">TXT</a>
                    </div>
                )}
            </div>
             {isEditing ? (
                <>
                  <button onClick={handleReanalyze} className="flex items-center px-4 py-2 bg-vesta-gold text-white font-bold rounded-lg transition text-sm">
                      <RefreshIcon className="w-4 h-4 mr-2" /> Re-Analyze
                  </button>
                  <button onClick={handleSaveChanges} className="flex items-center px-4 py-2 bg-accent-success text-white font-bold rounded-lg transition text-sm">
                      Save Changes
                  </button>
                </>
            ) : (
                <button onClick={() => setIsEditing(true)} disabled={!canEdit} className="flex items-center px-4 py-2 bg-vesta-card-light dark:bg-vesta-card-dark border border-vesta-border-light dark:border-vesta-border-dark rounded-lg text-sm font-bold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-200 dark:hover:bg-vesta-card-dark/50 transition focus:ring-2 focus:ring-vesta-red disabled:opacity-50">
                    Edit Manually
                </button>
            )}
            <button id="auto-fix-button" onClick={handleAutoFix} disabled={isImproving || isEditing || !canEdit} className="relative flex items-center px-4 py-2 bg-vesta-red text-white font-bold rounded-lg transition text-sm disabled:opacity-50 hover:bg-vesta-red-dark">
                <SparklesIcon className="w-4 h-4 mr-2" />
                Auto-Fix & Enhance
            </button>
        </div>
      );
    }
  }, [currentReport, isEditing, isDownloadOpen, isImproving, plainTextContent, currentWorkspace, isTitleEditing, editedTitle, userRole, setTitleContent, setActions]);

  
  const handleFindingStatusChange = (findingId: string, status: FindingStatus) => {
    setCurrentReport(prev => {
        if (!prev) return null;
        const updatedReport = {
            ...prev,
            findings: prev.findings.map(f => f.id === findingId ? { ...f, status } : f)
        };
        onUpdateReport(updatedReport);
        addAuditLog(status === 'resolved' ? 'Finding Resolved' : 'Finding Dismissed', JSON.stringify({message: `Status of finding "${updatedReport.findings.find(f=>f.id === findingId)?.title}" changed to ${status}.`, reportId: updatedReport.id}));
        return updatedReport;
    });
  };

  const handleHoverFinding = (findingId: string | null) => {
      // Future feature: This can be used to scroll document to highlighted paragraph.
  };

  const handleFileUpload = async (content: string, fileName: string) => {
      addAuditLog('Document Upload', `File uploaded: ${fileName}`);
      setIsLoading(true);
      const reportData = await analyzePlan(content, knowledgeBaseSources, dismissalRules, customRegulations);
      const report = { ...reportData, title: fileName || "Pasted Text Analysis" };
      onAnalysisComplete(report);
      setIsLoading(false);
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

  if (!activeReport) {
      return (
        <div className="h-full p-8 flex items-center justify-center">
            <UploadZone onUpload={handleFileUpload} />
        </div>
      );
  }
  
  if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full">
            <AnimatedChecklist steps={analysisSteps} title="Analyzing Your Document..." />
        </div>
      );
  }

  if (!currentReport) return null;
  
  return (
    <>
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Resilience Score">
                    <span className="text-4xl font-bold font-display text-vesta-gold">{currentReport.resilienceScore}%</span>
                    <ProgressBar value={currentReport.resilienceScore} colorClass="bg-vesta-gold" />
                </MetricCard>
                <MetricCard title="Critical Issues">
                    <p className="text-4xl font-bold font-display text-vesta-red">{currentReport.findings.filter(f => f.severity === 'critical' && f.status === 'active').length}</p>
                    <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-2">Requires immediate attention.</p>
                </MetricCard>
                <MetricCard title="Warnings">
                     <p className="text-4xl font-bold font-display text-vesta-gold">{currentReport.findings.filter(f => f.severity === 'warning' && f.status === 'active').length}</p>
                     <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-2">Potential issues found.</p>
                </MetricCard>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-5 gap-6">
                {/* Left Panel: Document Editor */}
                <div id="editor-panel" className="col-span-3 h-[calc(100vh-320px)] flex flex-col relative bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-sm border border-vesta-border-light dark:border-vesta-border-dark">
                    {isImproving && (
                        <div className="absolute inset-0 bg-vesta-bg-dark/80 flex items-center justify-center z-20 rounded-lg">
                            <AnimatedChecklist steps={improvingSteps} title="Enhancing Document..." textColorClass="text-gray-200"/>
                        </div>
                    )}
                    {isEditing ? (
                        <textarea
                            value={plainTextContent}
                            onChange={(e) => setPlainTextContent(e.target.value)}
                            className="flex-1 w-full p-6 bg-transparent text-vesta-text-light dark:text-vesta-text-dark leading-relaxed font-mono text-sm focus:outline-none resize-none border-0"
                            autoFocus
                        />
                    ) : (
                        <div
                            dangerouslySetInnerHTML={{ __html: editorHtml }}
                            className="flex-1 w-full p-6 text-vesta-text-light dark:text-vesta-text-dark leading-relaxed font-mono text-sm overflow-y-auto"
                        />
                    )}
                </div>

                {/* Right Panel: Findings */}
                <div id="findings-panel" className="col-span-2 h-[calc(100vh-320px)] overflow-y-auto pr-2 space-y-4">
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
                        <div className="bg-vesta-card-light dark:bg-vesta-card-dark p-8 rounded-lg shadow-sm text-center h-full flex flex-col justify-center items-center">
                            <CheckCircleIcon className="w-12 h-12 text-accent-success" />
                            <h3 className="text-lg font-semibold text-accent-success mt-4">No Issues Found</h3>
                            <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-1">This document meets all checks.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {feedbackFinding && (
            <FeedbackModal 
                finding={feedbackFinding}
                onClose={() => setFeedbackFinding(null)}
                onSubmit={handleFeedbackSubmit}
            />
        )}
    </>
  );
};

export default AnalysisScreen;
