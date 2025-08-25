// src/components/UploadZone.tsx

import React, { useState, useCallback, useRef } from 'react';
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { UploadIcon, AlertTriangleIcon } from './Icons'; // Assuming you have these icons

// Set worker path for pdfjs using a modern approach for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface UploadZoneProps {
  onUpload: (content: string, fileName: string) => void;
  isAnalyzing: boolean; // You can pass the global analyzing state from the parent
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, isAnalyzing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    setIsProcessing(true);
    setError(null);

    try {
      let content = '';

      // Try to enable cMap support (improves extraction for some PDFs)
      try {
        // Use GlobalWorkerOptions for other settings as well
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.cMapUrl = new URL('pdfjs-dist/cmaps/', import.meta.url).toString();
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.cMapPacked = true;
      } catch (cmErr) {
        // not fatal; continue
        console.warn('pdfjs cMap setup warning', cmErr);
      }

      if (fileExtension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let pdfText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent({ normalizeWhitespace: true });
          const pageText = textContent.items
            .map((item: any) => {
              // item.str is common; fall back to other properties if present
              return (typeof item.str === 'string' && item.str) || (item.unicode ?? '') || (item.toString ? item.toString() : '');
            })
            .filter(Boolean)
            .join(' ');
          pdfText += pageText + '\n';
        }

        // Basic heuristic: check printable character ratio
        const totalLen = Math.max(1, pdfText.length);
        const printableCount = (pdfText.match(/[\p{L}\p{N}\p{P}\p{Zs}\p{S}]/gu) || []).length;
        const printableRatio = printableCount / totalLen;

        // If low printable ratio, likely scanned PDF / wrong encoding -> suggest OCR
        if (printableRatio < 0.25) {
          throw new Error(
            'Extracted PDF text appears garbled or the PDF is likely a scanned image. ' +
            'Try a PDF with selectable text or enable OCR (e.g. Tesseract).'
          );
        }

        // Collapse multiple spaces, normalize newlines
        content = pdfText.replace(/[ \t]{2,}/g, ' ').replace(/\r\n/g, '\n').trim();
      } else if (fileExtension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        let raw = result.value || '';

        // Remove control characters and zero-width characters
        raw = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, ' ');
        raw = raw.replace(/[\u200B-\u200F\uFEFF]/g, ''); // zero-width and BOM
        raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // collapse multiple blank lines
        raw = raw.replace(/\n{3,}/g, '\n\n');
        content = raw.trim();
      } else if (fileExtension === 'doc') {
        // legacy .doc not supported by mammoth
        throw new Error('Legacy .doc files are not supported. Please save as .docx or .pdf and try again.');
      } else if (fileExtension === 'txt') {
        content = await file.text();
      } else {
        throw new Error('Unsupported file type. Please upload a .pdf, .docx, or .txt file.');
      }

      onUpload(content, fileName);
    } catch (e) {
      console.error("Error processing file:", e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during file processing.');
    } finally {
      setIsProcessing(false);
    }
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
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
      // Reset input value to allow uploading the same file again
      if(inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const onButtonClick = () => {
    // Programmatically click the hidden file input
    inputRef.current?.click();
  };

  const isLoading = isProcessing || isAnalyzing;
  const loadingText = isProcessing ? 'Processing File...' : 'Analyzing Document...';

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed border-gray-300 dark:border-neutral-700 p-8 text-center transition-all duration-300 ${isDragging ? 'border-amber-500 bg-amber-500/10' : 'bg-gray-50 dark:bg-neutral-800/50'}`}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.docx,.doc,.txt"
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-700"></div>
            <p className="text-lg font-semibold text-gray-500 dark:text-neutral-400">{loadingText}</p>
          </>
        ) : error ? (
          <>
            <AlertTriangleIcon className="w-12 h-12 text-red-500" />
            <p className="font-semibold text-red-500">Upload Failed</p>
            <p className="text-sm text-gray-500 dark:text-neutral-400">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm text-blue-500 hover:underline">Try Again</button>
          </>
        ) : (
          <>
            <UploadIcon className="w-12 h-12 text-gray-400 dark:text-neutral-500" />
            <p className="text-lg font-bold text-gray-800 dark:text-neutral-200">Drag & Drop Your File Here</p>
            <p className="text-gray-500 dark:text-neutral-400">or</p>
            <button
              onClick={onButtonClick}
              disabled={isLoading}
              className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              Select File to Upload
            </button>
            <p className="text-xs text-gray-400 dark:text-neutral-500 pt-2">Supports .pdf, .docx, .txt</p>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadZone;