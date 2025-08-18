import React from 'react';
import { Workspace, User } from '../types';
import { VestaLogo, LogoutIcon, PlusIcon, BriefcaseIcon } from '../components/Icons';

interface WorkspaceDashboardProps {
    workspaces: Workspace[];
    onSelectWorkspace: (workspace: Workspace) => void;
    onCreateWorkspace: () => void;
    currentUser: User;
    onLogout: () => void;
}

const WorkspaceCard: React.FC<{ workspace: Workspace; onSelect: () => void; }> = ({ workspace, onSelect }) => {
    return (
        <div 
            onClick={onSelect}
            className="bg-vesta-card-light dark:bg-vesta-card-dark p-6 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between border border-vesta-border-light dark:border-vesta-border-dark"
        >
            <div>
                <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-vesta-red/10 p-2 rounded-lg">
                        <BriefcaseIcon className="w-6 h-6 text-vesta-red" />
                    </div>
                    <h3 className="font-bold text-xl text-vesta-text-light dark:text-vesta-text-dark truncate">{workspace.name}</h3>
                </div>
                <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">Created on {new Date(workspace.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
    );
};

const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({ workspaces, onSelectWorkspace, onCreateWorkspace, currentUser, onLogout }) => {
    
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };
    
    return (
        <div className="min-h-screen bg-vesta-bg-light dark:bg-vesta-bg-dark">
            <header className="bg-vesta-card-light dark:bg-vesta-card-dark h-16 px-6 border-b border-vesta-border-light dark:border-vesta-border-dark flex justify-between items-center">
                <div className="flex items-center">
                    <VestaLogo className="w-10 h-10" />
                    <h1 className="text-2xl font-bold ml-3 text-gray-800 dark:text-white">Vesta</h1>
                </div>
                <div className="flex items-center space-x-4">
                     <div className="flex items-center p-2 rounded-lg">
                        <div className="w-10 h-10 bg-vesta-red rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                             {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                              ) : (
                                getInitials(currentUser.name)
                              )}
                        </div>
                        <div className="ml-3 text-right">
                            <p className="font-semibold text-vesta-text-light dark:text-vesta-text-dark text-sm">{currentUser.name}</p>
                            <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-xs">{currentUser.email}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="p-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-vesta-red dark:hover:text-white" aria-label="Logout">
                        <LogoutIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>
            <main className="p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-vesta-text-light dark:text-vesta-text-dark">Your Workspaces</h1>
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

                {workspaces.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspaces.map(ws => (
                            <WorkspaceCard 
                                key={ws.id}
                                workspace={ws}
                                onSelect={() => onSelectWorkspace(ws)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center bg-vesta-card-light dark:bg-vesta-card-dark p-12 rounded-xl border border-vesta-border-light dark:border-vesta-border-dark">
                        <BriefcaseIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark">Create Your First Workspace</h2>
                        <p className="mt-2 mb-6 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark max-w-md mx-auto">
                            Workspaces are dedicated areas for your team to collaborate on document analysis.
                        </p>
                        <button 
                            onClick={onCreateWorkspace}
                            className="flex items-center mx-auto bg-vesta-red text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:bg-vesta-red-dark"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create Workspace
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default WorkspaceDashboard;