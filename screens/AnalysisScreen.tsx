

import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, Finding, ScreenLayoutProps, FindingStatus, FeedbackReason, ChatMessage } from '../types';
import { SparklesIcon, DownloadIcon, EditIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, AlertCircleIcon, SendIcon, MessageSquareIcon } from '../components/Icons';
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
    <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-lg border border-vesta-border-light dark:border-vesta-border-dark flex flex-col h-full">
        <div className="p-4 flex justify-between items-center border-b border-vesta-border-light dark:border-vesta-border-dark flex-shrink-0">
            <div>
                <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{report.workspaceId.replace('-', ' ').toUpperCase()}</p>
                <h2 className="font-bold text-lg text-vesta-text-light dark:text-vesta-text-dark truncate pr-4">{report.title}</h2>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                <button onClick={onDownload} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-vesta-bg-dark" title="Download as PDF"><DownloadIcon className="w-5 h-5 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark"/></button>
                {isEditing ? (
                    <button onClick={onSaveChanges} className="px-4 py-1.5 border border-vesta-red rounded-lg text-sm font-bold bg-vesta-red text-white hover:bg-vesta-red-dark">Save Draft</button>
                ) : (
                    <button onClick={onToggleEdit} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-vesta-bg-dark" title="Edit Document"><EditIcon className="w-5 h-5 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark"/></button>
                )}
            </div>
        </div>
        <div className={`p-6 bg-vesta-bg-springwood dark:bg-gray-900 rounded-b-xl flex-1 overflow-y-auto ${isEnhancing ? 'flex items-center justify-center' : ''}`}>
            {isEnhancing ? (
                <AnimatedChecklist steps={enhancementSteps} />
            ) : (
                isEditing ? (
                    <textarea
                        value={report.documentContent}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="w-full h-full bg-transparent focus:outline-none resize-none text-base leading-relaxed font-sans text-black"
                        autoFocus
                    />
                ) : (
                    <div className="prose prose-sm max-w-none text-black whitespace-pre-wrap" dangerouslySetInnerHTML={{
                        __html: report.documentContent.replace(
                            /\[\[(.*?)\]\]/g,
                            '<mark class="bg-vesta-gold/30 px-1 rounded">$1</mark>'
                        ),
                    }}></div>
                )
            )}
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
        <div className="space-y-4">
             <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-lg border border-vesta-border-light dark:border-vesta-border-dark p-6 space-y-3">
                <h2 className="text-xl font-bold font-display text-vesta-text-light dark:text-vesta-text-dark text-center">Analysis</h2>
                <div className="grid grid-cols-2 gap-3 text-center">
                    {(Object.keys(report.scores || {}) as (keyof typeof report.scores)[]).map(key => (
                        <div key={key}>
                            <p className="text-2xl font-bold font-display text-vesta-red">{report.scores?.[key]}%</p>
                            <p className="text-xs capitalize text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            <button
                onClick={onEnhance}
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
                        <div key={finding.id} className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-sm border border-vesta-border-light dark:border-vesta-border-dark">
                          <div className={`p-3 flex items-start ${finding.severity === 'critical' ? 'bg-accent-critical text-white' : 'bg-accent-warning text-vesta-red'}`}>
                              <div className="flex-shrink-0 mt-0.5">{finding.severity === 'critical' ? <AlertTriangleIcon className="w-5 h-5"/> : <AlertCircleIcon className="w-5 h-5"/>}</div>
                              <h4 className="ml-2 font-bold text-sm">{finding.title}</h4>
                          </div>
                          <div className="p-3 space-y-2">
                            <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark italic">"{finding.sourceSnippet}"</p>
                            <p className="text-sm text-vesta-text-light dark:text-vesta-text-dark">{finding.recommendation}</p>
                          </div>
                           <div className="px-3 py-2 bg-gray-50 dark:bg-vesta-bg-dark border-t border-vesta-border-light dark:border-vesta-border-dark flex justify-end space-x-2">
                              <button onClick={() => onDismiss(finding)} className="flex items-center px-2 py-1 text-xs font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md"><XCircleIcon className="w-4 h-4 mr-1" /> Dismiss</button>
                              <button onClick={() => onStatusChange(finding.id, 'resolved')} className="flex items-center px-2 py-1 text-xs font-semibold text-white bg-accent-success hover:bg-green-600 rounded-md"><CheckCircleIcon className="w-4 h-4 mr-1" /> Resolved</button>
                          </div>
                        </div>
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
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-lg border border-vesta-border-light dark:border-vesta-border-dark flex flex-col h-full">
            <h3 className="text-lg font-bold p-4 border-b border-vesta-border-light dark:border-vesta-border-dark flex items-center text-vesta-text-light dark:text-vesta-text-dark">
              <MessageSquareIcon className="w-5 h-5 mr-3 text-vesta-gold" /> Ask Gemini
            </h3>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-vesta-red text-white rounded-br-none' : 'bg-gray-200 dark:bg-vesta-bg-dark text-vesta-text-light dark:text-vesta-text-dark rounded-bl-none'}`}>
                            <p className="text-sm">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="px-4 py-2 rounded-2xl bg-gray-200 dark:bg-vesta-bg-dark rounded-bl-none">
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
            <form onSubmit={handleSend} className="p-4 border-t border-vesta-border-light dark:border-vesta-border-dark">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Summarize risk factors..."
                        className="w-full pl-4 pr-12 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-full focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-bg-light dark:bg-vesta-card-dark"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-vesta-red text-white hover:bg-vesta-red-dark disabled:opacity-50" disabled={!input.trim() || isLoading}>
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