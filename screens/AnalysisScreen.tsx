
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, Finding, ScreenLayoutProps, FindingStatus, FeedbackReason, ChatMessage } from '../types';
import { StarIcon, DownloadIcon, EditIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, AlertCircleIcon, SendIcon, MessageSquareIcon } from '../components/Icons';
import jsPDF from 'jspdf';
import * as workspaceApi from '../api/workspace';
import * as vestaApi from '../api/vesta';
import FeedbackModal from '../components/FeedbackModal';
import { AnimatedChecklist } from '../components/AnimatedChecklist';

const enhancementSteps = [
    "Re-analyzing improved content...",
    "Applying compliance formatting...",
    "Improving clarity and structure...",
    "Generating revised document...",
];

const DocumentEditor: React.FC<{
  report: AnalysisReport;
  isEditing: boolean;
  onContentChange: (content: string) => void;
  isEnhancing: boolean;
  onSaveChanges: () => void;
  onToggleEdit: () => void;
  onDownload: () => void;
}> = ({ report, isEditing, onContentChange, isEnhancing, onSaveChanges, onToggleEdit, onDownload }) => (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 flex flex-col h-full">
        <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
            <div>
                <p className="text-xs text-gray-500 dark:text-neutral-400">{report.workspaceId.replace('-', ' ').toUpperCase()}</p>
                <h2 className="font-bold text-lg text-gray-800 dark:text-neutral-200 truncate pr-4">{report.title}</h2>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                <button onClick={onDownload} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800" title="Download as PDF"><DownloadIcon className="w-5 h-5 text-gray-500 dark:text-neutral-400"/></button>
                {isEditing ? (
                    <button onClick={onSaveChanges} className="px-4 py-1.5 border border-red-700 rounded-lg text-sm font-bold bg-red-700 text-white hover:bg-red-800">Save Draft</button>
                ) : (
                    <button onClick={onToggleEdit} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800" title="Edit Document"><EditIcon className="w-5 h-5 text-gray-500 dark:text-neutral-400"/></button>
                )}
            </div>
        </div>
        <div className={`p-6 bg-gray-50 dark:bg-neutral-950 rounded-b-xl flex-1 overflow-y-auto ${isEnhancing ? 'flex items-center justify-center' : ''}`}>
            {isEnhancing ? (
                <AnimatedChecklist steps={enhancementSteps} />
            ) : (
                isEditing ? (
                    <textarea
                        value={report.documentContent}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="w-full h-full bg-transparent focus:outline-none resize-none text-base leading-relaxed font-sans text-gray-800 dark:text-neutral-200"
                        autoFocus
                    />
                ) : (
                    <div className="prose prose-sm max-w-none text-gray-800 dark:text-neutral-200 whitespace-pre-wrap" dangerouslySetInnerHTML={{
                        __html: report.documentContent.replace(
                            /\[\[(.*?)\]\]/g,
                            '<mark class="bg-yellow-400/30 px-1 rounded">$1</mark>'
                        ),
                    }}></div>
                )
            )}
        </div>
    </div>
);

const ScoreMeter: React.FC<{ label: string; score: number }> = ({ label, score }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-neutral-200">{label}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-neutral-200">{score}%</p>
        </div>
        <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2.5">
            <div 
                className="bg-gradient-to-r from-red-700 via-yellow-500 to-amber-400 h-2.5 rounded-full" 
                style={{ width: `${score}%` }}
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} score`}
            />
        </div>
    </div>
);


const AnalysisPanel: React.FC<{
  report: AnalysisReport;
  onEnhance: () => void;
  isEnhancing: boolean;
  onStatusChange: (findingId: string, status: FindingStatus) => void;
  onDismiss: (finding: Finding) => void;
}> = ({ report, onEnhance, isEnhancing, onStatusChange, onDismiss }) => {
    const activeFindings = report.findings.filter(f => f.status === 'active');
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700">
                <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-200 text-center">Analysis</h2>
                </div>
                <div className="p-6 space-y-6">
                    <button
                        onClick={onEnhance}
                        disabled={isEnhancing}
                        className="w-full flex items-center justify-center py-3 px-4 bg-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <StarIcon className="w-5 h-5 mr-2 text-yellow-300" />
                        {isEnhancing ? 'Enhancing...' : 'Auto-Enhance Document'}
                    </button>
                    
                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-neutral-700">
                        {report.scores ? (
                            <>
                                <ScoreMeter label="Project Score" score={report.scores.project} />
                                <ScoreMeter label="Strategic Goals" score={report.scores.strategicGoals} />
                                <ScoreMeter label="Regulations" score={report.scores.regulations} />
                                <ScoreMeter label="Risk" score={report.scores.risk} />
                            </>
                        ) : (
                            <>
                                <ScoreMeter label="Overall Score" score={report.resilienceScore} />
                                <p className="text-xs text-center text-gray-500 dark:text-neutral-400 pt-2">
                                    Detailed score breakdown is available for new analyses.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-neutral-200 mb-4">Actionable Findings ({activeFindings.length})</h3>
                {activeFindings.length > 0 ? (
                    <div className="space-y-4">
                    {activeFindings.map(finding => (
                        <div key={finding.id} className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
                          <div className={`p-3 flex items-start rounded-t-lg ${finding.severity === 'critical' ? 'bg-red-700 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                              <div className="flex-shrink-0 mt-0.5">{finding.severity === 'critical' ? <AlertTriangleIcon className="w-5 h-5"/> : <AlertCircleIcon className="w-5 h-5"/>}</div>
                              <h4 className="ml-2 font-bold text-sm">{finding.title}</h4>
                          </div>
                          <div className="p-3 space-y-2">
                            <p className="text-xs text-gray-500 dark:text-neutral-400 italic">"{finding.sourceSnippet}"</p>
                            <p className="text-sm text-gray-800 dark:text-neutral-200">{finding.recommendation}</p>
                          </div>
                           <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-800/50 border-t border-gray-200 dark:border-neutral-700 flex justify-end space-x-2 rounded-b-lg">
                              <button onClick={() => onDismiss(finding)} className="flex items-center px-2 py-1 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 rounded-md transition-colors duration-200"><XCircleIcon className="w-4 h-4 mr-1" /> Dismiss</button>
                              <button onClick={() => onStatusChange(finding.id, 'resolved')} className="flex items-center px-2 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200"><CheckCircleIcon className="w-4 h-4 mr-1" /> Resolved</button>
                          </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700">
                        <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500" />
                        <p className="mt-4 font-semibold text-gray-800 dark:text-neutral-200">No active findings!</p>
                        <p className="text-sm text-gray-500 dark:text-neutral-400">This document meets all checks.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatPanel: React.FC<{ documentContent: string }> = ({ documentContent }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        
        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const response = await vestaApi.getChatResponse(documentContent, [...messages, userMessage], input);
        
        setMessages(prev => [...prev, { role: 'model', content: response }]);
        setIsLoading(false);
    };

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 flex flex-col h-full">
            <h3 className="text-lg font-bold p-4 border-b border-gray-200 dark:border-neutral-700 flex items-center text-gray-800 dark:text-neutral-200">
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
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></span>
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
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </div>
            </form>
        </div>
    );
};


interface AnalysisScreenProps extends ScreenLayoutProps {
  activeReport: AnalysisReport | null;
  onUpdateReport: (report: AnalysisReport) => void;
  onAutoEnhance: (report: AnalysisReport) => Promise<AnalysisReport>;
  isEnhancing: boolean;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ activeReport, onUpdateReport, onAutoEnhance, isEnhancing: isGloballyEnhancing, currentWorkspace }) => {
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocallyEnhancing, setLocallyEnhancing] = useState(false);
  const [feedbackFinding, setFeedbackFinding] = useState<Finding | null>(null);

  useEffect(() => {
    setCurrentReport(activeReport);
  }, [activeReport]);
  
  const isEnhancing = isGloballyEnhancing || isLocallyEnhancing;

  const handleDownload = () => {
      if (!currentReport) return;
      const title = currentReport.title.replace(/\.[^/.]+$/, "") || 'document';
      const doc = new jsPDF();
      doc.setFont('times', 'normal');
      doc.setFontSize(18);
      doc.text(title, 20, 20);
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(currentReport.documentContent, doc.internal.pageSize.width - 40);
      doc.text(lines, 20, 35);
      doc.save(`${title}.pdf`);
  };

  const handleSaveChanges = () => {
    setIsEditing(false);
    if (!currentReport) return;
    onUpdateReport(currentReport);
  };
  
  const handleEnhanceClick = async () => {
    if (!currentReport) return;
    setLocallyEnhancing(true);
    const updatedReport = await onAutoEnhance(currentReport);
    setCurrentReport(updatedReport); // The parent's `activeReport` will also update, causing a re-render.
    setLocallyEnhancing(false);
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
            <p>No active report. Please select an analysis from the dashboard.</p>
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
                isEnhancing={isEnhancing}
                onSaveChanges={handleSaveChanges}
                onToggleEdit={() => setIsEditing(!isEditing)}
                onDownload={handleDownload}
            />
        </div>
        
        <div className="xl:col-span-1 h-full overflow-y-auto space-y-6">
            <AnalysisPanel 
              report={currentReport} 
              onEnhance={handleEnhanceClick} 
              isEnhancing={isEnhancing}
              onStatusChange={handleFindingStatusChange}
              onDismiss={(f) => setFeedbackFinding(f)}
            />
            <div className="h-[500px]">
              <ChatPanel documentContent={currentReport.documentContent} />
            </div>
        </div>
    </div>
  );
};

export default AnalysisScreen;