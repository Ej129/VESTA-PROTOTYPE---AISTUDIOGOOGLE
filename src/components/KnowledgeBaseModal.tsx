// src/components/KnowledgeBaseModal.tsx

import React, { useState, useMemo } from 'react';
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

// A more granular permission check
const canUserEditSource = (source: KnowledgeSource, userRole: UserRole): boolean => {
    if (!source.isEditable) return false; // Uneditable sources can never be edited.
    
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
                            {/* Use the new granular permission check for the delete button */}
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
    // Default to 'Risk' as it's the first editable option
    const [category, setCategory] = useState<KnowledgeCategory>(KnowledgeCategory.Risk);
    const [showAddForm, setShowAddForm] = useState(false);

    // Determine which roles are allowed to add any new source
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

    // Memoize the categorized sources to prevent re-filtering on every render
    const categorizedSources = useMemo(() => {
        const government = sources.filter(s => s.category === KnowledgeCategory.Government);
        const risk = sources.filter(s => s.category === KnowledgeCategory.Risk);
        const strategy = sources.filter(s => s.category === KnowledgeCategory.Strategy);
        return { government, risk, strategy };
    }, [sources]);
    
    // Define which categories a user can add to
    const editableCategories = [KnowledgeCategory.Risk, KnowledgeCategory.Strategy];

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
                                <div>
                                    <label htmlFor="source-title" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Title</label>
                                    <input id="source-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900" required />
                                </div>
                                 <div>
                                    <label htmlFor="source-category" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Category</label>
                                    <select id="source-category" value={category} onChange={e => setCategory(e.target.value as KnowledgeCategory)} className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900" required>
                                        {/* Only show editable categories in the dropdown */}
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