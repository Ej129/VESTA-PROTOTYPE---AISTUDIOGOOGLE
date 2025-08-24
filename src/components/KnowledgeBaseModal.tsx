// src/components/KnowledgeBaseModal.tsx

import React, { useState, useMemo } from 'react';
import { KnowledgeSource, KnowledgeCategory, UserRole } from '../types';
import { PlusIcon, TrashIcon, GlobeIcon, ShieldIcon, BrainCircuitIcon, UploadIcon as FileUploadIcon } from './Icons';
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// This is the same worker setup from your UploadZone, ensuring PDF parsing works
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

// --- NEW: A compact file processor component for this modal ---
const FileProcessor: React.FC<{
    onFileProcessed: (fileName: string, content: string) => void;
}> = ({ onFileProcessed }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);
        try {
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop()?.toLowerCase();
            let content = '';

            if (fileExtension === 'pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    content += textContent.items.map((item: any) => item.str).join(' ');
                }
            } else if (fileExtension === 'docx') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                content = result.value;
            } else if (fileExtension === 'txt') {
                content = await file.text();
            } else {
                throw new Error('Unsupported file type.');
            }
            onFileProcessed(fileName, content);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to process file.');
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <div className="text-center">
            <input type="file" ref={inputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.docx,.txt" />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center justify-center px-4 py-2 border border-dashed border-gray-400 dark:border-neutral-600 text-sm font-medium rounded-md text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50"
            >
                <FileUploadIcon className="w-5 h-5 mr-2" />
                {isProcessing ? 'Processing...' : 'Upload File to Auto-fill'}
            </button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
    );
};


interface KnowledgeBaseModalProps {
  onClose: () => void;
  sources: KnowledgeSource[];
  onAddSource: (title: string, content: string, category: KnowledgeCategory) => void;
  onDeleteSource: (id: string) => void;
  isSyncing: boolean;
  userRole: UserRole;
}

const canUserEditSource = (source: KnowledgeSource, userRole: UserRole): boolean => {
    if (!source.isEditable) return false;
    switch (source.category) {
        case KnowledgeCategory.Risk:
            return userRole === 'Administrator' || userRole === 'Risk Management Officer';
        case KnowledgeCategory.Strategy:
            return userRole === 'Administrator' || userRole === 'Strategy Officer';
        default:
            return false;
    }
};

const CategorySection: React.FC<{
    category: KnowledgeCategory;
    sources: KnowledgeSource[];
    userRole: UserRole;
    onDeleteSource: (id: string) => void;
}> = ({ category, sources, userRole, onDeleteSource }) => {
    const getCategoryIcon = (cat: KnowledgeCategory) => {
        switch (cat) {
            case KnowledgeCategory.Government: return <GlobeIcon className="w-6 h-6 text-blue-500" />;
            case KnowledgeCategory.Risk: return <ShieldIcon className="w-6 h-6 text-yellow-500" />;
            case KnowledgeCategory.Strategy: return <BrainCircuitIcon className="w-6 h-6 text-green-500" />;
            default: return null;
        }
    };

    if (sources.length === 0) return null;

    return (
        <div>
            <div className="flex items-center space-x-3 mb-3">
                {getCategoryIcon(category)}
                <h3 className="text-lg font-bold text-gray-800 dark:text-neutral-200">{category}</h3>
            </div>
            <div className="space-y-3">
                {sources.map(source => (
                    <div key={source.id} className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900 dark:text-neutral-100 pr-4">{source.title}</h4>
                            {canUserEditSource(source, userRole) && (
                                <button onClick={() => onDeleteSource(source.id)} className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-neutral-400 mt-2 line-clamp-2">{source.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ onClose, sources, onAddSource, onDeleteSource, userRole }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<KnowledgeCategory>(KnowledgeCategory.Risk);
    const [showAddForm, setShowAddForm] = useState(false);

    const canAddSource = userRole === 'Administrator' || userRole === 'Risk Management Officer' || userRole === 'Strategy Officer';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        onAddSource(title, content, category);
        setTitle('');
        setContent('');
        setCategory(KnowledgeCategory.Risk);
        setShowAddForm(false);
    };

    const categorizedSources = useMemo(() => {
        const government = sources.filter(s => s.category === KnowledgeCategory.Government);
        const risk = sources.filter(s => s.category === KnowledgeCategory.Risk);
        const strategy = sources.filter(s => s.category === KnowledgeCategory.Strategy);
        return { government, risk, strategy };
    }, [sources]);
    
    const editableCategories = [KnowledgeCategory.Risk, KnowledgeCategory.Strategy];

    // --- NEW: Handler for when the file processor is done ---
    const handleFileProcessed = (fileName: string, extractedContent: string) => {
        setTitle(fileName.replace(/\.[^/.]+$/, "")); // Set title from filename (without extension)
        setContent(extractedContent); // Set content from extracted text
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 sm:p-8 max-w-3xl w-full transform transition-all animate-fade-in-up flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mb-2">Knowledge Base</h2>
                <p className="text-gray-600 dark:text-neutral-400 mb-6">Manage the contextual documents Vesta uses for analysis.</p>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    <CategorySection category={KnowledgeCategory.Government} sources={categorizedSources.government} userRole={userRole} onDeleteSource={onDeleteSource} />
                    <CategorySection category={KnowledgeCategory.Risk} sources={categorizedSources.risk} userRole={userRole} onDeleteSource={onDeleteSource} />
                    <CategorySection category={KnowledgeCategory.Strategy} sources={categorizedSources.strategy} userRole={userRole} onDeleteSource={onDeleteSource} />
                </div>

                {canAddSource && (
                    <div className="mt-6 flex-shrink-0">
                        {showAddForm ? (
                            <form onSubmit={handleSubmit} className="bg-gray-100 dark:bg-neutral-800/50 p-4 rounded-lg border border-gray-200 dark:border-neutral-700 space-y-4">
                                {/* --- NEW: File upload section added --- */}
                                <FileProcessor onFileProcessed={handleFileProcessed} />

                                <div className="flex items-center text-xs text-gray-400 dark:text-neutral-500">
                                    <span className="flex-grow border-t border-gray-300 dark:border-neutral-700"></span>
                                    <span className="px-2">OR</span>
                                    <span className="flex-grow border-t border-gray-300 dark:border-neutral-700"></span>
                                </div>
                                {/* --- END NEW --- */}
                                
                                <div>
                                    <label htmlFor="source-title" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Title</label>
                                    <input id="source-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900" required />
                                </div>
                                 <div>
                                    <label htmlFor="source-category" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Category</label>
                                    <select id="source-category" value={category} onChange={e => setCategory(e.target.value as KnowledgeCategory)} className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900" required>
                                        {editableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="source-content" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Content</label>
                                    <textarea id="source-content" value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900" required />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 font-semibold rounded-lg">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-red-700 text-white font-semibold rounded-lg">Add Source</button>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setShowAddForm(true)} className="w-full flex items-center justify-center py-3 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800">
                                <PlusIcon className="w-5 h-5 mr-2" /> Add New Knowledge Source
                            </button>
                        )}
                    </div>
                )}
                
                <div className="flex justify-end pt-6 flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-all">
                        Done
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

export default KnowledgeBaseModal;