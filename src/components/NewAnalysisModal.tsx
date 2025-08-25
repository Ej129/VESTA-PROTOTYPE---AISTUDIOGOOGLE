// src/components/NewAnalysisModal.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
// Make sure the import path for Icons is correct for your project structure
import { UploadCloud, FileText, Zap } from './Icons'; 

interface NewAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (file: File, analysisType: 'quick' | 'full') => void;
  // We'll add this prop to show a loading state
  isAnalyzing: boolean; 
}

export const NewAnalysisModal: React.FC<NewAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAnalyze,
  isAnalyzing,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<'quick' | 'full' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFile(null);
        setAnalysisType(null);
      }, 300);
    }
  }, [isOpen]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleSubmit = () => {
    if (file && analysisType) {
      onAnalyze(file, analysisType);
      // We no longer close the modal immediately, we let the parent decide
    }
  };

  if (!isOpen) {
    return null;
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all duration-300 scale-100 dark:bg-neutral-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-neutral-200">New Analysis</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
            <p className="mt-4 text-gray-600 dark:text-neutral-400">Analyzing your document...</p>
          </div>
        ) : (
          <>
            {/* Step 1: Upload File */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">1. Upload Document</p>
              <div
                onDragEnter={handleDragEnter} onDragOver={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={handleBrowseClick}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
                  isDragging ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 hover:border-red-400 dark:border-neutral-700 dark:hover:border-red-600'
                }`}
              >
                <input
                  ref={fileInputRef} type="file" className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
                  accept=".pdf,.doc,.docx,.txt"
                />
                {file ? (
                  <div className="text-left flex items-center">
                    <FileText className="h-10 w-10 text-red-500 mr-4 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-neutral-200 break-all">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-neutral-400">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="ml-auto text-gray-400 hover:text-red-600 font-bold text-lg"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="h-10 w-10 text-gray-400 dark:text-neutral-500 mb-2" />
                    <p className="text-gray-600 dark:text-neutral-400">
                      <span className="font-semibold text-red-600">Click to browse</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">PDF, DOC, DOCX, or TXT</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 2: Choose Analysis Type */}
            <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">2. Choose Analysis Type</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setAnalysisType('quick')}
                        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                            analysisType === 'quick' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md' : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                        }`}
                    >
                        <div className="flex items-center mb-1">
                            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                            <p className="font-semibold text-gray-800 dark:text-neutral-200">Quick Analyze</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-neutral-400">Faster analysis for text snippets and summaries. Does not save the file.</p>
                    </button>
                     <button
                        onClick={() => setAnalysisType('full')}
                        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                            analysisType === 'full' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md' : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                        }`}
                    >
                        <div className="flex items-center mb-1">
                            <UploadCloud className="h-5 w-5 mr-2 text-red-500" />
                            <p className="font-semibold text-gray-800 dark:text-neutral-200">Upload & Analyze</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-neutral-400">Comprehensive analysis. Uploads and saves the file to your workspace.</p>
                    </button>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || !analysisType}
                className="px-6 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-neutral-600"
              >
                Start Analysis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};