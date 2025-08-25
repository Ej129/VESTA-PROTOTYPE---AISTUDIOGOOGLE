// src/components/UploadModal.tsx

import React, { useState, useEffect } from 'react';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (content: string, fileName: string) => void;
  isAnalyzing: boolean;
}

const steps = [
  "Extracting document content...",
  "Scanning for compliance gaps...",
  "Applying knowledge base rules...",
  "Checking for regulatory conflicts...",
  "Finalizing analysis report..."
];

const LoadingSteps: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000); // rotate steps every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="text-sm text-gray-500 dark:text-neutral-400 italic mt-2">
      {steps[currentStep]}
    </p>
  );
};

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, isAnalyzing }) => {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleUpload = () => {
    if (!fileContent) return;
    onUpload(fileContent, fileName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-700 mb-4"></div>
            <p className="text-lg font-semibold text-gray-700 dark:text-neutral-300">
              Analyzing your document...
            </p>
            <LoadingSteps />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-neutral-200">New Analysis</h2>
            <input
              type="file"
              accept=".txt,.md,.docx,.pdf"
              onChange={handleFileChange}
              className="mb-4 block w-full text-sm text-gray-700 dark:text-neutral-300"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!fileContent}
                className="px-4 py-2 rounded-md bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
              >
                Upload & Analyze
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
