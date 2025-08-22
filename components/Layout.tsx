

import React, { useState } from 'react';
import { NavigateTo, Screen, User, UserRole, Workspace } from '../types';
import { VestaLogo, DashboardIcon, HistoryIcon, SettingsIcon, UsersIcon, LogoutIcon, ChevronsLeftIcon, BriefcaseIcon, MessageSquareIcon } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
  navigateTo: NavigateTo;
  activeScreen: Screen;
  currentUser: User;
  onLogout: () => void;
  currentWorkspace: Workspace;
  userRole: UserRole;
  onManageMembers: () => void;
  onBackToWorkspaces: () => void;
}

const Sidebar: React.FC<Omit<LayoutProps, 'children'>> = (props) => {
    const { navigateTo, currentUser, onLogout, currentWorkspace, onBackToWorkspaces, activeScreen } = props;
    const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('vesta-sidebar-collapsed') === 'true');

    React.useEffect(() => {
        localStorage.setItem('vesta-sidebar-collapsed', String(isCollapsed));
    }, [isCollapsed]);

    const navItems = [
      { text: 'Analysis', icon: <DashboardIcon className="w-5 h-5" />, screen: Screen.Analysis },
      { text: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" />, screen: Screen.Dashboard },
      { text: 'Audit Trail', icon: <HistoryIcon className="w-5 h-5" />, screen: Screen.AuditTrail },
      { text: 'Knowledge Base', icon: <MessageSquareIcon className="w-5 h-5" />, screen: Screen.KnowledgeBase },
      { text: 'Settings', icon: <SettingsIcon className="w-5 h-5" />, screen: Screen.Settings },
    ];

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
    const tooltipClasses = `absolute left-full ml-2 px-2 py-1 text-xs font-semibold text-white bg-black rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none`;

    return (
      <aside className={`sidebar-bg text-white flex flex-col h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex items-center justify-between p-4 h-16 border-b border-white/20 flex-shrink-0">
          <VestaLogo className={`w-8 h-8 flex-shrink-0 transition-opacity ${isCollapsed ? 'opacity-0' : 'opacity-100'}`} />
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="relative group p-2 rounded-md hover:bg-black/20">
            <ChevronsLeftIcon className="w-5 h-5"/>
            <span className={tooltipClasses}>Collapse</span>
          </button>
        </div>
        
        <div className="p-4 border-b border-white/20">
            <button onClick={onBackToWorkspaces} className={`w-full flex items-center text-sm font-semibold p-2 rounded-lg hover:bg-black/20 text-left ${isCollapsed ? 'justify-center' : ''}`}>
                <BriefcaseIcon className="w-5 h-5 flex-shrink-0" />
                <span className={`ml-3 truncate ${isCollapsed ? 'hidden' : ''}`}>All Workspaces</span>
            </button>
            <div className={`mt-2 ${isCollapsed ? 'text-center' : ''}`}>
                <p className={`text-xs uppercase font-bold text-vesta-gold tracking-wider ${isCollapsed ? 'hidden' : ''}`}>Current Workspace</p>
                <h3 className={`font-bold mt-1 truncate text-white ${isCollapsed ? 'text-xs' : 'text-lg'}`}>{currentWorkspace.name}</h3>
            </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.text} className="relative group">
                <button
                  onClick={() => navigateTo(item.screen)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors text-sm font-semibold ${activeScreen === item.screen ? 'bg-black/30 text-vesta-gold' : 'hover:bg-black/20'} ${isCollapsed ? 'justify-center' : ''}`}
                >
                  {item.icon}
                  <span className={`ml-4 truncate ${isCollapsed ? 'hidden' : ''}`}>{item.text}</span>
                </button>
                {isCollapsed && <span className={tooltipClasses}>{item.text}</span>}
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 bg-black/30 border-t border-white/20 flex-shrink-0">
           <div className={`flex items-center p-2 rounded-lg transition-colors duration-200 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-vesta-gold rounded-full flex items-center justify-center text-vesta-red font-bold text-sm overflow-hidden flex-shrink-0">
                  {currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" /> : getInitials(currentUser.name)}
              </div>
              <div className={`ml-3 overflow-hidden transition-all duration-200 ease-in-out ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  <p className="font-semibold text-white text-sm truncate">{currentUser.name}</p>
                  <button onClick={onLogout} className="text-xs text-gray-400 hover:text-white hover:underline">Logout</button>
              </div>
          </div>
      </div>
      </aside>
    );
};

const Header: React.FC<Omit<LayoutProps, 'children' | 'navigateTo'>> = (props) => {
    const { activeScreen, currentWorkspace, onManageMembers, userRole } = props;

    const screenTitles: { [key in Screen]?: string } = {
        [Screen.Dashboard]: 'Dashboard',
        [Screen.Analysis]: 'Analysis',
        [Screen.AuditTrail]: 'Audit Trail',
        [Screen.KnowledgeBase]: 'Knowledge Base',
        [Screen.Settings]: 'Settings',
    };
    const title = screenTitles[activeScreen] || 'Vesta';

    return (
         <header className="bg-vesta-card-light dark:bg-vesta-card-dark h-16 px-6 border-b border-vesta-border-light dark:border-vesta-border-dark flex justify-between items-center flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark">{title}</h1>
            </div>
            {(userRole === 'Administrator' || userRole === 'Member') && (
                 <button onClick={onManageMembers} className="flex items-center px-4 py-2 bg-vesta-red text-white font-bold rounded-lg hover:bg-vesta-red-dark transition-colors">
                    <UsersIcon className="w-5 h-5 mr-2" />
                    Manage Members
                </button>
            )}
        </header>
    )
}

export const Layout: React.FC<LayoutProps> = (props) => {
    return (
        <div className="flex h-screen bg-vesta-bg-light dark:bg-vesta-bg-dark">
            <Sidebar {...props} />
            <div className="flex-1 flex flex-col overflow-y-hidden">
                <Header {...props} />
                <main className="flex-1 overflow-y-auto">
                    {props.children}
                </main>
            </div>
        </div>
    );
};

export const CenteredLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-vesta-bg-light dark:bg-vesta-bg-dark font-sans p-4">
        {children}
    </div>
);