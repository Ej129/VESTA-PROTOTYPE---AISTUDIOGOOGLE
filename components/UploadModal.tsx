import React, { useState, useCallback, useRef } from 'react';
import { UploadCloudIcon } from './Icons';

interface UploadModalProps {
  onUpload: (content: string, fileName: string) => void;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onUpload, onClose }) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      readFile(file);
    }
  }, []);
  
  const readFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (readEvent) => {
      const fileContent = readEvent.target?.result as string;
      setText(fileContent);
    };
    reader.readAsText(file);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          readFile(file);
      }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleAnalyze = () => {
    if (text.trim()) {
      onUpload(text, fileName);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={onClose}>
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl p-8 max-w-2xl w-full transform transition-all animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark mb-2 text-center">Create New Analysis</h2>
            <p className="text-secondary-text-light dark:text-secondary-text-dark mb-6 text-center">
              Upload your project plan (PDF, DOCX, TXT) or paste the text below.
            </p>
            
            <label 
                htmlFor="file-upload" 
                onDrop={handleFileDrop} 
                onDragOver={handleDragOver} 
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-10 cursor-pointer bg-light-card dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-main/50 transition block ${isDragging ? 'border-primary-blue' : 'border-border-light dark:border-border-dark'}`}
            >
              <input id="file-upload" type="file" className="hidden" onChange={handleFileSelect} />
              <div className="flex flex-col items-center justify-center">
                  <UploadCloudIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-secondary-text-light dark:text-secondary-text-dark font-semibold">{fileName || 'Drag & Drop Your File Here or Click to Browse'}</p>
              </div>
            </label>
            
            <div className="flex items-center my-4">
              <hr className="flex-grow border-t border-border-light dark:border-border-dark" />
              <span className="px-4 text-secondary-text-light dark:text-secondary-text-dark font-semibold text-sm">OR</span>
              <hr className="flex-grow border-t border-border-light dark:border-border-dark" />
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your business plan text here..."
              className="w-full h-32 p-4 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main dark:text-gray-100"
            ></textarea>

            <div className="flex justify-end gap-4 pt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-gray-200 dark:bg-gray-700 text-secondary-text-light dark:text-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={!text.trim()}
                    className="bg-primary-blue text-white font-bold py-2 px-8 rounded-lg transition-all duration-200 disabled:bg-opacity-50 disabled:cursor-not-allowed"
                >
                    Analyze Plan
                </button>
            </div>
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