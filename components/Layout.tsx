

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { NavigateTo, Screen, User, UserRole, Workspace } from '../types';
import { VestaLogo, SearchIcon, PlusIcon, ChevronsLeftIcon, LibraryIcon, EditIcon, SettingsIcon, HistoryIcon, LogoutIcon } from './Icons';

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
}

export const HeaderActionsContext = createContext<{ setActions: (actions: React.ReactNode | null) => void }>({
    setActions: () => {},
});

const UserProfileDropdown: React.FC<{ navigateTo: NavigateTo; onLogout: () => void }> = ({ navigateTo, onLogout }) => (
    <div className="absolute bottom-full mb-2 w-56 bg-vesta-card-light dark:bg-vesta-card-dark rounded-md shadow-lg z-20 border border-vesta-border-light dark:border-vesta-border-dark py-1">
        <button onClick={() => navigateTo(Screen.Settings)} className="w-full text-left flex items-center px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-gray-100 dark:hover:bg-vesta-bg-dark">
            <SettingsIcon className="w-4 h-4 mr-3" /> Settings
        </button>
        <button onClick={() => navigateTo(Screen.AuditTrail)} className="w-full text-left flex items-center px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-gray-100 dark:hover:bg-vesta-bg-dark">
            <HistoryIcon className="w-4 h-4 mr-3" /> Audit Trail
        </button>
        <div className="my-1 h-px bg-vesta-border-light dark:bg-vesta-border-dark" />
        <button onClick={onLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-vesta-red hover:bg-gray-100 dark:hover:bg-vesta-bg-dark">
            <LogoutIcon className="w-4 h-4 mr-3" /> Logout
        </button>
    </div>
);

const WorkspaceSidebar: React.FC<Pick<LayoutProps, 'currentUser' | 'onLogout' | 'workspaces' | 'currentWorkspace' | 'onSelectWorkspace' | 'onCreateWorkspace' | 'navigateTo'> & { isCollapsed: boolean }> =
  ({ currentUser, onLogout, workspaces, currentWorkspace, onSelectWorkspace, onCreateWorkspace, navigateTo, isCollapsed }) => {
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

    return (
        <aside className={`bg-vesta-card-light dark:bg-vesta-card-dark text-vesta-text-light dark:text-vesta-text-dark flex flex-col h-screen border-r border-vesta-border-light dark:border-vesta-border-dark transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-72'}`}>
            <div className="flex-shrink-0 p-4 h-16 border-b border-vesta-border-light dark:border-vesta-border-dark flex items-center justify-between">
                <div className="flex items-center">
                    <VestaLogo className="w-8 h-8" />
                    <h1 className="ml-3 font-bold text-lg font-display">Vesta</h1>
                </div>
            </div>

            <div className="p-4 flex-shrink-0">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark" />
                    <input
                        type="text"
                        placeholder="Search workspaces..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-vesta-bg-light dark:bg-vesta-bg-dark border border-vesta-border-light dark:border-vesta-border-dark rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-vesta-red"
                    />
                </div>
            </div>

            <nav className="flex-1 p-4 pt-0 overflow-y-auto">
                <ul className="space-y-1">
                    {filteredWorkspaces.map(ws => (
                        <li key={ws.id}>
                            <button
                                onClick={() => onSelectWorkspace(ws)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center ${currentWorkspace?.id === ws.id ? 'bg-vesta-red text-white' : 'hover:bg-gray-100 dark:hover:bg-vesta-bg-dark'}`}
                            >
                                <span className="flex-shrink-0 w-2 h-2 mr-3 rounded-full bg-vesta-gold" />
                                <span className="truncate">{ws.name}</span>
                            </button>
                        </li>
                    ))}
                    <li>
                        <button onClick={onCreateWorkspace} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-100 dark:hover:bg-vesta-bg-dark">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            <span className="truncate">Create Workspace</span>
                        </button>
                    </li>
                </ul>
            </nav>

            <div ref={profileRef} className="p-4 bg-vesta-card-light dark:bg-vesta-card-dark border-t border-vesta-border-light dark:border-vesta-border-dark flex-shrink-0 relative">
                {isProfileOpen && <UserProfileDropdown navigateTo={navigateTo} onLogout={onLogout} />}
                <button onClick={() => setProfileOpen(o => !o)} className="w-full flex items-center p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-vesta-bg-dark">
                    <div className="w-10 h-10 bg-vesta-gold rounded-full flex items-center justify-center text-vesta-red font-bold text-sm overflow-hidden flex-shrink-0">
                        {currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" /> : getInitials(currentUser.name)}
                    </div>
                    <div className="ml-3 overflow-hidden text-left">
                        <p className="font-semibold text-vesta-text-light dark:text-vesta-text-dark text-sm truncate">{currentUser.name}</p>
                        <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">View profile</p>
                    </div>
                </button>
            </div>
        </aside>
    );
};

const ContentHeader: React.FC<Pick<LayoutProps, 'currentWorkspace' | 'navigateTo' | 'onUpdateWorkspaceName'> & { isCollapsed: boolean, onToggleCollapse: () => void, headerActions: React.ReactNode | null }> =
  ({ currentWorkspace, navigateTo, isCollapsed, onToggleCollapse, headerActions, onUpdateWorkspaceName }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setWorkspaceName(currentWorkspace?.name || '');
    }, [currentWorkspace]);
    
    useEffect(() => {
        if (isEditingName) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditingName]);

    const handleNameSave = () => {
        if (currentWorkspace && workspaceName.trim() && workspaceName !== currentWorkspace.name) {
            onUpdateWorkspaceName(currentWorkspace.id, workspaceName);
        }
        setIsEditingName(false);
    };

    return (
        <header className="bg-vesta-card-light dark:bg-vesta-card-dark h-16 px-6 border-b border-vesta-border-light dark:border-vesta-border-dark flex justify-between items-center flex-shrink-0">
            <div className="flex items-center">
                <button onClick={onToggleCollapse} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-vesta-bg-dark mr-2">
                    <ChevronsLeftIcon className={`w-6 h-6 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
                 {isEditingName ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                        className="text-2xl font-bold bg-transparent focus:outline-none ring-2 ring-vesta-red rounded-md px-2 -ml-2"
                    />
                 ) : (
                    <h1 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark truncate">{currentWorkspace?.name || 'Vesta'}</h1>
                 )}
            </div>
            <div className="flex items-center space-x-2">
                {headerActions}
                {currentWorkspace && (
                    <>
                        <button onClick={() => navigateTo(Screen.KnowledgeBase)} title="Knowledge Base" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-vesta-bg-dark text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                            <LibraryIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => setIsEditingName(true)} title="Rename Workspace" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-vesta-bg-dark text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                            <EditIcon className="w-6 h-6" />
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export const Layout: React.FC<LayoutProps> = (props) => {
    const { children, currentWorkspace } = props;
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('vesta-sidebar-collapsed') === 'true');
    const [headerActions, setHeaderActions] = useState<React.ReactNode | null>(null);

    useEffect(() => {
        localStorage.setItem('vesta-sidebar-collapsed', String(isSidebarCollapsed));
    }, [isSidebarCollapsed]);
    
    useEffect(() => {
      // Reset header actions when workspace changes
      setHeaderActions(null);
    }, [currentWorkspace]);

    return (
        <HeaderActionsContext.Provider value={{ setActions: setHeaderActions }}>
            <div className="flex h-screen bg-vesta-bg-light dark:bg-vesta-bg-dark overflow-hidden">
                <WorkspaceSidebar {...props} isCollapsed={isSidebarCollapsed} />
                <div className="flex-1 flex flex-col overflow-y-hidden">
                    <ContentHeader {...props} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)} headerActions={headerActions} />
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </HeaderActionsContext.Provider>
    );
};

export const CenteredLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-vesta-bg-light dark:bg-vesta-bg-dark font-sans p-4">
        {children}
    </div>
);