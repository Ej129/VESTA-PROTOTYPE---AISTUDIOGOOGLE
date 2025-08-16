
import React from 'react';
import { NavigateTo, Screen, User, UserRole, Workspace } from '../types';
import { VestaLogo, DashboardIcon, HistoryIcon, LibraryIcon, SettingsIcon, LogoutIcon, UsersIcon, BriefcaseIcon } from './Icons';

interface SidebarProps {
  navigateTo: NavigateTo;
  activeScreen: Screen;
  currentUser: User;
  onLogout: () => void;
  onBackToWorkspaces: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navigateTo, activeScreen, currentUser, onLogout, onBackToWorkspaces }) => {
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, screen: Screen.Dashboard },
    { text: 'Audit Trail', icon: <HistoryIcon />, screen: Screen.AuditTrail },
    { text: 'Knowledge Base', icon: <LibraryIcon />, screen: Screen.KnowledgeBase },
    { text: 'Settings', icon: <SettingsIcon />, screen: Screen.Settings },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <aside className="w-64 bg-light-sidebar dark:bg-dark-sidebar text-white flex flex-col min-h-screen">
      <div 
        className="flex items-center justify-center p-4 h-16 border-b border-gray-200 dark:border-white/10 cursor-pointer"
        onClick={() => navigateTo(Screen.Dashboard)}
        aria-label="Go to Dashboard"
      >
        <VestaLogo className="w-10 h-10" />
        <h1 className="text-2xl font-bold ml-3 text-gray-800 dark:text-white">Vesta</h1>
      </div>

      <div className="p-4">
        <button
            onClick={onBackToWorkspaces}
            className="flex items-center w-full px-4 py-3 cursor-pointer rounded-lg transition-colors duration-200 text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-200 dark:hover:bg-dark-main"
        >
            <BriefcaseIcon className="w-6 h-6 mr-4"/>
            <span className="font-medium">All Workspaces</span>
        </button>
      </div>
      
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
             <li
              key={item.text}
              onClick={() => navigateTo(item.screen)}
              className={`flex items-center px-4 py-3 cursor-pointer rounded-lg transition-colors duration-200 ${
                activeScreen === item.screen
                  ? 'bg-primary-blue text-white font-semibold'
                  : 'text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-200 dark:hover:bg-dark-main'
              }`}
            >
              <div className="w-6 h-6 mr-4">{item.icon}</div>
              <span className="font-medium">{item.text}</span>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-2">
          <div className="flex items-center p-2 rounded-lg">
              <div className="w-10 h-10 bg-primary-blue rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(currentUser.name)
                  )}
              </div>
              <div className="ml-3">
                  <p className="font-semibold text-primary-text-light dark:text-primary-text-dark text-sm">{currentUser.name}</p>
                  <p className="text-secondary-text-light dark:text-secondary-text-dark text-xs">{currentUser.email}</p>
              </div>
          </div>
          <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 cursor-pointer rounded-lg transition-colors duration-200 text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-200 dark:hover:bg-dark-main"
          >
              <LogoutIcon className="w-6 h-6 mr-4"/>
              <span className="font-medium">Logout</span>
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
    <header className="bg-light-card dark:bg-dark-card h-16 px-6 border-b border-border-light dark:border-border-dark flex justify-between items-center flex-shrink-0">
      <h1 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark">{workspace.name}</h1>
      <div className="flex items-center space-x-4">
        {userRole === 'Administrator' && (
          <button 
            onClick={onManageMembers}
            className="flex items-center px-4 py-2 bg-light-card dark:bg-dark-card border border-border-light dark:border-border-dark rounded-lg text-sm font-semibold text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-50 dark:hover:bg-dark-main transition">
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
    return (
        <div className="flex h-screen bg-light-sidebar dark:bg-dark-sidebar">
          <Sidebar 
            navigateTo={navigateTo} 
            activeScreen={activeScreen} 
            currentUser={currentUser} 
            onLogout={onLogout} 
            onBackToWorkspaces={onBackToWorkspaces}
          />
          <div className="flex-1 flex flex-col h-screen overflow-y-hidden">
            <Header workspace={currentWorkspace} userRole={userRole} onManageMembers={onManageMembers} />
            <main className="flex-1 overflow-y-auto bg-light-main dark:bg-dark-main">
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-light-main dark:bg-dark-main p-4">
        {children}
    </div>
  );
};