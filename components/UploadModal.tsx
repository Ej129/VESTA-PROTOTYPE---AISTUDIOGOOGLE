import React, { useState, useCallback, useRef } from 'react';
import { UploadCloudIcon } from './Icons';
import { useTour } from '../contexts/TourContext';
import TourTooltip from './TourTooltip';

interface UploadModalProps {
  onUpload: (content: string, fileName: string) => void;
  onClose: () => void;
  showTourStep?: boolean;
}

const UploadModal: React.FC<UploadModalProps> = ({ onUpload, onClose, showTourStep }) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const tour = useTour();
  const modalRef = useRef<HTMLDivElement>(null);

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
  
  const handleClose = () => {
    if (tour?.isActive) tour.endTour();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={handleClose}>
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-2xl w-full transform transition-all animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-vesta-primary dark:text-white mb-2 text-center">Create New Analysis</h2>
            <p className="text-vesta-text-light dark:text-gray-400 mb-6 text-center">
              Upload your project plan (PDF, DOCX, TXT) or paste the text below.
            </p>
            
            <label 
                htmlFor="file-upload" 
                onDrop={handleFileDrop} 
                onDragOver={handleDragOver} 
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-10 cursor-pointer bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition block ${isDragging ? 'border-vesta-secondary' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <input id="file-upload" type="file" className="hidden" onChange={handleFileSelect} />
              <div className="flex flex-col items-center justify-center">
                  <UploadCloudIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-vesta-text-light dark:text-gray-400 font-semibold">{fileName || 'Drag & Drop Your File Here or Click to Browse'}</p>
              </div>
            </label>
            
            <div className="flex items-center my-4">
              <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
              <span className="px-4 text-vesta-text-light dark:text-gray-400 font-semibold text-sm">OR</span>
              <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your business plan text here..."
              className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-secondary bg-white dark:bg-gray-700 dark:text-gray-100"
            ></textarea>

            <div className="flex justify-end gap-4 pt-6">
                <button
                    type="button"
                    onClick={handleClose}
                    className="bg-gray-200 dark:bg-gray-700 text-vesta-text-light dark:text-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={!text.trim()}
                    className="btn-primary text-white font-bold py-2 px-8 rounded-lg transition-all duration-200 disabled:bg-opacity-50 disabled:cursor-not-allowed"
                >
                    Analyze Plan
                </button>
            </div>
            {showTourStep && tour && modalRef.current && (
                <TourTooltip 
                    targetElement={modalRef.current} 
                    step={{...tour.steps[1], content: "Upload or paste your document content here to see the AI in action. For this tour, we've prepared a sample for you."}}
                    onNext={tour.nextStep}
                    onSkip={tour.endTour}
                />
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