

import React, { useState, useCallback, ReactNode } from 'react';
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface UploadZoneProps {
  children: ReactNode;
  onUpload: (content: string, fileName: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ children, onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    let content = '';
    const fileName = file.name;
    if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            content += textContent.items.map((item: any) => item.str).join(' ');
        }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
    } else { // txt
        content = await file.text();
    }
    onUpload(content, fileName);
  };
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files.length > 0) {
          await processFile(e.target.files[0]);
      }
  };

  // Clone children to inject file input for the "Select File" button
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
        // Find the input element within the children and attach the onChange handler.
        // This is a bit of a hack but avoids prop drilling.
        const recursiveClone = (el: React.ReactElement): React.ReactElement => {
            const props = el.props as any;
            if (el.type === 'input' && props.type === 'file') {
                return React.cloneElement(el, { onChange: handleFileSelect });
            }
            if (props.children && typeof props.children !== 'string') {
                return React.cloneElement(el, {
                    ...props,
                    children: React.Children.map(props.children, c => React.isValidElement(c) ? recursiveClone(c) : c)
                });
            }
            return el;
        }
        return recursiveClone(child);
    }
    return child;
  });

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative rounded-xl transition-all duration-300 ${isDragging ? 'bg-vesta-gold/20 ring-4 ring-vesta-gold' : ''}`}
    >
        {childrenWithProps}
        {isDragging && (
            <div className="absolute inset-0 bg-vesta-gold/50 rounded-xl flex items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-vesta-red">Drop to Start Analysis!</p>
            </div>
        )}
    </div>
  );
};

export default UploadZone;
