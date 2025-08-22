

import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, Finding, ScreenLayoutProps, FindingStatus, FeedbackReason } from '../types';
import { SparklesIcon, DownloadIcon, EditIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, AlertCircleIcon } from '../components/Icons';
import jsPDF from 'jspdf';
import * as workspaceApi from '../api/workspace';
import FeedbackModal from '../components/FeedbackModal';
import { AnimatedChecklist } from '../components/AnimatedChecklist';

const ThemedScoreCard: React.FC<{ label: string, score: number }> = ({ label, score }) => (
  <div className="bg-vesta-bg-light dark:bg-vesta-bg-dark border border-vesta-border-light dark:border-vesta-border-dark rounded-lg p-3 shadow-sm">
    <div className="flex justify-between items-center font-bold text-vesta-text-light dark:text-vesta-text-dark">
      <span>{label}</span>
      <span className='font-display text-vesta-red'>{score}%</span>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-2">
      <div className="bg-vesta-red h-full rounded-full" style={{ width: `${score}%` }}></div>
    </div>
  </div>
);

const FindingCard: React.FC<{ finding: Finding; onStatusChange: (findingId: string, status: FindingStatus) => void; onDismiss: (finding: Finding) => void; }> = ({ finding, onStatusChange, onDismiss }) => {
    const severityClasses = {
        critical: {
            icon: <AlertTriangleIcon className="w-5 h-5 text-white" />,
            bg: 'bg-accent-critical',
            text: 'text-white',
        },
        warning: {
            icon: <AlertCircleIcon className="w-5 h-5 text-vesta-red" />,
            bg: 'bg-accent-warning',
            text: 'text-vesta-red',
        },
    };
    const { icon, bg, text } = severityClasses[finding.severity];

    return (
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-sm border border-vesta-border-light dark:border-vesta-border-dark overflow-hidden">
            <div className={`p-4 flex items-start ${bg} ${text}`}>
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="ml-3">
                    <h3 className="font-bold">{finding.title}</h3>
                </div>
            </div>
            <div className="p-4 space-y-4">
                <div>
                    <h4 className="font-semibold text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-1">Source Snippet</h4>
                    <blockquote className="border-l-4 border-vesta-red pl-4 py-2 bg-gray-50 dark:bg-vesta-bg-dark text-vesta-text-light dark:text-vesta-text-dark italic">
                        "{finding.sourceSnippet}"
                    </blockquote>
                </div>
                <div>
                    <h4 className="font-semibold text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-1">Recommendation</h4>
                    <p className="text-vesta-text-light dark:text-vesta-text-dark">{finding.recommendation}</p>
                </div>
            </div>
            {finding.status === 'active' && (
                 <div className="px-4 py-3 bg-gray-50 dark:bg-vesta-bg-dark border-t border-vesta-border-light dark:border-vesta-border-dark flex justify-end space-x-3">
                    <button onClick={() => onDismiss(finding)} className="flex items-center px-3 py-1 text-xs font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md">
                        <XCircleIcon className="w-4 h-4 mr-1" /> Dismiss
                    </button>
                    <button onClick={() => onStatusChange(finding.id, 'resolved')} className="flex items-center px-3 py-1 text-xs font-semibold text-white bg-accent-success hover:bg-green-600 rounded-md">
                        <CheckCircleIcon className="w-4 h-4 mr-1" /> Mark as Resolved
                    </button>
                </div>
            )}
        </div>
    );
};


const enhancementSteps = [
    "Analyzing findings...",
    "Applying compliance formatting...",
    "Improving clarity and structure...",
    "Generating revised document...",
];

interface AnalysisScreenProps extends ScreenLayoutProps {
  activeReport: AnalysisReport | null;
  onUpdateReport: (report: AnalysisReport) => void;
  onAutoEnhance: (report: AnalysisReport) => Promise<AnalysisReport>;
  isEnhancing: boolean;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ activeReport, onUpdateReport, onAutoEnhance, isEnhancing, currentWorkspace }) => {
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackFinding, setFeedbackFinding] = useState<Finding | null>(null);

  useEffect(() => {
    setCurrentReport(activeReport);
  }, [activeReport]);

  const canEdit = true;

  const handleDownload = (format: 'PDF') => {
      const title = currentReport?.title.replace(/\.[^/.]+$/, "") || 'document';
      if (format === 'PDF' && currentReport) {
          const doc = new jsPDF();
          doc.setFont('times', 'normal');
          const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
          const margin = 20;
          let y = margin;
          const lines = doc.splitTextToSize(currentReport.documentContent, doc.internal.pageSize.width - margin * 2);
          doc.setFontSize(18);
          doc.text(title, margin, y);
          y += 15;
          doc.setFontSize(12);
          const lineHeight = 7;
          lines.forEach((line: string) => {
              if (y + lineHeight > pageHeight - margin) {
                  doc.addPage();
                  y = margin;
              }
              doc.text(line, margin, y);
              y += lineHeight;
          });
          doc.save(`${title}.pdf`);
      }
  };

  const handleSaveChanges = () => {
    setIsEditing(false);
    if (!currentReport) return;
    onUpdateReport(currentReport);
  };
  
  const handleEnhanceClick = async () => {
    if (!currentReport) return;
    const updatedReport = await onAutoEnhance(currentReport);
    setCurrentReport(updatedReport);
  };

  const handleFindingStatusChange = (findingId: string, status: FindingStatus) => {
    if (!currentReport) return;
    const updatedFindings = currentReport.findings.map(f => f.id === findingId ? { ...f, status } : f);
    const updatedReport = { ...currentReport, findings: updatedFindings };
    setCurrentReport(updatedReport);
    onUpdateReport(updatedReport);
  };
  
  const handleDismiss = async (reason: FeedbackReason) => {
      if (!feedbackFinding || !currentReport) return;
      await workspaceApi.addDismissalRule(currentWorkspace.id, { findingTitle: feedbackFinding.title, reason });
      handleFindingStatusChange(feedbackFinding.id, 'dismissed');
      setFeedbackFinding(null);
  };

  if (!currentReport) {
      return (
        <div className="flex items-center justify-center h-full">
            <p>No active report. Please upload a document to start analysis.</p>
        </div>
      );
  }
  
  const activeFindings = currentReport.findings.filter(f => f.status === 'active');

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {feedbackFinding && <FeedbackModal finding={feedbackFinding} onClose={() => setFeedbackFinding(null)} onSubmit={handleDismiss} />}
        
        {/* Left Column: Document Editor */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-lg border border-vesta-border-light dark:border-vesta-border-dark">
                <div className="p-4 flex justify-between items-center border-b border-vesta-border-light dark:border-vesta-border-dark">
                    <h2 className="font-bold text-lg text-vesta-text-light dark:text-vesta-text-dark truncate pr-4">{currentReport.title}</h2>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                         <button onClick={() => handleDownload('PDF')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-vesta-bg-dark"><DownloadIcon className="w-5 h-5 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark"/></button>
                         {isEditing ? (
                             <button onClick={handleSaveChanges} className="px-4 py-1.5 border border-vesta-red rounded-lg text-sm font-bold bg-vesta-red text-white hover:bg-vesta-red-dark">Save</button>
                         ) : (
                             <button onClick={() => setIsEditing(true)} disabled={!canEdit} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-vesta-bg-dark disabled:opacity-50"><EditIcon className="w-5 h-5 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark"/></button>
                         )}
                    </div>
                </div>
                <div className={`p-6 bg-vesta-bg-springwood dark:bg-gray-900 rounded-b-xl min-h-[60vh] ${isEnhancing ? 'flex items-center justify-center' : ''}`}>
                    {isEnhancing ? (
                        <AnimatedChecklist steps={enhancementSteps} />
                    ) : (
                        isEditing ? (
                            <textarea
                                value={currentReport.documentContent}
                                onChange={(e) => setCurrentReport({ ...currentReport, documentContent: e.target.value })}
                                className="w-full h-full bg-transparent focus:outline-none resize-none text-base leading-relaxed font-sans text-black"
                                autoFocus
                            />
                        ) : (
                            <div className="prose prose-sm max-w-none text-black whitespace-pre-wrap">{currentReport.documentContent}</div>
                        )
                    )}
                </div>
            </div>
        </div>
        
        {/* Right Column: Analysis & Findings */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-lg border border-vesta-border-light dark:border-vesta-border-dark p-6 space-y-4">
                <h2 className="text-xl font-bold font-display text-vesta-gold uppercase tracking-wider text-center">Analysis Report</h2>
                <ThemedScoreCard label="Project Score" score={currentReport.scores?.project || currentReport.resilienceScore} />
                <ThemedScoreCard label="Strategic Goals" score={currentReport.scores?.strategicGoals || 0} />
                <ThemedScoreCard label="Regulations" score={currentReport.scores?.regulations || 0} />
                <ThemedScoreCard label="Risk" score={currentReport.scores?.risk || 0} />
            </div>
            
            <button
                onClick={handleEnhanceClick}
                disabled={isEnhancing}
                className="w-full flex items-center justify-center py-3 px-4 bg-vesta-red text-vesta-gold font-bold rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
                <SparklesIcon className="w-5 h-5 mr-2" />
                {isEnhancing ? 'Enhancing...' : 'Auto-Enhance Document'}
            </button>
            
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-vesta-text-light dark:text-vesta-text-dark">Actionable Findings ({activeFindings.length})</h3>
                {activeFindings.length > 0 ? (
                    activeFindings.map(finding => (
                        <FindingCard key={finding.id} finding={finding} onStatusChange={handleFindingStatusChange} onDismiss={() => setFeedbackFinding(finding)} />
                    ))
                ) : (
                    <div className="text-center p-8 bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg border border-vesta-border-light dark:border-vesta-border-dark">
                        <CheckCircleIcon className="w-12 h-12 mx-auto text-accent-success" />
                        <p className="mt-4 font-semibold text-vesta-text-light dark:text-vesta-text-dark">No active findings!</p>
                        <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">This document meets all checks.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AnalysisScreen;