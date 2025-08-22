

import React, { useState, useRef, useEffect } from 'react';
import { NavigateTo, Screen, User, UserRole, Workspace } from '../types';
import { VestaLogo, SearchIcon, PlusIcon, ChevronsLeftIcon, LibraryIcon, SettingsIcon, HistoryIcon, LogoutIcon, BriefcaseIcon, EditIcon } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
  navigateTo: NavigateTo;
  currentUser: User;
  onLogout: () => void;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  onSelectWorkspace: (workspace: Workspace) => void;
  userRole: UserRole;
  onManageMembers: () => void;
  onCreateWorkspace: () => void;
  onUpdateWorkspaceName: (workspaceId: string, newName: string) => void;
  onKnowledgeBase: () => void;
  onNewAnalysis: () => void;
}

const UserProfileDropdown: React.FC<{ navigateTo: NavigateTo; onLogout: () => void; onManageMembers: () => void }> = ({ navigateTo, onLogout, onManageMembers }) => (
    <div className="absolute bottom-full mb-2 w-56 bg-white dark:bg-neutral-900 rounded-md shadow-lg z-20 border border-gray-200 dark:border-neutral-700 py-1">
        <button onClick={() => navigateTo(Screen.Settings)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
            <SettingsIcon className="w-4 h-4 mr-3" /> Profile Settings
        </button>
        <button onClick={onManageMembers} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
            <BriefcaseIcon className="w-4 h-4 mr-3" /> Manage Members
        </button>
        <button onClick={() => navigateTo(Screen.AuditTrail)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
            <HistoryIcon className="w-4 h-4 mr-3" /> Audit Trail
        </button>
        <div className="my-1 h-px bg-gray-200 dark:bg-neutral-700" />
        <button onClick={onLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-700 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
            <LogoutIcon className="w-4 h-4 mr-3" /> Logout
        </button>
    </div>
);

const WorkspaceSidebar: React.FC<Pick<LayoutProps, 'currentUser' | 'onLogout' | 'workspaces' | 'currentWorkspace' | 'onSelectWorkspace' | 'onCreateWorkspace' | 'navigateTo' | 'onManageMembers' | 'onNewAnalysis' | 'onKnowledgeBase'> & { isCollapsed: boolean, onToggleCollapse: () => void }> =
  ({ currentUser, onLogout, workspaces, currentWorkspace, onSelectWorkspace, onCreateWorkspace, navigateTo, onManageMembers, isCollapsed, onToggleCollapse, onKnowledgeBase, onNewAnalysis }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isProfileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileRef]);

    const filteredWorkspaces = workspaces.filter(ws =>
        ws.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const highlightMatch = (name: string) => {
        if (!searchTerm) return name;
        const parts = name.split(new RegExp(`(${searchTerm})`, 'gi'));
        return (
            <>
                {parts.map((part, index) =>
                    part.toLowerCase() === searchTerm.toLowerCase() ? (
                        <span key={index} className="text-red-700 font-bold">{part}</span>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    return (
        <aside className={`bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-700 flex flex-col h-full transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'}`}>
            {/* Sidebar Header */}
            <div className={`p-4 flex-shrink-0 border-b border-gray-200 dark:border-neutral-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <VestaLogo className={`w-9 h-9 transition-all duration-300 ${isCollapsed ? '' : 'mr-2'}`} />
                 <div className={`flex items-center space-x-1 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    <button onClick={onKnowledgeBase} title="Knowledge Base" className="p-2 rounded-md text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
                        <LibraryIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onNewAnalysis} title="New Analysis" className="p-2 rounded-md text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
                        <EditIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onToggleCollapse} title="Collapse Sidebar" className="p-2 rounded-md text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
                        <ChevronsLeftIcon className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>
                 {isCollapsed && (
                     <button onClick={onToggleCollapse} title="Expand Sidebar" className="p-2 rounded-md text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
                        <ChevronsLeftIcon className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                 )}
            </div>

             {/* Search */}
            <div className={`p-4 flex-shrink-0`}>
                <div className={`relative`}>
                    <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-neutral-500 transition-all duration-300`} />
                    <input
                        type="text"
                        placeholder={isCollapsed ? '' : "Search..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={`w-full bg-gray-100 dark:bg-neutral-800 border border-transparent rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-red-700 text-gray-800 dark:text-neutral-200 placeholder:text-gray-400 dark:placeholder:text-neutral-500 transition-all duration-300 ${isCollapsed ? 'pl-10 cursor-pointer' : 'pl-10 pr-4'}`}
                    />
                </div>
            </div>

            <nav className="flex-1 px-4 pt-2 overflow-y-auto">
                <p className={`text-sm font-semibold tracking-wider text-gray-500 dark:text-neutral-400 mb-2 px-3 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100'}`}>Workspaces</p>
                <ul className="space-y-2">
                    {filteredWorkspaces.map(ws => (
                        <li key={ws.id}>
                            <button
                                title={ws.name}
                                onClick={() => onSelectWorkspace(ws)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 flex items-center relative ${currentWorkspace?.id === ws.id ? 'bg-gray-100 dark:bg-neutral-800' : 'hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-neutral-200'}`}
                            >
                                {currentWorkspace?.id === ws.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-700 rounded-r-full"></div>}
                                <BriefcaseIcon className={`w-5 h-5 flex-shrink-0 ${currentWorkspace?.id === ws.id ? 'text-red-700' : 'text-gray-500 dark:text-neutral-400'}`} />
                                <span className={`ml-3 truncate transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'} ${currentWorkspace?.id === ws.id ? 'font-semibold text-gray-800 dark:text-neutral-200' : ''}`}>{highlightMatch(ws.name)}</span>
                            </button>
                        </li>
                    ))}
                    <li>
                        <button onClick={onCreateWorkspace} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800">
                            <PlusIcon className="w-5 h-5 flex-shrink-0" />
                            <span className={`ml-3 truncate transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>Create Workspace</span>
                        </button>
                    </li>
                </ul>
            </nav>

            <div ref={profileRef} className="p-4 border-t border-gray-200 dark:border-neutral-700 flex-shrink-0 relative mt-auto">
                {isProfileOpen && <UserProfileDropdown navigateTo={navigateTo} onLogout={onLogout} onManageMembers={onManageMembers} />}
                <button onClick={() => setProfileOpen(o => !o)} className={`w-full flex items-center p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-neutral-800 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 bg-red-700 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                        {currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" /> : getInitials(currentUser.name)}
                    </div>
                    <div className={`ml-3 overflow-hidden text-left transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        <p className="font-semibold text-gray-800 dark:text-neutral-200 text-sm truncate">{currentUser.name}</p>
                    </div>
                </button>
            </div>
        </aside>
    );
};

const TopNavbar: React.FC = () => {
    return (
        <header className="bg-white dark:bg-neutral-900 h-16 px-6 border-b border-gray-200 dark:border-neutral-700 flex justify-between items-center flex-shrink-0 z-10">
            <div></div>
            <div></div>
        </header>
    );
};

export const Layout: React.FC<LayoutProps> = (props) => {
    const { children } = props;
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('vesta-sidebar-collapsed') === 'true');

    const handleToggleCollapse = () => {
        const newState = !isSidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('vesta-sidebar-collapsed', String(newState));
    };
    
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-neutral-950 overflow-hidden">
            <WorkspaceSidebar {...props} isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};

export const CenteredLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 font-sans p-4">
        {children}
    </div>
);