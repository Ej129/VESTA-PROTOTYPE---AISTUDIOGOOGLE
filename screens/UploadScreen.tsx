

import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from '../components/Icons';
import UploadZone from '../components/UploadZone';
import { AnimatedChecklist } from '../components/AnimatedChecklist';

interface UploadScreenProps {
  onUpload: (content: string, fileName: string) => void;
  isAnalyzing: boolean;
}

const analysisSteps = [
    "Parsing document structure...",
    "Cross-referencing with knowledge base...",
    "Evaluating against compliance rules...",
    "Generating actionable recommendations...",
];

const UploadScreen: React.FC<UploadScreenProps> = ({ onUpload, isAnalyzing }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-white dark:bg-vesta-bg-dark">
        <AnimatedChecklist steps={analysisSteps} title="Analyzing Your Document..." />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <UploadZone onUpload={onUpload}>
        <div className="relative flex flex-col items-center justify-center h-full text-center p-8 bg-white dark:bg-vesta-bg-dark isolate">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-vesta-red/5 to-vesta-gold/5 dark:from-vesta-red/10 dark:to-vesta-gold/10 -z-10" 
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)' }}
          />
          <UploadCloudIcon className="w-48 h-48 text-gray-200 dark:text-gray-700" />
          <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-8 bg-vesta-gold text-vesta-red font-bold py-4 px-10 rounded-2xl text-lg shadow-lg hover:shadow-xl hover:bg-yellow-500 transition-all duration-200 transform hover:-translate-y-1"
          >
              UPLOAD YOUR FILES
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                // This will be handled by the UploadZone's onFileSelect
              }
            }}
            accept=".pdf,.docx,.txt"
          />
        </div>
      </UploadZone>
    </div>
  );
};

export default UploadScreen;