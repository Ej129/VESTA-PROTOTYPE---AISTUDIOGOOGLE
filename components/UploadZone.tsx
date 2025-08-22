

import React, { useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set worker source for pdf.js. This is required for it to work in a browser environment from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface UploadZoneProps {
  onUpload: (content: string, fileName: string) => void;
  children: React.ReactNode;
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

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const processFile = async (file: File) => {
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
            alert(`Unsupported file type: .${extension}. Please use PDF, DOCX, or TXT.`);
            return;
        }
        onUpload(textContent, file.name);
    } catch (e) {
        console.error('File processing error:', e);
        alert('Could not read file. It might be corrupted or in an unsupported format.');
    }
  };
  
  const handleFileAction = useCallback((file: File | undefined) => {
    if (file) {
      processFile(file);
    }
  }, [onUpload]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileAction(e.dataTransfer.files?.[0]);
  }, [handleFileAction]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`h-full w-full relative transition-all duration-300 ${isDragging ? 'bg-vesta-gold/10' : ''}`}
    >
      <div 
        className={`absolute inset-4 border-2 border-dashed rounded-2xl pointer-events-none transition-all duration-300 ${isDragging ? 'border-vesta-gold opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'}`}
      />
      {children}
    </div>
  );
};

export default UploadZone;