
import React, { useState } from 'react';
import { KnowledgeSource, KnowledgeCategory, UserRole } from '../types';
import { PlusIcon, TrashIcon, GlobeIcon, ShieldIcon, BrainCircuitIcon } from './Icons';

interface KnowledgeBaseModalProps {
  onClose: () => void;
  sources: KnowledgeSource[];
  onAddSource: (title: string, content: string, category: KnowledgeCategory) => void;
  onDeleteSource: (id: string) => void;
  isSyncing: boolean;
  userRole: UserRole;
}

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ onClose, sources, onAddSource, onDeleteSource, userRole }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<KnowledgeCategory>(KnowledgeCategory.Government);
    const [showAddForm, setShowAddForm] = useState(false);

    const canEdit = userRole === 'Administrator' || userRole === 'Risk Management Officer' || userRole === 'Strategy Officer';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        onAddSource(title, content, category);
        setTitle('');
        setContent('');
        setCategory(KnowledgeCategory.Government);
        setShowAddForm(false);
    };
    
    const getCategoryIcon = (category: KnowledgeCategory) => {
        switch (category) {
            case KnowledgeCategory.Government: return <GlobeIcon className="w-5 h-5 text-blue-500" />;
            case KnowledgeCategory.Risk: return <ShieldIcon className="w-5 h-5 text-yellow-500" />;
            case KnowledgeCategory.Strategy: return <BrainCircuitIcon className="w-5 h-5 text-green-500" />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-8 max-w-3xl w-full transform transition-all animate-fade-in-up flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark mb-2">Knowledge Base</h2>
                <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-6">Manage the contextual documents Vesta uses for analysis.</p>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {sources.map(source => (
                        <div key={source.id} className="bg-vesta-bg-light dark:bg-vesta-bg-dark p-4 rounded-lg border border-vesta-border-light dark:border-vesta-border-dark">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center mb-1">
                                        {getCategoryIcon(source.category)}
                                        <p className="ml-2 text-xs font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{source.category}</p>
                                    </div>
                                    <h4 className="font-bold text-vesta-text-light dark:text-vesta-text-dark">{source.title}</h4>
                                </div>
                                {canEdit && source.isEditable && (
                                    <button onClick={() => onDeleteSource(source.id)} className="p-1 text-gray-400 hover:text-accent-critical">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-2 line-clamp-2">{source.content}</p>
                        </div>
                    ))}
                </div>

                {canEdit && (
                    <div className="mt-6 flex-shrink-0">
                        {showAddForm ? (
                            <form onSubmit={handleSubmit} className="bg-vesta-bg-light dark:bg-vesta-bg-dark p-4 rounded-lg border border-vesta-border-light dark:border-vesta-border-dark space-y-4">
                                <div>
                                    <label htmlFor="source-title" className="block text-sm font-medium text-vesta-text-light dark:text-vesta-text-dark mb-1">Title</label>
                                    <input id="source-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg bg-vesta-card-light dark:bg-vesta-card-dark" required />
                                </div>
                                 <div>
                                    <label htmlFor="source-category" className="block text-sm font-medium text-vesta-text-light dark:text-vesta-text-dark mb-1">Category</label>
                                    <select id="source-category" value={category} onChange={e => setCategory(e.target.value as KnowledgeCategory)} className="w-full px-3 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg bg-vesta-card-light dark:bg-vesta-card-dark" required>
                                        {Object.values(KnowledgeCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="source-content" className="block text-sm font-medium text-vesta-text-light dark:text-vesta-text-dark mb-1">Content</label>
                                    <textarea id="source-content" value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full px-3 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg bg-vesta-card-light dark:bg-vesta-card-dark" required />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-vesta-red text-white font-semibold rounded-lg">Add Source</button>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setShowAddForm(true)} className="w-full flex items-center justify-center py-3 bg-vesta-red text-white font-bold rounded-lg hover:bg-vesta-red-dark">
                                <PlusIcon className="w-5 h-5 mr-2" /> Add New Knowledge Source
                            </button>
                        )}
                    </div>
                )}
                
                <div className="flex justify-end pt-6 flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-700 text-vesta-text-secondary-light dark:text-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
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
