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
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-8 max-w-2xl w-full transform transition-all animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark mb-2 text-center">Create New Analysis</h2>
            <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-6 text-center">
              Upload your project plan (PDF, DOCX, TXT) or paste the text below.
            </p>
            
            <label 
                htmlFor="file-upload" 
                onDrop={handleFileDrop} 
                onDragOver={handleDragOver} 
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-10 cursor-pointer bg-vesta-card-light dark:bg-vesta-card-dark hover:bg-gray-50 dark:hover:bg-vesta-bg-dark/50 transition block ${isDragging ? 'border-vesta-red' : 'border-vesta-border-light dark:border-vesta-border-dark'}`}
            >
              <input id="file-upload" type="file" className="hidden" onChange={handleFileSelect} />
              <div className="flex flex-col items-center justify-center">
                  <UploadCloudIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark font-semibold">{fileName || 'Drag & Drop Your File Here or Click to Browse'}</p>
              </div>
            </label>
            
            <div className="flex items-center my-4">
              <hr className="flex-grow border-t border-vesta-border-light dark:border-vesta-border-dark" />
              <span className="px-4 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark font-semibold text-sm">OR</span>
              <hr className="flex-grow border-t border-vesta-border-light dark:border-vesta-border-dark" />
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your business plan text here..."
              className="w-full h-32 p-4 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-bg-light dark:bg-vesta-bg-dark dark:text-gray-100"
            ></textarea>

            <div className="flex justify-end gap-4 pt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-gray-200 dark:bg-gray-700 text-vesta-text-secondary-light dark:text-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={!text.trim()}
                    className="bg-vesta-red text-white font-bold py-2 px-8 rounded-lg transition-all duration-200 disabled:bg-opacity-50 disabled:cursor-not-allowed"
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