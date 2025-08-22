

import React from 'react';
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
  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-vesta-bg-light dark:bg-vesta-bg-dark">
        <AnimatedChecklist steps={analysisSteps} title="Analyzing Your Document..." />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-8 bg-vesta-bg-light dark:bg-vesta-bg-dark">
      <UploadZone onUpload={onUpload} />
    </div>
  );
};

export default UploadScreen;