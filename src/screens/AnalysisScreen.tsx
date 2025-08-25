// src/screens/AnalysisScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  AnalysisReport,
  Finding,
  ScreenLayoutProps,
  FindingStatus,
  FeedbackReason,
  ChatMessage,
  Screen,
} from '../types';
import {
  StarIcon,
  DownloadIcon,
  EditIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  SendIcon,
  MessageSquareIcon,
  ChevronDownIcon,
} from '../components/Icons';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as workspaceApi from '../api/workspace';
import * as vestaApi from '../api/vesta';
import FeedbackModal from '../components/FeedbackModal';
import { AnimatedChecklist } from '../components/AnimatedChecklist';

// Arrow Left Icon Component
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

// Back Button Component
const BackButton: React.FC<{ onBack: () => void; title?: string }> = ({ onBack, title }) => (
  <button
    onClick={onBack}
    className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 group"
    title={title || "Back to Dashboard"}
  >
    <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
    <span className="text-sm font-medium">Back</span>
  </button>
);

/* ---------------- Enhance / Draft Preview UI ---------------- */
// Replace current EnhanceControls with this restored, clickable button that falls back to onEnhance.
const EnhanceControls: React.FC<{
  activeReport: AnalysisReport;
  onAutoEnhance?: (report?: AnalysisReport) => Promise<void> | void;
  onEnhance?: () => void;
  isEnhancing?: boolean;
  isAnalyzing?: boolean;
}> = ({ activeReport, onAutoEnhance, onEnhance, isEnhancing, isAnalyzing }) => {
  const busy = !!isEnhancing || !!isAnalyzing;
  const handleClick = async () => {
    if (busy || !activeReport) return;
    // prefer explicit onAutoEnhance, otherwise call the older onEnhance handler
    try {
      if (typeof onAutoEnhance === 'function') {
        await onAutoEnhance(activeReport);
      } else if (typeof onEnhance === 'function') {
        await onEnhance();
      } else {
        console.warn('No enhance handler provided');
      }
    } catch (err) {
      console.error('Enhance failed', err);
    }
  };

  return (
    <div className="enhance-action">
      <button
        onClick={handleClick}
        disabled={busy || !activeReport}
        className={
          `inline-flex items-center justify-center px-5 py-2 rounded-lg text-white font-semibold shadow-md transition ` +
          (busy ? 'opacity-60 cursor-not-allowed bg-amber-400' : 'bg-amber-500 hover:bg-amber-600')
        }
        title={busy ? (isEnhancing ? 'Enhancing…' : (isAnalyzing ? 'Analyzing…' : 'Working…')) : 'Auto-enhance this document'}
      >
        {isEnhancing ? 'Enhancing…' : 'Auto-Enhance'}
      </button>
    </div>
  );
};

/* ---------------- DownloadDropdown ---------------- */
const DownloadDropdown: React.FC<{
  onDownloadPdf: () => void;
  onDownloadTxt: () => void;
  onDownloadDocx: () => void;
}> = ({ onDownloadPdf, onDownloadTxt, onDownloadDocx }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center space-x-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
        title="Download Options"
      >
        <DownloadIcon className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
        <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-md shadow-lg z-20 border border-gray-200 dark:border-neutral-700 py-1">
          <button
            onClick={() => {
              onDownloadPdf();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            Download as PDF
          </button>
          <button
            onClick={() => {
              onDownloadDocx();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            Download as DOCX
          </button>
          <button
            onClick={() => {
              onDownloadTxt();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            Download as TXT
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------------- DocumentEditor ---------------- */
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
}> = ({
  report,
  isEditing,
  onContentChange,
  onSaveChanges,
  onToggleEdit,
  onDownloadPdf,
  onDownloadTxt,
  onDownloadDocx,
  hoveredFindingId,
  selectedFindingId,
}) => {
  const [showComparison, setShowComparison] = useState(true);

  const escapeHtml = (unsafe: string) =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getHighlightedContent = () => {
    if (!report) return "";
    let content = report.documentContent;
    return escapeHtml(content).replace(/\n/g, "<br />");
  };

  const getHighlightedChangesContent = () => {
    if (!report?.diffContent) return getHighlightedContent();
    return report.diffContent
      .split("\n")
      .map((line) => {
        if (line.startsWith('++ ')) {
          return `<mark class="highlight-added">${escapeHtml(
            line.substring(3)
          )}</mark>`;
        }
        if (line.startsWith("-- ")) {
          return `<mark class="highlight-removed">${escapeHtml(
            line.substring(3)
          )}</mark>`;
        }
        return escapeHtml(line);
      })
      .join("<br />");
  };

  const isEnhancedReport = !!report.diffContent;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800 flex flex-col h-full">
      {/* Header */} 
      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
        <div>
          <p className="text-xs text-gray-500 dark:text-neutral-500">
            {report.workspaceId.replace("-", " ").toUpperCase()}
          </p>
          <h2 className="font-bold text-lg text-gray-800 dark:text-neutral-50 truncate pr-4">
            {report.title}
          </h2>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isEnhancedReport && (
            <button
              onClick={() => setShowComparison((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              {showComparison ? "Enhanced Only" : "Compare"}
            </button>
          )}
          <DownloadDropdown
            onDownloadPdf={onDownloadPdf}
            onDownloadTxt={onDownloadTxt}
            onDownloadDocx={onDownloadDocx}
          />
          {isEditing ? (
            <button
              onClick={onSaveChanges}
              className="px-4 py-1.5 border border-red-700 rounded-lg text-sm font-bold bg-red-700 text-white hover:bg-red-800"
            >
              Save Draft
            </button>
          ) : (
            <button
              onClick={onToggleEdit}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
              title="Edit Document"
            >
              <EditIcon className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 bg-gray-50 dark:bg-neutral-950 rounded-b-xl flex-1 overflow-y-auto">
        {isEditing ? (
          <textarea
            value={report.documentContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-full bg-transparent focus:outline-none resize-none text-base leading-relaxed font-sans text-gray-800 dark:text-neutral-200"
            autoFocus
          />
        ) : isEnhancedReport && showComparison ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left column: Original */}
            <div className="prose prose-sm max-w-none text-gray-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed border-r border-gray-200 dark:border-neutral-700 pr-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-neutral-400">
                Original
              </h3>
              <div
                dangerouslySetInnerHTML={{ __html: getHighlightedContent() }}
              />
            </div>

            {/* Right column: Enhanced */}
            <div className="prose prose-sm max-w-none text-gray-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed pl-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-neutral-400">
                Enhanced
              </h3>
              <div
                dangerouslySetInnerHTML={{
                  __html: getHighlightedChangesContent(),
                }}
              />
            </div>
          </div>
        ) : (
          <div
            className="prose prose-sm max-w-none text-gray-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: isEnhancedReport
                ? getHighlightedChangesContent()
                : getHighlightedContent(),
            }}
          />
        )}
      </div>
    </div>
  );
};

/* ---------------- ScoreCard ---------------- */
const ScoreCard: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600 dark:text-green-500';
    if (s >= 70) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-red-600 dark:text-red-500';
  };

  return (
    <div className="bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-gray-200 dark:border-neutral-800">
      <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{label}</p>
      <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
        {score}
        <span className="text-sm font-normal">%</span>
      </p>
    </div>
  );
};

/* ---------------- AnalysisPanel ---------------- */
const AnalysisPanel: React.FC<{
  report: AnalysisReport;
  onEnhance: () => void;
  onAutoEnhance?: (report?: AnalysisReport) => Promise<void> | void;
  enhancedDraft?: string;
  enhancedDraftHtml?: string;
  onAcceptEnhanced?: (reportId: string) => Promise<void> | void;
  onRejectEnhanced?: (reportId: string) => void;
  isEnhancing: boolean;
  analysisStatusText: string;
  onStatusChange: (findingId: string, status: FindingStatus) => void;
  onDismiss: (finding: Finding) => void;
  setHoveredFindingId: (id: string | null) => void;
  onFindingClick: (id: string) => void;
  isAnalyzing?: boolean;
}> = ({ report, onEnhance, onAutoEnhance, enhancedDraft, enhancedDraftHtml, onAcceptEnhanced, onRejectEnhanced, isEnhancing, analysisStatusText, onStatusChange, onDismiss, setHoveredFindingId, onFindingClick, isAnalyzing }) => {
  const activeFindings = report.findings.filter((f) => f.status === 'active');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800">
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-neutral-50 text-center">Analysis Panel</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          {/* Replace single button with EnhanceControls so preview/accept/reject available */}
          <EnhanceControls
            activeReport={report}
            onAutoEnhance={onAutoEnhance || (() => onEnhance())}
            isEnhancing={isEnhancing}
            isAnalyzing={isAnalyzing}
          />

          <div className="pt-6 border-t border-gray-200 dark:border-neutral-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-neutral-500 mb-3">Compliance Scores</h3>
            {report.scores ? (
              <div className="grid grid-cols-2 gap-3">
                <ScoreCard label="Project Score" score={report.scores.project} />
                <ScoreCard label="Strategic Goals" score={report.scores.strategicGoals} />
                <ScoreCard label="Regulations" score={report.scores.regulations} />
                <ScoreCard label="Risk Mitigation" score={report.scores.risk} />
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-lg text-center border dark:border-neutral-800">
                <p className="text-3xl font-bold text-red-700">{report.resilienceScore}%</p>
                <p className="text-sm text-gray-600 dark:text-neutral-300">Overall Score</p>
                <p className="text-xs text-center text-gray-500 dark:text-neutral-400 pt-2">
                  Detailed score breakdown is available for new analyses.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-lg text-gray-800 dark:text-neutral-50 mb-4">Actionable Findings ({activeFindings.length})</h3>

        {activeFindings.length > 0 ? (
          <div className="space-y-4">
            {activeFindings.map((finding) => {
              const isCritical = finding.severity === 'critical';
              const borderColor = isCritical ? 'border-red-600' : 'border-yellow-500';
              const iconColor = isCritical ? 'text-red-600' : 'text-yellow-500';
              const IconComponent = isCritical ? AlertTriangleIcon : AlertCircleIcon;

              return (
                <div
                  key={finding.id}
                  className={`bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-l-4 border-gray-200 dark:border-neutral-800 ${borderColor} cursor-pointer transition-shadow hover:shadow-md`}
                  onMouseEnter={() => setHoveredFindingId(finding.id)}
                  onMouseLeave={() => setHoveredFindingId(null)}
                  onClick={() => onFindingClick(finding.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start">
                      <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                      <h4 className="ml-3 font-bold text-gray-900 dark:text-neutral-100">{finding.title}</h4>
                    </div>
                    <div className="pl-8 mt-2 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-neutral-400 italic bg-gray-50 dark:bg-neutral-800/50 p-2 rounded">"{finding.sourceSnippet}"</p>
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{finding.recommendation}</p>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-gray-50 dark:bg-neutral-800/50 border-t border-gray-200 dark:border-neutral-700 flex justify-end space-x-2 rounded-b-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(finding);
                      }}
                      className="flex items-center px-2 py-1 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 rounded-md transition-colors duration-200"
                    >
                      <XCircleIcon className="w-4 h-4 mr-1" /> Dismiss
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(finding.id, 'resolved');
                      }}
                      className="flex items-center px-2 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-1" /> Resolved
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8 bg-white dark:bg-neutral-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-700">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500" />
            <p className="mt-4 font-semibold text-lg text-gray-800 dark:text-neutral-200">Excellent! No Active Findings</p>
            <p className="text-sm text-gray-500 dark:text-neutral-400">This document meets all compliance checks.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- ChatPanel ---------------- */
const ChatPanel: React.FC<{ documentContent: string }> = ({ documentContent }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const userMessage: ChatMessage = { role: 'user', content: currentInput };
    const historyForApi = messages;

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await vestaApi.getChatResponse(documentContent, historyForApi, currentInput);
      setMessages((prev) => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMessage: ChatMessage = { role: 'model', content: "I'm sorry, I couldn't get a response. Please try again later." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800 flex flex-col h-full">
      <h3 className="text-lg font-bold p-4 border-b border-gray-200 dark:border-neutral-700 flex items-center text-gray-800 dark:text-neutral-50">
        <MessageSquareIcon className="w-5 h-5 mr-3 text-red-700" /> Ask Gemini
      </h3>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-red-700 text-white rounded-br-none' : 'bg-gray-200 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 rounded-bl-none'}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-2xl bg-gray-200 dark:bg-neutral-800 rounded-bl-none">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-neutral-700">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Summarize risk factors..."
            className="w-full pl-4 pr-12 py-2 border border-gray-200 dark:border-neutral-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-700 bg-gray-50 dark:bg-neutral-800"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-red-700 text-white hover:bg-red-800 disabled:opacity-50" disabled={!input.trim() || isLoading}>
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

/* ---------------- Main AnalysisScreen ---------------- */
interface AnalysisScreenProps extends ScreenLayoutProps {
  activeReport: AnalysisReport | null;
  onUpdateReport: (report: AnalysisReport) => void;
  onAutoEnhance?: (report?: AnalysisReport) => Promise<void> | void;
  enhancedDraft?: string;
  enhancedDraftHtml?: string;
  onAcceptEnhanced?: (reportId: string) => Promise<void> | void;
  onRejectEnhanced?: (reportId: string) => void;
  isEnhancing: boolean;
  analysisStatusText: string;
  onNewAnalysis: (content: string, fileName: string, quickOrDiff?: boolean | string) => void;
  onBack?: () => void;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  activeReport,
  onUpdateReport,
  onAutoEnhance,
  enhancedDraft,
  enhancedDraftHtml,
  onAcceptEnhanced,
  onRejectEnhanced,
  isEnhancing,
  analysisStatusText,
  currentWorkspace,
  onNewAnalysis,
  navigateTo,
  onBack,
}) => {
  // Keep a local copy to allow editing before saving, but always sync to activeReport
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackFinding, setFeedbackFinding] = useState<Finding | null>(null);
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeReport && (!currentReport || activeReport.id !== currentReport.id || 
        activeReport.diffContent !== currentReport.diffContent ||
        activeReport.documentContent !== currentReport.documentContent)) {
      console.log("Updating currentReport with activeReport:", activeReport);
      setCurrentReport(activeReport);
    }
  }, [activeReport, currentReport]);

  // Default back handler if none provided
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigateTo(Screen.Dashboard);
    }
  };

  const handleEnhanceClick = async () => {
    if (!currentReport || isEnhancing) return;

    try {
      console.log("Starting enhancement for report:", currentReport.id);
      await onAutoEnhance?.(currentReport);
      console.log("Enhancement request submitted.");
    } catch (error) {
      console.error('Enhancement process failed and was caught in AnalysisScreen:', error);
    }
  };

  const handleFindingStatusChange = (findingId: string, status: FindingStatus) => {
    if (!currentReport) return;
    const updatedFindings = currentReport.findings.map((f) => (f.id === findingId ? { ...f, status } : f));
    const updatedReport = { ...currentReport, findings: updatedFindings };
    setCurrentReport(updatedReport);
    onUpdateReport(updatedReport);
  };

  const handleDismiss = async (reason: FeedbackReason) => {
    if (!feedbackFinding || !currentReport || !currentWorkspace) return;
    try {
      await workspaceApi.addDismissalRule(currentWorkspace.id, { findingTitle: feedbackFinding.title, reason });
      handleFindingStatusChange(feedbackFinding.id, 'dismissed');
      setFeedbackFinding(null);
    } catch (err) {
      console.error('Failed to add dismissal rule:', err);
    }
  };

  const handleFindingClick = (findingId: string) => {
    setSelectedFindingId(findingId);
    const element = document.getElementById(`snippet-${findingId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('mark-flash');
      setTimeout(() => element.classList.remove('mark-flash'), 1200);
    }
  };

  const handleDownloadPdf = () => {
    if (!currentReport) return;
    const doc = new jsPDF();
    const title = currentReport.title.replace(/\.[^/.]+$/, '') || 'document';
    
    // Use the enhanced content for download
    const contentToDownload = (currentReport.diffContent && currentReport.diffContent.length > 0)
      ? currentReport.diffContent
          .split('\n')
          .map(line => (line.startsWith('++ ') ? line.substring(3) : (line.startsWith('-- ') ? '' : line)))
          .filter(line => line !== '')
          .join('\n')
      : currentReport.documentContent;
    
    doc.setProperties({ title });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, 15, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let y = 30;
    const lines = doc.splitTextToSize(contentToDownload, doc.internal.pageSize.width - margin * 2);
    lines.forEach((line: string) => {
      if (y + 10 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });
    doc.save(`${title}.pdf`);
  };

  const handleDownloadTxt = () => {
    if (!currentReport) return;
    const title = currentReport.title.replace(/\.[^/.]+$/, '') || 'document';
    
    // Use the enhanced content for download
    const contentToDownload = (currentReport.diffContent && currentReport.diffContent.length > 0)
      ? currentReport.diffContent
          .split('\n')
          .map(line => (line.startsWith('++ ') ? line.substring(3) : (line.startsWith('-- ') ? '' : line)))
          .filter(line => line !== '')
          .join('\n')
      : currentReport.documentContent;
    
    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = () => {
    if (!currentReport) return;
    const title = currentReport.title.replace(/\.[^/.]+$/, '') || 'document';
    
    // Use the enhanced content for download
    const contentToDownload = (currentReport.diffContent && currentReport.diffContent.length > 0)
      ? currentReport.diffContent
          .split('\n')
          .map(line => (line.startsWith('++ ') ? line.substring(3) : (line.startsWith('-- ') ? '' : line)))
          .filter(line => line !== '')
          .join('\n')
      : currentReport.documentContent;
    
    const doc = new Document({
      sections: [
        {
          children: contentToDownload.split('\n').map((textLine) =>
            new Paragraph({
              children: [new TextRun(textLine)],
            })
          ),
        },
      ],
    });
    Packer.toBlob(doc).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const handleSaveChanges = () => {
    setIsEditing(false);
    if (!currentReport) return;
    onUpdateReport(currentReport);
  };

  if (!currentReport) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <BackButton onBack={handleBack} />
        <p className="text-gray-500 mt-4">No active report. Please select an analysis from the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Add back button at the top */}
      <div className="absolute top-4 left-4 z-10">
        <BackButton onBack={handleBack} title="Back to Dashboard" />
      </div>

      {/* Overlay loader when enhancing/analyzing */}
      {isEnhancing && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-red-100 dark:border-neutral-800 rounded-2xl p-8 shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-red-700 mb-4" />
            <p className="mt-2 text-gray-700 dark:text-neutral-300 font-medium">Analyzing document…</p>
            {analysisStatusText && <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2">{analysisStatusText}</p>}
          </div>
        </div>
      )}

      {/* Add top padding to account for back button */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6 pt-16 h-full overflow-hidden">
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
            onAutoEnhance={onAutoEnhance}
            enhancedDraft={enhancedDraft}
            enhancedDraftHtml={enhancedDraftHtml}
            onAcceptEnhanced={onAcceptEnhanced}
            onRejectEnhanced={onRejectEnhanced}
            isEnhancing={isEnhancing}
            analysisStatusText={analysisStatusText}
            onStatusChange={handleFindingStatusChange}
            onDismiss={(f) => setFeedbackFinding(f)}
            setHoveredFindingId={setHoveredFindingId}
            onFindingClick={handleFindingClick}
            isAnalyzing={!!analysisStatusText}
          />

          <div className="h-[500px]">
            <ChatPanel documentContent={currentReport.documentContent} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisScreen;