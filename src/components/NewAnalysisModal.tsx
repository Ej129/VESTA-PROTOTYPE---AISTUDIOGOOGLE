// src/components/NewAnalysisModal.tsx
import React, { useState, useRef, DragEvent } from 'react';
import { XIcon, UploadCloudIcon, FileIcon, TrashIcon } from './Icons'; // We'll create UploadCloudIcon next

interface NewAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAnalysis: (file: File, analysisType: 'quick' | 'full') => void;
}

export const NewAnalysisModal: React.FC<NewAnalysisModalProps> = ({ isOpen, onClose, onStartAnalysis }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleAnalysisClick = (analysisType: 'quick' | 'full') => {
    if (selectedFile) {
        onStartAnalysis(selectedFile, analysisType);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
      <div 
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-100">New Analysis</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragging 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-neutral-700 hover:border-red-400 hover:bg-gray-50 dark:hover:bg-neutral-800/50'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx" // Specify accepted file types
            />
            {!selectedFile ? (
              <div className="flex flex-col items-center space-y-3 text-gray-500 dark:text-neutral-400">
                <UploadCloudIcon className="w-12 h-12 text-gray-400 dark:text-neutral-500" />
                <p className="font-semibold">
                  <span className="text-red-700">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm">PDF, DOC, or DOCX</p>
              </div>
            ) : (
              <div className="flex items-center justify-between text-left">
                <div className="flex items-center space-x-3">
                    <FileIcon className="w-8 h-8 text-red-700" />
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-neutral-200">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500 dark:text-neutral-400">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                    </div>
                </div>
                <button onClick={handleRemoveFile} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700">
                    <TrashIcon className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <button
                onClick={() => handleAnalysisClick('quick')}
                disabled={!selectedFile}
                className="w-full bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:bg-red-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-neutral-700"
              >
                Quick Analyze
              </button>
              <button
                onClick={() => handleAnalysisClick('full')}
                disabled={!selectedFile}
                className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg transition-all duration-200 hover:bg-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
              >
                Upload & Analyze
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};