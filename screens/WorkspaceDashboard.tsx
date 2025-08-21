

import React, { useState, useRef, useEffect } from 'react';
import { Workspace, User } from '../types';
import { PlusIcon, BriefcaseIcon, MoreVerticalIcon } from '../components/Icons';

interface WorkspaceDashboardProps {
    workspaces: Workspace[];
    onSelectWorkspace: (workspace: Workspace) => void;
    onCreateWorkspace: () => void;
    currentUser: User;
    onUpdateWorkspaceStatus: (workspaceId: string, status: 'active' | 'archived') => void;
    onDeleteWorkspace: (workspaceId: string) => void;
}

const WorkspaceCard: React.FC<{ 
    workspace: Workspace; 
    onSelect: () => void;
    isCreator: boolean;
    onArchive: () => void;
    onUnarchive: () => void;
    onDelete: () => void;
}> = ({ workspace, onSelect, isCreator, onArchive, onUnarchive, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const isArchived = workspace.status === 'archived';

    return (
        <div 
            className="bg-vesta-card-light dark:bg-vesta-card-dark p-6 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between border border-vesta-border-light dark:border-vesta-border-dark relative"
        >
            {isCreator && (
                <div ref={menuRef} className="absolute top-3 right-3 z-10">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }} 
                        className="p-2 rounded-full text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-200 dark:hover:bg-vesta-bg-dark"
                        aria-label="More options"
                    >
                        <MoreVerticalIcon className="w-5 h-5" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-vesta-card-light dark:bg-vesta-card-dark rounded-md shadow-lg z-50 border border-vesta-border-light dark:border-vesta-border-dark py-1">
                            {isArchived ? (
                                <button onClick={(e) => { e.stopPropagation(); onUnarchive(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-gray-100 dark:hover:bg-black">Unarchive</button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); onArchive(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-gray-100 dark:hover:bg-black">Archive</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-black">Delete</button>
                        </div>
                    )}
                </div>
            )}
            <div onClick={onSelect} className="cursor-pointer">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-vesta-red/10 p-2 rounded-lg">
                        <BriefcaseIcon className="w-6 h-6 text-vesta-red" />
                    </div>
                    <h3 className="font-bold text-xl text-vesta-text-light dark:text-vesta-text-dark truncate pr-8">{workspace.name}</h3>
                </div>
                <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">Created on {new Date(workspace.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void; }> = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" aria-modal="true" role="dialog">
            <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-8 max-w-md w-full transform transition-all animate-fade-in-up">
                <h2 className="text-xl font-bold text-vesta-red mb-4">{title}</h2>
                <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-8">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-6 py-2 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-vesta-card-dark transition-all text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark border border-transparent">Cancel</button>
                    <button onClick={onConfirm} className="bg-vesta-red text-white font-bold py-2 px-6 rounded-lg hover:bg-vesta-red-dark transition-all">Confirm Delete</button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({ workspaces, onSelectWorkspace, onCreateWorkspace, currentUser, onUpdateWorkspaceStatus, onDeleteWorkspace }) => {
    
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);

    const activeWorkspaces = workspaces.filter(ws => ws.status !== 'archived');
    const archivedWorkspaces = workspaces.filter(ws => ws.status === 'archived');
    const workspacesToShow = view === 'active' ? activeWorkspaces : archivedWorkspaces;

    const handleDeleteClick = (workspace: Workspace) => {
        setWorkspaceToDelete(workspace);
    };
  
    const confirmDelete = () => {
        if (workspaceToDelete) {
            onDeleteWorkspace(workspaceToDelete.id);
            setWorkspaceToDelete(null);
        }
    };
    
    return (
        <>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-1">Select a workspace to continue or create a new one.</p>
                    </div>
                    <button 
                        onClick={onCreateWorkspace}
                        className="flex items-center bg-vesta-red text-white font-bold py-2.5 px-5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:bg-vesta-red-dark"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Create New Workspace
                    </button>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center border border-vesta-border-light dark:border-vesta-border-dark rounded-lg p-1 bg-vesta-card-light dark:bg-vesta-card-dark">
                        <button onClick={() => setView('active')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === 'active' ? 'bg-vesta-red text-white' : 'text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark'}`}>Active ({activeWorkspaces.length})</button>
                        <button onClick={() => setView('archived')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === 'archived' ? 'bg-vesta-red text-white' : 'text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark'}`}>Archived ({archivedWorkspaces.length})</button>
                    </div>
                </div>

                {workspacesToShow.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspacesToShow.map(ws => (
                            <WorkspaceCard 
                                key={ws.id}
                                workspace={ws}
                                onSelect={() => onSelectWorkspace(ws)}
                                isCreator={currentUser.email === ws.creatorId}
                                onArchive={() => onUpdateWorkspaceStatus(ws.id, 'archived')}
                                onUnarchive={() => onUpdateWorkspaceStatus(ws.id, 'active')}
                                onDelete={() => handleDeleteClick(ws)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center bg-vesta-card-light dark:bg-vesta-card-dark p-12 rounded-xl border border-vesta-border-light dark:border-vesta-border-dark">
                        <BriefcaseIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark">No {view} workspaces</h2>
                        <p className="mt-2 mb-6 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark max-w-md mx-auto">
                            {view === 'active' 
                                ? 'Create a new workspace to get started.' 
                                : 'You haven\'t archived any workspaces yet.'
                            }
                        </p>
                    </div>
                )}
            </div>
            {workspaceToDelete && (
                <ConfirmationModal 
                    title="Confirm Deletion"
                    message={`Are you sure you want to permanently delete "${workspaceToDelete.name}"? This action cannot be undone and will remove all associated reports, logs, and data.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setWorkspaceToDelete(null)}
                />
            )}
        </>
    );
};

export default WorkspaceDashboard;