
import React, { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { NavigateTo, Screen, User, UserRole, Workspace, WorkspaceInvitation } from '../types';
import { VestaLogo, DashboardIcon, HistoryIcon, LibraryIcon, SettingsIcon, LogoutIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, BellIcon, SearchIcon, PlusIcon, EditIcon } from './Icons';
import InvitationDropdown from './InvitationDropdown';

// --- Header Context for Customization ---
interface HeaderContextType {
  setTitleContent: (node: ReactNode | null) => void;
  setActions: (node: ReactNode | null) => void;
}
const HeaderContext = createContext<HeaderContextType | null>({ setTitleContent: () => {}, setActions: () => {} });
export const useHeader = () => useContext(HeaderContext);
// --- End Header Context ---


interface WorkspaceSidebarProps {
  navigateTo: NavigateTo;
  currentUser: User;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onUpdateWorkspaceName: (workspaceId: string, newName: string) => void;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = (props) => {
  const { navigateTo, currentUser, onLogout, isSidebarCollapsed, toggleSidebar, currentWorkspace, workspaces, onSelectWorkspace, onCreateWorkspace, onUpdateWorkspaceName } = props;
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editedName, setEditedName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingWorkspace && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingWorkspace]);
  
  const handleEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setEditedName(workspace.name);
  }

  const handleSaveName = () => {
    if(editingWorkspace && editedName.trim() && editedName !== editingWorkspace.name) {
      onUpdateWorkspaceName(editingWorkspace.id, editedName);
    }
    setEditingWorkspace(null);
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const tooltipClasses = `absolute left-full ml-2 px-2 py-1 text-xs font-semibold text-white bg-vesta-card-dark rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none`;

  const filteredWorkspaces = workspaces.filter(ws => ws.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <aside className={`bg-vesta-card-light dark:bg-vesta-card-dark text-vesta-text-light dark:text-vesta-text-dark flex flex-col h-screen border-r border-vesta-border-light dark:border-vesta-border-dark transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-vesta-border-light dark:border-vesta-border-dark flex-shrink-0">
        <div className="flex items-center gap-2">
            <VestaLogo className="w-8 h-8 flex-shrink-0" />
            <button onClick={() => currentWorkspace && navigateTo(Screen.KnowledgeBase)} disabled={!currentWorkspace} className="relative group p-2 rounded-md hover:bg-gray-200 dark:hover:bg-vesta-bg-dark disabled:opacity-50 disabled:cursor-not-allowed">
                <LibraryIcon className="w-5 h-5"/>
                <span className={tooltipClasses}>Knowledge Base</span>
            </button>
             <button onClick={() => currentWorkspace && handleEdit(currentWorkspace)} disabled={!currentWorkspace} className="relative group p-2 rounded-md hover:bg-gray-200 dark:hover:bg-vesta-bg-dark disabled:opacity-50 disabled:cursor-not-allowed">
                <EditIcon className="w-5 h-5"/>
                 <span className={tooltipClasses}>Rename Workspace</span>
            </button>
        </div>
        <button onClick={toggleSidebar} className="relative group p-2 rounded-md hover:bg-gray-200 dark:hover:bg-vesta-bg-dark">
            <ChevronsLeftIcon className="w-5 h-5"/>
            <span className={tooltipClasses}>Collapse Sidebar</span>
        </button>
      </div>

      {/* Search & Workspaces */}
      <div className="flex-1 flex flex-col p-4 overflow-y-hidden">
        <div className="relative mb-4 flex-shrink-0">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark" />
            <input 
                type="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full h-10 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg bg-vesta-bg-light dark:bg-vesta-bg-dark focus:outline-none focus:ring-2 focus:ring-vesta-red transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0' : 'pl-10 pr-4'}`}
            />
        </div>
        <div className={`flex items-center justify-between mb-2 flex-shrink-0 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
             <h2 className={`font-bold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark ${isSidebarCollapsed ? 'hidden' : ''}`}>Work Space</h2>
             <button onClick={onCreateWorkspace} className={`relative group p-1 rounded-md hover:bg-gray-200 dark:hover:bg-vesta-bg-dark ${isSidebarCollapsed ? 'mb-2' : ''}`}>
                <PlusIcon className="w-5 h-5"/>
                <span className={tooltipClasses}>New Workspace</span>
            </button>
        </div>
        <nav className="flex-grow overflow-y-auto -mr-4 pr-4">
            <ul className="space-y-1">
                {filteredWorkspaces.map(ws => (
                    <li key={ws.id}>
                        {editingWorkspace?.id === ws.id ? (
                             <input
                                ref={editInputRef}
                                type="text"
                                value={editedName}
                                onChange={e => setEditedName(e.target.value)}
                                onBlur={handleSaveName}
                                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                                className="w-full text-sm font-semibold p-3 rounded-lg bg-vesta-bg-light dark:bg-vesta-bg-dark border-2 border-vesta-red focus:outline-none"
                            />
                        ) : (
                            <button 
                                onClick={() => onSelectWorkspace(ws)}
                                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors duration-200 ${currentWorkspace?.id === ws.id ? 'bg-vesta-red/10 text-vesta-red' : 'hover:bg-gray-100 dark:hover:bg-vesta-bg-dark'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            >
                                <span className={`flex-shrink-0 w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center ${currentWorkspace?.id === ws.id ? 'bg-vesta-red text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    {getInitials(ws.name)}
                                </span>
                                <span className={`ml-3 text-sm font-semibold truncate ${isSidebarCollapsed ? 'hidden' : ''}`}>{ws.name}</span>
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
      </div>
      
      {/* User Profile Footer */}
      <div className="p-4 border-t border-vesta-border-light dark:border-vesta-border-dark flex-shrink-0">
           <div className={`flex items-center p-2 rounded-lg transition-colors duration-200 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-vesta-gold rounded-full flex items-center justify-center text-vesta-red font-bold text-sm overflow-hidden flex-shrink-0">
                  {currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" /> : getInitials(currentUser.name)}
              </div>
              <div className={`ml-3 overflow-hidden transition-all duration-200 ease-in-out ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  <p className="font-semibold text-white text-sm truncate text-vesta-text-light dark:text-vesta-text-dark">{currentUser.name}</p>
                  <button onClick={onLogout} className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:underline">Logout</button>
              </div>
          </div>
      </div>
    </aside>
  );
};

interface ContentHeaderProps {
    navigateTo: NavigateTo;
    activeScreen: Screen;
    currentWorkspace: Workspace | null;
    userRole: UserRole;
    onManageMembers: () => void;
    titleContent: ReactNode | null;
    actions: ReactNode | null;
    invitations: WorkspaceInvitation[];
    onRespondToInvitation: (workspaceId: string, response: 'accept' | 'decline') => void;
}

const ContentHeader: React.FC<ContentHeaderProps> = (props) => {
    const { navigateTo, activeScreen, currentWorkspace, userRole, onManageMembers, titleContent, actions, invitations, onRespondToInvitation } = props;
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
      { text: 'Analysis', icon: <DashboardIcon />, screen: Screen.Analysis }, // Main view is now Analysis
      { text: 'Dashboard', icon: <DashboardIcon />, screen: Screen.Dashboard },
      { text: 'Audit Trail', icon: <HistoryIcon />, screen: Screen.AuditTrail },
      { text: 'Knowledge Base', icon: <LibraryIcon />, screen: Screen.KnowledgeBase },
      { text: 'Settings', icon: <SettingsIcon />, screen: Screen.Settings },
    ];

    const defaultTitle = <h1 className="text-xl font-bold text-vesta-gold truncate">{currentWorkspace?.name || 'Vesta'}</h1>;

    const defaultActions = (
      <>
        {currentWorkspace && (userRole === 'Administrator' || userRole === 'Member') && (
            <button onClick={onManageMembers} className="flex items-center px-4 py-2 bg-transparent border-2 border-vesta-gold rounded-lg text-sm font-bold text-vesta-red hover:bg-vesta-gold hover:text-white transition-colors">
              <UsersIcon className="w-5 h-5 mr-2" />
              Manage Members
            </button>
        )}
      </>
    );

    return (
        <header className="bg-vesta-card-light dark:bg-vesta-card-dark h-16 px-6 border-b border-vesta-border-light dark:border-vesta-border-dark flex justify-between items-center flex-shrink-0 gap-4">
            <div className="flex-1 min-w-0">{titleContent || defaultTitle}</div>
            <div className="hidden md:flex items-center space-x-2">
                {navItems.map(item => (
                    <button 
                        key={item.text}
                        onClick={() => navigateTo(item.screen)}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeScreen === item.screen ? 'text-vesta-red dark:text-vesta-gold' : 'text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-vesta-text-light dark:hover:text-vesta-text-dark'}`}
                    >
                        {item.text}
                    </button>
                ))}
            </div>
            <div className="flex items-center space-x-4 flex-shrink-0">
                 <div ref={dropdownRef} className="relative">
                    <button onClick={() => setDropdownOpen(o => !o)} className="p-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-vesta-text-light dark:hover:text-vesta-text-dark rounded-full hover:bg-gray-100 dark:hover:bg-vesta-bg-dark/50 relative">
                        <BellIcon className="w-6 h-6"/>
                        {invitations.length > 0 && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-vesta-red ring-2 ring-white dark:ring-vesta-card-dark"></span>}
                    </button>
                    {isDropdownOpen && <InvitationDropdown invitations={invitations} onRespond={onRespondToInvitation} onClose={() => setDropdownOpen(false)} />}
                </div>
                {actions || defaultActions}
            </div>
        </header>
    );
};

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  navigateTo: NavigateTo;
  activeScreen: Screen;
  currentUser: User;
  onLogout: () => void;
  currentWorkspace: Workspace | null;
  userRole: UserRole;
  onManageMembers: () => void;
  onUpdateWorkspaceName: (workspaceId: string, newName: string) => void;
  invitations: WorkspaceInvitation[];
  onRespondToInvitation: (workspaceId: string, response: 'accept' | 'decline') => void;
  workspaces: Workspace[];
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = (props) => {
    const { children, currentWorkspace } = props;
    
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('vesta-sidebar-collapsed') === 'true');
    const [headerTitleContent, setHeaderTitleContent] = useState<ReactNode | null>(null);
    const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);

    useEffect(() => {
        localStorage.setItem('vesta-sidebar-collapsed', String(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
    
    const contextValue = {
        setTitleContent: (node: ReactNode | null) => setHeaderTitleContent(() => node),
        setActions: (node: ReactNode | null) => setHeaderActions(() => node),
    };

    return (
        <HeaderContext.Provider value={contextValue}>
            <div className="flex h-screen bg-vesta-bg-light dark:bg-vesta-bg-dark">
            <WorkspaceSidebar 
                {...props}
                isSidebarCollapsed={isSidebarCollapsed}
                toggleSidebar={toggleSidebar}
            />
            <div className="flex-1 flex flex-col h-screen overflow-y-hidden">
                {currentWorkspace && (
                    <ContentHeader 
                        {...props} 
                        titleContent={headerTitleContent}
                        actions={headerActions}
                    />
                )}
                <main className="flex-1 overflow-y-auto">
                {children}
                </main>
            </div>
            </div>
        </HeaderContext.Provider>
    );
};

export const CenteredLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-vesta-bg-light dark:bg-vesta-bg-dark font-sans p-4">
        {children}
    </div>
);