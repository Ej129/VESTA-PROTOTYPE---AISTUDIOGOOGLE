
import React from 'react';
import { UploadCloudIcon } from './Icons';
import UploadZone from './UploadZone';
import { AnimatedChecklist } from './AnimatedChecklist';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (content: string, fileName: string) => void;
  isAnalyzing: boolean;
}

const analysisSteps = [
    "Parsing document structure...",
    "Cross-referencing with knowledge base...",
    "Evaluating against compliance rules...",
    "Generating actionable recommendations...",
];

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, isAnalyzing }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
            {isAnalyzing ? (
                <div className="p-8 h-96 flex items-center justify-center">
                    <AnimatedChecklist steps={analysisSteps} title="Analyzing Your Document..." />
                </div>
            ) : (
                <UploadZone onUpload={onUpload}>
                    <div className="relative flex flex-col items-center justify-center h-96 text-center p-8 isolate">
                        <UploadCloudIcon className="w-24 h-24 text-gray-200 dark:text-gray-700" />
                        <h3 className="text-2xl font-bold mt-4 text-vesta-text-light dark:text-vesta-text-dark">Drag & Drop Your File Here</h3>
                        <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-2">or</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 bg-vesta-gold text-vesta-red font-bold py-3 px-8 rounded-xl text-md shadow-lg hover:shadow-xl hover:bg-yellow-500 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                            Select File to Upload
                        </button>
                        <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-4">Supports .pdf, .docx, .txt</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              // Handled by UploadZone's internal logic on file selection
                            }}
                            accept=".pdf,.docx,.txt"
                        />
                    </div>
                </UploadZone>
            )}
        </div>
        <style>{`
            @keyframes fade-in-up {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
        `}</style>
    </div>
  );
};

export default UploadModal;