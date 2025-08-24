// src/screens/AnalysisScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, Finding, ScreenLayoutProps, FindingStatus, FeedbackReason, ChatMessage } from '../types';
import { StarIcon, DownloadIcon, EditIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, AlertCircleIcon, SendIcon, MessageSquareIcon, ChevronDownIcon } from '../components/Icons';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as workspaceApi from '../api/workspace';
import * as vestaApi from '../api/vesta';
import FeedbackModal from '../components/FeedbackModal';

const DocumentEditor: React.FC<{
  report: AnalysisReport;
  isEditing: boolean;
  onContentChange: (content: string) => void;
  onSaveChanges: () => void;
  onToggleEdit: () => void;
  onDownloadPdf: () => void;
  onDownloadTxt: () => void;
  onDownloadDocx: () => void;
  hoveredFindingId: string | null;
  selectedFindingId: string | null;
}> = ({ report, isEditing, onContentChange, onSaveChanges, onToggleEdit, onDownloadPdf, onDownloadTxt, onDownloadDocx, hoveredFindingId, selectedFindingId }) => {
    
    const escapeHtml = (unsafe: string) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

    const getHighlightedContent = () => {
        if (!report) return '';
        let content = report.documentContent;
        content = escapeHtml(content);
        const sortedFindings = [...report.findings].sort((a, b) => b.sourceSnippet.length - a.sourceSnippet.length);
        sortedFindings.forEach(finding => {
            const isHovered = finding.id === hoveredFindingId;
            const isSelected = finding.id === selectedFindingId;
            let highlightClass = finding.severity === 'critical' ? 'highlight-critical' : 'highlight-warning';
            if (isSelected) {
                highlightClass += ' ring-2 ring-offset-1 dark:ring-offset-neutral-950 ring-red-500 dark:ring-yellow-400';
            } else if (isHovered) {
                 highlightClass += ' ring-2 ring-offset-1 dark:ring-offset-neutral-950 ring-blue-400';
            }
            const replacement = `<mark id="snippet-${finding.id}" class="${highlightClass}">${escapeHtml(finding.sourceSnippet)}</mark>`;
            content = content.replace(new RegExp(escapeRegExp(escapeHtml(finding.sourceSnippet)), 'g'), replacement);
        });
        return content;
    };

    // --- NEW: Function to highlight AI-generated changes ---
    const getHighlightedChangesContent = () => {
        if (!report?.diffContent) return getHighlightedContent();

        return report.diffContent.split('\n').map(line => {
            if (line.startsWith('++ ')) {
                return `<mark class="highlight-added">${escapeHtml(line.substring(3))}</mark>`;
            }
            if (line.startsWith('-- ')) {
                return ''; // Don't show removed lines
            }
            return escapeHtml(line);
        }).join('\n');
    };

    const isEnhancedReport = !!report.diffContent;

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800 flex flex-col h-full">
            <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
                <div>
                    <p className="text-xs text-gray-500 dark:text-neutral-500">{report.workspaceId.replace('-', ' ').toUpperCase()}</p>
                    <h2 className="font-bold text-lg text-gray-800 dark:text-neutral-50 truncate pr-4">{report.title}</h2>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <DownloadDropdown onDownloadPdf={onDownloadPdf} onDownloadTxt={onDownloadTxt} onDownloadDocx={onDownloadDocx} />
                    {isEditing ? (
                        <button onClick={onSaveChanges} className="px-4 py-1.5 border border-red-700 rounded-lg text-sm font-bold bg-red-700 text-white hover:bg-red-800">Save Draft</button>
                    ) : (
                        <button onClick={onToggleEdit} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800" title="Edit Document"><EditIcon className="w-5 h-5 text-gray-500 dark:text-neutral-400"/></button>
                    )}
                </div>
            </div>
            <div className={`p-6 bg-gray-50 dark:bg-neutral-950 rounded-b-xl flex-1 overflow-y-auto`}>
                 {isEditing ? (
                    <textarea value={report.documentContent} onChange={(e) => onContentChange(e.target.value)} className="w-full h-full bg-transparent focus:outline-none resize-none text-base leading-relaxed font-sans text-gray-800 dark:text-neutral-200" autoFocus />
                ) : (
                    <div 
                        className="prose prose-sm max-w-none text-gray-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed" 
                        dangerouslySetInnerHTML={{ __html: isEnhancedReport ? getHighlightedChangesContent() : getHighlightedContent() }}
                    ></div>
                )}
            </div>
        </div>
    );
};

// ... (Your ScoreCard, AnalysisPanel, and ChatPanel components can remain here as they are)

interface AnalysisScreenProps extends ScreenLayoutProps {
  activeReport: AnalysisReport | null;
  onUpdateReport: (report: AnalysisReport) => void;
  onAutoEnhance: (report: AnalysisReport) => Promise<string>;
  isEnhancing: boolean;
  onNewAnalysis: (content: string, fileName: string, diffContent?: string) => void; // Modified
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ activeReport, onUpdateReport, onAutoEnhance, isEnhancing, currentWorkspace, onNewAnalysis }) => {
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackFinding, setFeedbackFinding] = useState<Finding | null>(null);
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentReport(activeReport);
  }, [activeReport]);
  
  // --- NEW: Simplified enhance handler ---
  const handleEnhanceClick = async () => {
    if (!currentReport || isEnhancing) return;

    // We call the onAutoEnhance function passed from App.tsx
    const diffContent = await onAutoEnhance(currentReport);

    // Clean the diff markers to get the final content
    const cleanContent = diffContent.split('\n')
        .filter(line => !line.startsWith('-- '))
        .map(line => line.startsWith('++ ') ? line.substring(3) : line)
        .join('\n');
    
    // Trigger a new analysis with the clean content AND the original diff content
    onNewAnalysis(cleanContent, `${currentReport.title} (Enhanced)`, diffContent);
  };

  // ... (Your other download handlers and functions can remain here as they are)

  if (!currentReport) {
      return (
        <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No active report. Please select an analysis from the dashboard.</p>
        </div>
      );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6 h-full overflow-hidden">
        {feedbackFinding && <FeedbackModal finding={feedbackFinding} onClose={() => setFeedbackFinding(null)} onSubmit={handleDismiss} />}
        
        <div className="xl:col-span-2 h-full min-h-[80vh]">
            <DocumentEditor 
                report={currentReport} 
                isEditing={isEditing} 
                onContentChange={(content) => setCurrentReport({ ...currentReport, documentContent: content })}
                onSaveChanges={handleSaveChanges}
                onToggleEdit={() => setIsEditing(!isEditing)}
                onDownloadPdf={handleDownloadPdf}
                onDownloadTxt={handleDownloadTxt}
                onDownloadDocx={handleDownloadDocx}
                hoveredFindingId={hoveredFindingId}
                selectedFindingId={selectedFindingId}
            />
        </div>
        
        <div className="xl:col-span-1 h-full overflow-y-auto space-y-6">
            <AnalysisPanel 
              report={currentReport} 
              onEnhance={handleEnhanceClick} 
              isEnhancing={isEnhancing} // Use the global isEnhancing state
              onStatusChange={handleFindingStatusChange}
              onDismiss={(f) => setFeedbackFinding(f)}
              setHoveredFindingId={setHoveredFindingId}
              onFindingClick={handleFindingClick}
            />
            <div className="h-[500px]">
              <ChatPanel documentContent={currentReport.documentContent} />
            </div>
        </div>
    </div>
  );
};

export default AnalysisScreen;