import React, { useState, useRef } from 'react';
import { KnowledgeSource, KnowledgeCategory, UserRole } from '../types';
import { PlusIcon, TrashIcon, ChevronDownIcon, GlobeIcon, RefreshIcon, ShieldIcon, KeyIcon, UploadCloudIcon, XCircleIcon } from '../components/Icons';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface KnowledgeBaseModalProps {
  onClose: () => void;
  sources: KnowledgeSource[];
  onAddSource: (title: string, content: string, category: KnowledgeCategory) => void;
  onDeleteSource: (id: string) => void;
  isSyncing: boolean;
  userRole: UserRole;
}

const KnowledgeSourceCard = ({ source, onDelete, canDelete }: { source: KnowledgeSource, onDelete: (id: string) => void, canDelete: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-sm border border-vesta-border-light dark:border-vesta-border-dark relative overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <h4 className="font-bold text-vesta-text-light dark:text-vesta-text-dark pr-12">{source.title}</h4>
                <div className="flex items-center">
                    {canDelete && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(source.id); }} 
                            className="p-1 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-accent-critical dark:hover:text-accent-critical mr-2"
                            aria-label="Delete source"
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    )}
                    <ChevronDownIcon className={`w-6 h-6 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isOpen && (
                <div className="p-4 pt-0">
                    <div className="bg-vesta-bg-light dark:bg-vesta-bg-dark p-4 rounded-md max-h-60 overflow-y-auto">
                        <pre className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark whitespace-pre-wrap font-sans">{source.content}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

const AddSourceForm = ({ category, onAddSource }: { category: KnowledgeCategory, onAddSource: (title: string, content: string, category: KnowledgeCategory) => void }) => {
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const handleAddSource = () => {
        if (!newTitle.trim() || !newContent.trim()) {
            alert("Please provide both a title and content.");
            return;
        }
        setIsAdding(true);
        onAddSource(newTitle, newContent, category);
        setTimeout(() => {
          setNewTitle('');
          setNewContent('');
          setIsAdding(false);
        }, 300);
    };
    
    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAdding(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) throw new Error("File could not be read.");
                const arrayBuffer = e.target.result as ArrayBuffer;
                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                    fullText += pageText + '\n\n';
                }
                onAddSource(file.name, fullText, category);
                setIsAdding(false);
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            alert("Failed to parse PDF file.");
            console.error("PDF Parsing Error:", error);
            setIsAdding(false);
        }
    };

    return (
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark p-6 rounded-lg shadow-sm border border-vesta-border-light dark:border-vesta-border-dark mt-4">
            <h3 className="text-lg font-bold text-vesta-text-light dark:text-vesta-text-dark mb-4">Add New Document</h3>
            <div className="space-y-4">
                <input 
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Document Title"
                    className="w-full px-4 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-bg-light dark:bg-vesta-bg-dark text-vesta-text-light dark:text-vesta-text-dark"
                    disabled={isAdding}
                />
                 <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Paste the full text of the document here..."
                    className="w-full h-40 px-4 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-bg-light dark:bg-vesta-bg-dark text-vesta-text-light dark:text-vesta-text-dark resize-y"
                    disabled={isAdding}
                />
                <div className="flex justify-between items-center">
                    <div>
                        <input type="file" accept=".pdf" ref={pdfInputRef} onChange={handlePdfUpload} className="hidden" />
                        <button 
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={isAdding}
                            className="flex items-center justify-center px-4 py-2 bg-transparent border-2 border-vesta-gold rounded-lg text-sm font-bold text-vesta-red hover:bg-vesta-gold hover:text-white transition-colors disabled:opacity-50"
                        >
                            <UploadCloudIcon className="w-5 h-5 mr-2" />
                            Upload PDF
                        </button>
                    </div>
                    <button 
                        onClick={handleAddSource}
                        disabled={isAdding || !newTitle.trim() || !newContent.trim()}
                        className="flex-shrink-0 flex items-center justify-center px-6 py-2 bg-vesta-red text-white font-bold rounded-lg hover:bg-vesta-red-dark transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Document
                    </button>
                </div>
            </div>
        </div>
    )
}

const KnowledgeCategorySection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div>
        <div className="flex items-center mb-4">
            {icon}
            <h2 className="text-xl font-bold text-vesta-text-light dark:text-vesta-text-dark">{title}</h2>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ onClose, sources, onAddSource, onDeleteSource, isSyncing, userRole }) => {
    const getCanDelete = (source: KnowledgeSource) => {
        return source.isEditable && userRole === 'Administrator';
    };
    
    const getCanAdd = () => {
        return userRole === 'Administrator';
    }

    const governmentSources = sources.filter(s => s.category === KnowledgeCategory.Government);
    const riskSources = sources.filter(s => s.category === KnowledgeCategory.Risk);
    const strategySources = sources.filter(s => s.category === KnowledgeCategory.Strategy);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={onClose}>
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between p-6 border-b border-vesta-border-light dark:border-vesta-border-dark flex-shrink-0">
                <h2 className="text-2xl font-bold text-vesta-red dark:text-vesta-gold">Knowledge Base</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-vesta-bg-dark">
                    <XCircleIcon className="w-6 h-6 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark"/>
                </button>
            </header>
            <main className="flex-1 overflow-y-auto p-8 space-y-8">
                <KnowledgeCategorySection
                    title={KnowledgeCategory.Government}
                    icon={<GlobeIcon className="w-6 h-6 mr-3 text-vesta-red" />}
                >
                {governmentSources.length > 0 ? (
                    governmentSources.map(source => (
                        <KnowledgeSourceCard key={source.id} source={source} onDelete={onDeleteSource} canDelete={getCanDelete(source)} />
                    ))
                ) : (
                    <p className="text-center text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark p-4">No government sources found.</p>
                )}
                {getCanAdd() && <AddSourceForm category={KnowledgeCategory.Government} onAddSource={onAddSource} />}
                </KnowledgeCategorySection>

                <KnowledgeCategorySection
                    title={KnowledgeCategory.Risk}
                    icon={<ShieldIcon className="w-6 h-6 mr-3 text-vesta-red" />}
                >
                {riskSources.length > 0 ? (
                    riskSources.map(source => (
                        <KnowledgeSourceCard key={source.id} source={source} onDelete={onDeleteSource} canDelete={getCanDelete(source)} />
                    ))
                ) : (
                    <p className="text-center text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark p-4">No risk management plans found.</p>
                )}
                {getCanAdd() && <AddSourceForm category={KnowledgeCategory.Risk} onAddSource={onAddSource} />}
                </KnowledgeCategorySection>

                <KnowledgeCategorySection
                    title={KnowledgeCategory.Strategy}
                    icon={<KeyIcon className="w-6 h-6 mr-3 text-vesta-red" />}
                >
                {strategySources.length > 0 ? (
                    strategySources.map(source => (
                        <KnowledgeSourceCard key={source.id} source={source} onDelete={onDeleteSource} canDelete={getCanDelete(source)} />
                    ))
                ) : (
                    <p className="text-center text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark p-4">No strategic documents found.</p>
                )}
                {getCanAdd() && <AddSourceForm category={KnowledgeCategory.Strategy} onAddSource={onAddSource} />}
                </KnowledgeCategorySection>
            </main>
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