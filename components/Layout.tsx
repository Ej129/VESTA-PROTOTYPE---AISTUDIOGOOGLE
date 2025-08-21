import React, { useState, useEffect, useRef } from 'react';
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
  
  const navRef = useRef<HTMLUListElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

  useEffect(() => {
    if (navRef.current) {
        const activeNode = navRef.current.querySelector(`[data-screen="${activeScreen}"]`) as HTMLLIElement;

        if (activeNode) {
            setIndicatorStyle({
                top: activeNode.offsetTop,
                height: activeNode.offsetHeight,
                opacity: 1,
            });
        }
    }
  }, [activeScreen]);


  return (
    <aside className="w-64 sidebar-bg text-white flex flex-col min-h-screen">
      <div 
        className="flex items-center justify-center p-4 h-16 border-b border-white/20 cursor-pointer"
        onClick={() => navigateTo(Screen.Dashboard)}
        aria-label="Go to Dashboard"
      >
        <VestaLogo className="w-10 h-10" />
        <h1 className="text-2xl font-bold ml-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">Vesta</h1>
      </div>

      <div className="p-4">
        <button
            onClick={onBackToWorkspaces}
            className="flex items-center w-full px-3 py-3 cursor-pointer rounded-lg transition-colors duration-200 text-white/80 hover:bg-white/20"
        >
            <BriefcaseIcon className="w-6 h-6 mr-4"/>
            <span className="font-bold">All Workspaces</span>
        </button>
      </div>
      
      <nav className="flex-1 px-4">
        <ul ref={navRef} className="space-y-2 relative">
          <div 
            className="absolute left-0 w-full bg-vesta-gold rounded-lg transition-all duration-300 ease-in-out"
            style={indicatorStyle}
          />
          {navItems.map((item) => (
             <li
              key={item.text}
              data-screen={item.screen}
              onClick={() => navigateTo(item.screen)}
              className={`relative z-10 flex items-center px-3 py-3 cursor-pointer rounded-lg transition-colors duration-200 ${
                activeScreen === item.screen
                  ? 'text-vesta-red font-bold'
                  : 'text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <div className="w-6 h-6 mr-4">{item.icon}</div>
              <span className="font-bold">{item.text}</span>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/20 space-y-2">
          <div className="flex items-center p-2 rounded-lg transition-colors duration-200 hover:bg-white/10">
              <div className="w-10 h-10 bg-vesta-gold rounded-full flex items-center justify-center text-vesta-red font-bold text-sm overflow-hidden">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(currentUser.name)
                  )}
              </div>
              <div className="ml-3">
                  <p className="font-semibold text-white text-sm">{currentUser.name}</p>
                  <p className="text-white/80 text-xs">{currentUser.email}</p>
              </div>
          </div>
          <button
              onClick={onLogout}
              className="flex items-center w-full px-3 py-3 cursor-pointer rounded-lg transition-colors duration-200 text-white/80 hover:bg-white/20"
          >
              <LogoutIcon className="w-6 h-6 mr-4"/>
              <span className="font-bold">Logout</span>
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
    return (
        <div className="flex h-screen bg-vesta-red">
          <Sidebar 
            navigateTo={navigateTo} 
            activeScreen={activeScreen} 
            currentUser={currentUser} 
            onLogout={onLogout} 
            onBackToWorkspaces={onBackToWorkspaces}
          />
          <div className="flex-1 flex flex-col h-screen overflow-y-hidden">
            <Header workspace={currentWorkspace} userRole={userRole} onManageMembers={onManageMembers} />
            <main key={activeScreen} className="flex-1 overflow-y-auto bg-vesta-bg-light dark:bg-vesta-bg-dark animate-content-fade-in">
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