import React, { useState, useEffect, useRef } from 'react';
import { Screen, AnalysisReport, Finding, FindingStatus, AuditLogAction, FeedbackReason, KnowledgeSource, DismissalRule, ScreenLayoutProps, UserRole, CustomRegulation } from '../types';
import { SparklesIcon, DownloadIcon, EditIcon, ChevronsLeftIcon, ChevronsRightIcon } from '../components/Icons';
import UploadZone from '../components/UploadZone';
import { analyzePlan, improvePlan } from '../api/vesta';
import { AnimatedChecklist } from '../components/AnimatedChecklist';
import jsPDF from 'jspdf';
import { useHeader } from '../components/Layout';

// --- SUB-COMPONENTS for the new themed AnalysisScreen ---

const ThemedScoreCard: React.FC<{ label: string, score: number }> = ({ label, score }) => (
  <div className="bg-vesta-card-light dark:bg-vesta-card-dark border border-vesta-border-light dark:border-vesta-border-dark rounded-lg p-3 shadow-sm">
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
    <div className="bg-vesta-card-light dark:bg-vesta-card-dark border border-vesta-border-light dark:border-vesta-border-dark rounded-lg flex-grow mt-6 flex flex-col items-center justify-center p-4">
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
    
    // Check if it's an all-caps heading
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.endsWith('.') && isNaN(parseInt(trimmedLine))) {
      return <h2 key={index} className="text-lg font-bold font-display text-vesta-gold uppercase tracking-wider mt-6 mb-4">{trimmedLine}</h2>;
    }
    
    return <p key={index} className="text-base leading-relaxed mb-4">{trimmedLine}</p>;
  });
};


// --- MAIN ANALYSIS SCREEN ---

const analysisSteps = [
    "Parsing document structure...",
    "Cross-referencing with BSP regulations...",
    "Evaluating operational risks...",
    "Generating actionable recommendations...",
];


interface AnalysisScreenProps extends ScreenLayoutProps {
  activeReport: AnalysisReport | null;
  onAnalysisComplete: (report: Omit<AnalysisReport, 'id'|'workspaceId'|'createdAt'>) => void;
  onUpdateReport: (report: AnalysisReport) => void;
  addAuditLog: (action: AuditLogAction, details: string) => void;
  knowledgeBaseSources: KnowledgeSource[];
  customRegulations: CustomRegulation[];
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ activeReport, onAnalysisComplete, onUpdateReport, addAuditLog, knowledgeBaseSources, userRole, customRegulations, currentWorkspace }) => {
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(activeReport);
  const [plainTextContent, setPlainTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { setTitleContent, setActions } = useHeader();

  useEffect(() => {
    if (activeReport) {
        setCurrentReport(activeReport);
        setPlainTextContent(activeReport.documentContent);
    } else {
      setCurrentReport(null);
      setPlainTextContent('');
    }
  }, [activeReport]);
  
  const handleDownload = (format: 'PDF') => {
      const title = currentReport?.title.replace(/\.[^/.]+$/, "") || 'document';

      if (format === 'PDF') {
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
    
    const updatedReport = {
      ...currentReport,
      documentContent: plainTextContent,
    };
    setCurrentReport(updatedReport);
    onUpdateReport(updatedReport);
    addAuditLog('Document Upload', `Document content for "${currentReport.title}" was manually edited.`);
  };
  
  const canEdit = userRole === 'Administrator' || userRole === 'Member' || userRole === 'Risk Management Officer' || userRole === 'Strategy Officer';

  // Effect to manage the header content
  useEffect(() => {
    setTitleContent(null);
    setActions(null);

    if (currentReport && currentWorkspace) {
        const title = (
            <div className="flex items-center text-sm font-bold uppercase tracking-wider text-vesta-text-light dark:text-vesta-text-dark">
                <span>{currentWorkspace.name}</span>
                <span className="mx-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">/</span>
                <span className="truncate text-vesta-gold">{currentReport.title}</span>
            </div>
        );
      
        const actions = (
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => handleDownload('PDF')} 
                    className="flex items-center px-4 py-2 bg-transparent border-2 border-vesta-gold rounded-lg text-sm font-bold text-vesta-red hover:bg-vesta-gold hover:text-white transition-colors"
                >
                    <DownloadIcon className="w-4 h-4 mr-2" /> Download
                </button>
                {isEditing ? (
                    <button 
                        onClick={handleSaveChanges} 
                        className="px-4 py-2 border-2 border-vesta-red rounded-lg text-sm font-bold bg-vesta-red text-white hover:bg-vesta-red-dark"
                    >
                        Save Changes
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="p-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:border-vesta-red hover:text-vesta-red" 
                        disabled={!canEdit}
                        aria-label="Edit document"
                    >
                        <EditIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        );
      
        setTitleContent(title);
        setActions(actions);
    }
    
    return () => { // Cleanup
      setTitleContent(null);
      setActions(null);
    };
  }, [currentReport, currentWorkspace, isEditing, plainTextContent, canEdit, setTitleContent, setActions]);

  const handleFileUpload = async (content: string, fileName: string) => {
      addAuditLog('Document Upload', `File uploaded: ${fileName}`);
      setIsLoading(true);
      const reportData = await analyzePlan(content, knowledgeBaseSources, [], customRegulations);
      const report = { ...reportData, title: fileName || "Pasted Text Analysis" };
      onAnalysisComplete(report);
      setIsLoading(false);
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
  
  const scores = currentReport.scores || {
    project: currentReport.resilienceScore,
    strategicGoals: 0,
    regulations: 0,
    risk: 0
  };

  return (
    <div className="flex h-full w-full bg-vesta-card-light dark:bg-vesta-card-dark">
        {/* Center Panel: Document Viewer */}
        <div className="flex-1 w-0 flex flex-col">
            <div className="flex-grow p-8 lg:p-12 overflow-y-auto text-vesta-text-light dark:text-vesta-text-dark">
                {isEditing ? (
                    <textarea
                        value={plainTextContent}
                        onChange={(e) => setPlainTextContent(e.target.value)}
                        className="w-full h-full bg-transparent focus:outline-none resize-none text-base leading-relaxed"
                        autoFocus
                    />
                ) : (
                    <div>{formatDocumentContent(plainTextContent)}</div>
                )}
            </div>
        </div>

        {/* Right Panel: Analysis */}
        <div className="w-[384px] flex-shrink-0 bg-vesta-bg-light dark:bg-vesta-bg-dark flex flex-col border-l border-vesta-border-light dark:border-vesta-border-dark">
            <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-vesta-border-light dark:border-vesta-border-dark">
                    <button className="p-1 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-vesta-red"><ChevronsLeftIcon className="w-6 h-6" /></button>
                    <h2 className="text-xl font-bold font-display text-vesta-gold uppercase tracking-wider">Analysis</h2>
                    <button className="p-1 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-vesta-red"><ChevronsRightIcon className="w-6 h-6" /></button>
                </div>
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