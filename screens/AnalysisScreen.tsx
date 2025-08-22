

import React, { useState, useEffect, useRef, useContext } from 'react';
import { AnalysisReport, AuditLogAction, KnowledgeSource, ScreenLayoutProps, CustomRegulation, Workspace } from '../types';
import { SparklesIcon, DownloadIcon, EditIcon } from '../components/Icons';
import jsPDF from 'jspdf';
import { HeaderActionsContext } from '../components/Layout';

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

const AskGemini: React.FC = () => (
    <div className="bg-vesta-bg-light dark:bg-vesta-bg-dark border border-vesta-border-light dark:border-vesta-border-dark rounded-lg flex-grow mt-6 flex flex-col items-center justify-center p-4">
        <SparklesIcon className="w-8 h-8 text-vesta-gold mb-2" />
        <button className="text-lg font-bold text-vesta-red dark:text-vesta-gold">
            Ask Gemini
        </button>
        <p className="text-xs text-center text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-1">AI chat about this document</p>
    </div>
);

const formatDocumentContent = (text: string) => {
  return text.split('\n').map((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
        return <div key={index} className="h-4" />;
    }
    
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.endsWith('.') && isNaN(parseInt(trimmedLine))) {
      return <h2 key={index} className="text-lg font-bold font-display text-vesta-gold uppercase tracking-wider mt-6 mb-4">{trimmedLine}</h2>;
    }
    
    return <p key={index} className="text-base leading-relaxed mb-4">{trimmedLine}</p>;
  });
};

interface AnalysisScreenProps extends Omit<ScreenLayoutProps, 'onBackToWorkspaces' | 'currentWorkspace'> {
  activeReport: AnalysisReport | null;
  currentWorkspace: Workspace;
  onAnalysisComplete: (report: Omit<AnalysisReport, 'id'|'workspaceId'|'createdAt'>) => void;
  onUpdateReport: (report: AnalysisReport) => void;
  addAuditLog: (action: AuditLogAction, details: string) => void;
  knowledgeBaseSources: KnowledgeSource[];
  customRegulations: CustomRegulation[];
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ activeReport, onUpdateReport, addAuditLog, userRole }) => {
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [plainTextContent, setPlainTextContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { setActions } = useContext(HeaderActionsContext);

  useEffect(() => {
    if (activeReport) {
        setCurrentReport(activeReport);
        setPlainTextContent(activeReport.documentContent);
    } else {
      setCurrentReport(null);
      setPlainTextContent('');
    }
  }, [activeReport]);

  const canEdit = userRole === 'Administrator' || userRole === 'Member' || userRole === 'Risk Management Officer' || userRole === 'Strategy Officer';

  const handleDownload = (format: 'PDF') => {
      const title = currentReport?.title.replace(/\.[^/.]+$/, "") || 'document';
      if (format === 'PDF' && currentReport) {
          const doc = new jsPDF();
          doc.setFont('times', 'normal');
          const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
          const margin = 20;
          let y = margin;
          const lines = doc.splitTextToSize(plainTextContent, doc.internal.pageSize.width - margin * 2);
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
    if (!currentReport || currentReport.documentContent === plainTextContent) return;
    const updatedReport = { ...currentReport, documentContent: plainTextContent };
    setCurrentReport(updatedReport);
    onUpdateReport(updatedReport);
    addAuditLog('Document Upload', `Document content for "${currentReport.title}" was manually edited.`);
  };

  useEffect(() => {
    setActions(
      <div className="flex items-center space-x-2">
        <button 
            onClick={() => handleDownload('PDF')} 
            className="flex items-center px-3 py-1.5 bg-transparent border border-vesta-border-light dark:border-vesta-border-dark rounded-lg text-sm font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-100 dark:hover:bg-vesta-card-dark"
        >
            <DownloadIcon className="w-4 h-4 mr-2" /> Download
        </button>
        {isEditing ? (
            <button 
                onClick={handleSaveChanges} 
                className="px-4 py-1.5 border border-vesta-red rounded-lg text-sm font-bold bg-vesta-red text-white hover:bg-vesta-red-dark"
            >
                Save Changes
            </button>
        ) : (
            <button 
                onClick={() => setIsEditing(true)} 
                className="p-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:border-vesta-red hover:text-vesta-red disabled:opacity-50" 
                disabled={!canEdit}
                aria-label="Edit document"
            >
                <EditIcon className="w-5 h-5" />
            </button>
        )}
      </div>
    );
    return () => setActions(null);
  }, [isEditing, plainTextContent, currentReport, canEdit]);


  if (!currentReport) {
      return (
        <div className="flex items-center justify-center h-full">
            <p>No active report. Please upload a document to start analysis.</p>
        </div>
      );
  }
  
  const scores = currentReport.scores || {
    project: currentReport.resilienceScore,
    strategicGoals: 0,
    regulations: 0,
    risk: 0
  };

  return (
    <div className="flex h-full bg-vesta-bg-light dark:bg-vesta-bg-dark">
        <div className="flex-1 w-0 flex flex-col">
            <div className="flex-grow p-8 lg:p-12 overflow-y-auto text-vesta-text-light dark:text-vesta-text-dark">
                {isEditing ? (
                    <textarea
                        value={plainTextContent}
                        onChange={(e) => setPlainTextContent(e.target.value)}
                        className="w-full h-full bg-transparent focus:outline-none resize-none text-base leading-relaxed font-sans"
                        autoFocus
                    />
                ) : (
                    <div>{formatDocumentContent(plainTextContent)}</div>
                )}
            </div>
        </div>
        
        <div className="w-96 flex-shrink-0 bg-vesta-card-light dark:bg-vesta-card-dark flex flex-col border-l border-vesta-border-light dark:border-vesta-border-dark">
            <div className="p-6 flex flex-col h-full overflow-y-auto">
                <h2 className="text-xl font-bold font-display text-vesta-gold uppercase tracking-wider text-center mb-6 pb-4 border-b border-vesta-border-light dark:border-vesta-border-dark">Analysis Report</h2>
                <div className="space-y-4">
                    <ThemedScoreCard label="Project Score" score={scores.project} />
                    <ThemedScoreCard label="Strategic Goals" score={scores.strategicGoals} />
                    <ThemedScoreCard label="Regulations" score={scores.regulations} />
                    <ThemedScoreCard label="Risk" score={scores.risk} />
                </div>
                <AskGemini />
            </div>
        </div>
    </div>
  );
};

export default AnalysisScreen;