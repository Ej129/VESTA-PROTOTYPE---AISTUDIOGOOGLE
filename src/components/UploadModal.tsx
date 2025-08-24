// src/components/UploadModal.tsx

import React from 'react';
import UploadZone from './UploadZone';
import { AnimatedChecklist } from './AnimatedChecklist';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (content: string, fileName: string) => void;
  isAnalyzing: boolean;
  analysisStatusText: string; // <-- Accept new prop
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, isAnalyzing, analysisStatusText }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
        {isAnalyzing ? (
          <div className="p-8 h-[28rem] flex items-center justify-center">
            {/* Display the dynamic status text as the title */}
            <AnimatedChecklist steps={[]} title={analysisStatusText} />
          </div>
        ) : (
          <div className="p-8">
            <UploadZone onUpload={onUpload} isAnalyzing={isAnalyzing} />
          </div>
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