import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './Icons';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set worker source for pdf.js. This is required for it to work in a browser environment from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface UploadModalProps {
  onUpload: (content: string, fileName: string) => void;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onUpload, onClose }) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const readFile = async (file: File) => {
    setFileName(file.name);
    setStatus('parsing');
    setErrorMessage('');
    setText(''); // Clear previous text content

    const extension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    try {
        if (extension === 'pdf') {
            reader.onload = async (event) => {
                try {
                    if (!event.target?.result) throw new Error("File could not be read.");
                    const arrayBuffer = event.target.result as ArrayBuffer;
                    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    setText(fullText);
                    setStatus('idle');
                } catch (e) {
                    console.error('Error parsing PDF:', e);
                    setErrorMessage('Could not read PDF. It might be corrupted or protected.');
                    setStatus('error');
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (extension === 'docx') {
            reader.onload = async (event) => {
                try {
                    if (!event.target?.result) throw new Error("File could not be read.");
                    const arrayBuffer = event.target.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    setText(result.value);
                    setStatus('idle');
                } catch (e) {
                    console.error('Error parsing DOCX:', e);
                    setErrorMessage('Could not read DOCX file. It might be corrupted.');
                    setStatus('error');
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (extension === 'txt') {
            reader.onload = (event) => {
                setText(event.target?.result as string);
                setStatus('idle');
            };
            reader.readAsText(file);
        } else {
            setErrorMessage(`Unsupported file type: .${extension}. Please use PDF, DOCX, or TXT.`);
            setStatus('error');
        }
    } catch (e) {
        console.error('File reading error:', e);
        setErrorMessage('An unexpected error occurred while reading the file.');
        setStatus('error');
    }
  };

  const handleFileAction = useCallback((file: File | undefined) => {
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && ['pdf', 'docx', 'txt'].includes(extension)) {
         readFile(file);
      } else {
          setErrorMessage(`Unsupported file type. Please upload a PDF, DOCX, or TXT file, or paste its content below.`);
          setStatus('error');
          setFileName(file.name);
      }
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileAction(e.dataTransfer.files?.[0]);
  }, [handleFileAction]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileAction(e.target.files?.[0]);
    // Reset file input to allow uploading the same file again
    e.target.value = '';
  }, [handleFileAction]);

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
      onUpload(text, fileName || "Pasted Text");
    }
  };

  const getStatusText = () => {
    if (status === 'parsing') return 'Parsing document...';
    if (status === 'error') return errorMessage;
    if (fileName) return fileName;
    return 'Drag & Drop Your File Here or Click to Browse';
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
              <input id="file-upload" type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.docx,.txt" />
              <div className="flex flex-col items-center justify-center">
                  <UploadCloudIcon className="w-12 h-12 text-gray-400 mb-2" />
                  <p className={`text-center font-semibold ${status === 'error' ? 'text-accent-critical' : 'text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark'}`}>
                    {getStatusText()}
                  </p>
              </div>
            </label>
            
            <div className="flex items-center my-4">
              <hr className="flex-grow border-t border-vesta-border-light dark:border-vesta-border-dark" />
              <span className="px-4 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark font-semibold text-sm">OR</span>
              <hr className="flex-grow border-t border-vesta-border-light dark:border-vesta-border-dark" />
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileName(''); // Clear file name if user starts typing
                setStatus('idle');
              }}
              placeholder="Paste your business plan text here..."
              className="w-full h-32 p-4 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-bg-light dark:bg-vesta-bg-dark dark:text-gray-100"
              disabled={status === 'parsing'}
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
                    disabled={!text.trim() || status === 'parsing'}
                    className="bg-vesta-red text-white font-bold py-2 px-8 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {status === 'parsing' ? 'Processing...' : 'Analyze Plan'}
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