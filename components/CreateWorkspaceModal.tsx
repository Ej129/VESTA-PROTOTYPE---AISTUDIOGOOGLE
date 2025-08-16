
import React, { useState } from 'react';
import { PlusIcon } from './Icons';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    // Simulate network delay
    setTimeout(() => {
        onCreate(name);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={onClose}>
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl p-8 max-w-md w-full transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark mb-2">Create a New Workspace</h2>
            <p className="text-secondary-text-light dark:text-secondary-text-dark mb-6">Give your new workspace a name to get started.</p>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="workspace-name" className="block text-sm font-medium text-primary-text-light dark:text-primary-text-dark mb-2">
                        Workspace Name
                    </label>
                    <input
                        id="workspace-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main text-primary-text-light dark:text-primary-text-dark"
                        placeholder="e.g., Q4 Marketing Campaign"
                        required
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-4 pt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-200 dark:bg-gray-700 text-secondary-text-light dark:text-gray-300 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="bg-primary-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 flex items-center"
                        disabled={!name.trim() || isCreating}
                    >
                       {isCreating ? 'Creating...' : <> <PlusIcon className="w-5 h-5 mr-2" /> Create </>}
                    </button>
                </div>
            </form>
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

export default CreateWorkspaceModal;