import React, { useState, useEffect } from 'react';
import { NavigateTo, Screen, User, UserRole, Workspace } from '../types';
import { VestaLogo, DashboardIcon, HistoryIcon, LibraryIcon, SettingsIcon, LogoutIcon, UsersIcon, BriefcaseIcon, ChevronsLeftIcon, ChevronsRightIcon } from './Icons';

interface SidebarProps {
  navigateTo: NavigateTo;
  activeScreen: Screen;
  currentUser: User;
  onLogout: () => void;
  onBackToWorkspaces: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navigateTo, activeScreen, currentUser, onLogout, onBackToWorkspaces, isSidebarCollapsed, toggleSidebar }) => {
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, screen: Screen.Dashboard },
    { text: 'Audit Trail', icon: <HistoryIcon />, screen: Screen.AuditTrail },
    { text: 'Knowledge Base', icon: <LibraryIcon />, screen: Screen.KnowledgeBase },
    { text: 'Settings', icon: <SettingsIcon />, screen: Screen.Settings },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const tooltipClasses = `absolute left-full ml-4 px-3 py-1.5 text-sm font-semibold text-white bg-vesta-card-dark rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none`;

  return (
    <aside className={`sidebar-bg text-white flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div 
        className="flex items-center justify-center p-4 h-16 border-b border-white/20 cursor-pointer"
        onClick={() => navigateTo(Screen.Dashboard)}
        aria-label="Go to Dashboard"
      >
        <VestaLogo className="w-10 h-10 flex-shrink-0" />
        <h1 className={`text-2xl font-bold ml-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] transition-all duration-200 ease-in-out overflow-hidden ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Vesta</h1>
      </div>

      <div className="p-4">
        <button
            onClick={onBackToWorkspaces}
            className={`relative group flex items-center w-full p-3 cursor-pointer rounded-lg transition-colors duration-200 text-white/80 hover:bg-white/20 ${isSidebarCollapsed ? 'justify-center' : ''}`}
        >
            <BriefcaseIcon className="w-6 h-6 flex-shrink-0"/>
            <span className={`font-bold ml-4 whitespace-nowrap ${isSidebarCollapsed ? 'hidden' : ''}`}>All Workspaces</span>
            {isSidebarCollapsed && <span className={tooltipClasses}>All Workspaces</span>}
        </button>
      </div>
      
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
             <li
              key={item.text}
              onClick={() => navigateTo(item.screen)}
              className={`relative group flex items-center p-3 cursor-pointer rounded-lg transition-colors duration-200 ${
                activeScreen === item.screen
                  ? 'bg-vesta-gold text-vesta-red font-bold'
                  : 'text-white/80 hover:bg-white/20'
              } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <div className="w-6 h-6 flex-shrink-0">{item.icon}</div>
              <span className={`font-bold ml-4 whitespace-nowrap ${isSidebarCollapsed ? 'hidden' : ''}`}>{item.text}</span>
              {isSidebarCollapsed && <span className={tooltipClasses}>{item.text}</span>}
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/20 space-y-2">
          <div 
              onClick={() => navigateTo(Screen.Settings)}
              className={`relative group flex items-center p-2 rounded-lg transition-colors duration-200 hover:bg-white/10 cursor-pointer ${isSidebarCollapsed ? 'justify-center' : ''}`}
              aria-label="Go to your profile settings"
          >
              <div className="w-10 h-10 bg-vesta-gold rounded-full flex items-center justify-center text-vesta-red font-bold text-sm overflow-hidden flex-shrink-0">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(currentUser.name)
                  )}
              </div>
              <div className={`ml-3 overflow-hidden transition-all duration-200 ease-in-out ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  <p className="font-semibold text-white text-sm truncate">{currentUser.name}</p>
                  <p className="text-white/80 text-xs truncate">{currentUser.email}</p>
              </div>
               {isSidebarCollapsed && (
                <div className={`${tooltipClasses} p-2 text-left`}>
                    <p className="font-semibold text-white text-sm">{currentUser.name}</p>
                    <p className="text-white/80 text-xs">{currentUser.email}</p>
                </div>
              )}
          </div>
          <button
              onClick={onLogout}
              className={`relative group flex items-center w-full p-3 cursor-pointer rounded-lg transition-colors duration-200 text-white/80 hover:bg-white/20 ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
              <LogoutIcon className="w-6 h-6 flex-shrink-0"/>
              <span className={`font-bold ml-4 whitespace-nowrap ${isSidebarCollapsed ? 'hidden' : ''}`}>Logout</span>
              {isSidebarCollapsed && <span className={tooltipClasses}>Logout</span>}
          </button>
           <button
            onClick={toggleSidebar}
            className={`flex items-center w-full p-3 cursor-pointer rounded-lg transition-colors duration-200 text-white/80 hover:bg-white/20 ${isSidebarCollapsed ? 'justify-center' : ''}`}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
                <ChevronsRightIcon className="w-6 h-6 flex-shrink-0" />
            ) : (
                <>
                    <ChevronsLeftIcon className="w-6 h-6 flex-shrink-0" />
                    <span className="font-bold ml-4 whitespace-nowrap">Collapse</span>
                </>
            )}
        </button>
      </div>
    </aside>
  );
};

interface HeaderProps {
    workspace: Workspace;
    userRole: UserRole;
    onManageMembers: () => void;
}

const Header: React.FC<HeaderProps> = ({ workspace, userRole, onManageMembers }) => {
  return (
    <header className="bg-vesta-card-light dark:bg-vesta-card-dark h-16 px-6 border-b border-vesta-border-light dark:border-vesta-border-dark flex justify-between items-center flex-shrink-0">
      <h1 className="text-2xl font-bold text-vesta-gold">{workspace.name}</h1>
      <div className="flex items-center space-x-4">
        {userRole === 'Administrator' && (
          <button 
            onClick={onManageMembers}
            className="flex items-center px-4 py-2 bg-transparent border-2 border-vesta-gold rounded-lg text-sm font-bold text-vesta-red hover:bg-vesta-gold hover:text-white transition-colors">
            <UsersIcon className="w-5 h-5 mr-2" />
            Manage Members
          </button>
        )}
      </div>
    </header>
  );
};


interface SidebarMainLayoutProps {
  children: React.ReactNode;
  navigateTo: NavigateTo;
  activeScreen: Screen;
  currentUser: User;
  onLogout: () => void;
  currentWorkspace: Workspace;
  onBackToWorkspaces: () => void;
  userRole: UserRole;
  onManageMembers: () => void;
}

export const SidebarMainLayout: React.FC<SidebarMainLayoutProps> = (props) => {
    const { children, navigateTo, activeScreen, currentUser, onLogout, currentWorkspace, onBackToWorkspaces, userRole, onManageMembers } = props;
    
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('vesta-sidebar-collapsed') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('vesta-sidebar-collapsed', String(isSidebarCollapsed));
        } catch (error) {
            console.error("Failed to save sidebar state to localStorage:", error);
        }
    }, [isSidebarCollapsed]);

    const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

    return (
        <div className="flex h-screen bg-vesta-red">
          <Sidebar 
            navigateTo={navigateTo} 
            activeScreen={activeScreen} 
            currentUser={currentUser} 
            onLogout={onLogout} 
            onBackToWorkspaces={onBackToWorkspaces}
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
          />
          <div className="flex-1 flex flex-col h-screen overflow-y-hidden">
            <Header workspace={currentWorkspace} userRole={userRole} onManageMembers={onManageMembers} />
            <main className="flex-1 overflow-y-auto bg-vesta-bg-light dark:bg-vesta-bg-dark">
              {children}
            </main>
          </div>
        </div>
      );
};

interface CenteredLayoutProps {
    children: React.ReactNode;
}

export const CenteredLayout: React.FC<CenteredLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-vesta-bg-light dark:bg-vesta-bg-dark p-4">
        {children}
    </div>
  );
};
