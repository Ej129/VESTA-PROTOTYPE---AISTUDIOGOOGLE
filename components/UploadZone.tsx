
import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './Icons';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set worker source for pdf.js. This is required for it to work in a browser environment from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface UploadZoneProps {
  onUpload: (content: string, fileName: string) => void;
}

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const processFile = async (file: File) => {
    setStatus('parsing');
    setErrorMessage('');

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
        let textContent = '';
        if (extension === 'pdf') {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textData = await page.getTextContent();
                textContent += textData.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n\n';
            }
        } else if (extension === 'docx') {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const result = await mammoth.extractRawText({ arrayBuffer });
            textContent = result.value;
        } else if (extension === 'txt') {
            textContent = await readFileAsText(file);
        } else {
            setErrorMessage(`Unsupported file type: .${extension}. Please use PDF, DOCX, or TXT.`);
            setStatus('error');
            return;
        }
        onUpload(textContent, file.name);
    } catch (e) {
        console.error('File processing error:', e);
        setErrorMessage('Could not read file. It might be corrupted or in an unsupported format.');
        setStatus('error');
    }
  };
  
  const handleFileAction = useCallback((file: File | undefined) => {
    if (file) {
      processFile(file);
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

  return (
    <div className="w-full max-w-3xl mx-auto">
        <label 
            htmlFor="file-upload-zone" 
            onDrop={handleFileDrop} 
            onDragOver={handleDragOver} 
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl cursor-pointer bg-vesta-card-light dark:bg-vesta-card-dark hover:bg-gray-50 dark:hover:bg-vesta-bg-dark/50 transition ${isDragging ? 'border-vesta-red' : 'border-vesta-border-light dark:border-vesta-border-dark'}`}
        >
            <input id="file-upload-zone" type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.docx,.txt" />
            <div className="text-center">
                <div className="w-24 h-24 mx-auto p-4 rounded-full bg-vesta-bg-light dark:bg-vesta-bg-dark">
                  <UploadCloudIcon className="w-full h-full text-vesta-red" />
                </div>
                <h3 className="mt-4 text-xl font-bold uppercase text-vesta-text-light dark:text-vesta-text-dark">Upload Your Files</h3>
                <p className="mt-2 text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                    {status === 'error' ? errorMessage : 'Drag & drop your documents here, or click to browse.'}
                </p>
                {status === 'parsing' && <p className="mt-2 text-sm font-semibold text-vesta-red">Parsing document...</p>}
            </div>
        </label>
    </div>
  );
};

export default UploadZone;
