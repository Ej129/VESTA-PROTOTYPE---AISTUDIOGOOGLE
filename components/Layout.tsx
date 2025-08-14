import React, { useState } from 'react';
import { NavigateTo, Screen, User, Workspace, Invitation, UserRole } from '../types';
import { VestaLogo, DashboardIcon, HistoryIcon, LibraryIcon, SettingsIcon, LogoutIcon, BellIcon, PlusIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon } from './Icons';

// --- Workspace Switcher & Invitations ---
interface WorkspaceSwitcherProps {
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    invitations: Invitation[];
    onSwitchWorkspace: (workspaceId: string) => void;
    onCreateWorkspace: () => void;
    onAcceptInvitation: (invitationId: string) => void;
    onDeclineInvitation: (invitationId: string) => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ workspaces, activeWorkspace, invitations, onSwitchWorkspace, onCreateWorkspace, onAcceptInvitation, onDeclineInvitation }) => {
    const [isSwitcherOpen, setSwitcherOpen] = useState(false);
    const [isInvitesOpen, setInvitesOpen] = useState(false);
    const pendingInvites = invitations.filter(inv => inv.status === 'pending');

    return (
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
            <div className="relative">
                 <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSwitcherOpen(!isSwitcherOpen)}
                        className="flex-grow flex items-center justify-between w-full p-2 text-left rounded-lg hover:bg-gray-200 dark:hover:bg-dark-main"
                    >
                        <div>
                            <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">Workspace</p>
                            <p className="font-bold text-primary-text-light dark:text-primary-text-dark">{activeWorkspace?.name || 'No Workspace'}</p>
                        </div>
                        <ChevronDownIcon className={`w-5 h-5 text-secondary-text-light dark:text-secondary-text-dark transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="relative ml-2">
                        <button onClick={() => setInvitesOpen(!isInvitesOpen)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-main">
                             <BellIcon className="w-6 h-6 text-secondary-text-light dark:text-secondary-text-dark"/>
                             {pendingInvites.length > 0 && (
                                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-light-sidebar dark:ring-dark-sidebar" />
                             )}
                        </button>
                        {isInvitesOpen && (
                             <div className="absolute right-0 mt-2 w-72 bg-light-card dark:bg-dark-card rounded-md shadow-lg z-20 border border-border-light dark:border-border-dark">
                                <div className="p-3 font-semibold text-primary-text-light dark:text-primary-text-dark border-b border-border-light dark:border-border-dark">Pending Invitations</div>
                                {pendingInvites.length > 0 ? (
                                    <ul className="py-1">
                                    {pendingInvites.map(invite => (
                                        <li key={invite.id} className="px-3 py-2">
                                            <p className="text-sm text-primary-text-light dark:text-primary-text-dark">
                                                <span className="font-semibold">{invite.inviterName}</span> invited you to join <span className="font-semibold">{invite.workspaceName}</span>
                                            </p>
                                            <div className="flex items-center justify-end space-x-2 mt-2">
                                                <button onClick={() => onDeclineInvitation(invite.id)} className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><XCircleIcon className="w-5 h-5 text-red-500"/></button>
                                                <button onClick={() => onAcceptInvitation(invite.id)} className="p-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"><CheckCircleIcon className="w-5 h-5 text-green-500"/></button>
                                            </div>
                                        </li>
                                    ))}
                                    </ul>
                                ) : (
                                    <p className="p-3 text-sm text-secondary-text-light dark:text-secondary-text-dark">No pending invitations.</p>
                                )}
                             </div>
                        )}
                    </div>
                </div>

                {isSwitcherOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-light-card dark:bg-dark-card rounded-md shadow-lg z-10 border border-border-light dark:border-border-dark">
                        <ul className="py-1 max-h-48 overflow-y-auto">
                            {workspaces.map(ws => (
                                <li key={ws.id}>
                                    <a onClick={() => { onSwitchWorkspace(ws.id); setSwitcherOpen(false); }} className={`block px-4 py-2 text-sm cursor-pointer ${activeWorkspace?.id === ws.id ? 'font-bold text-primary-blue bg-primary-blue/10' : 'text-primary-text-light dark:text-primary-text-dark hover:bg-light-main dark:hover:bg-dark-main'}`}>
                                        {ws.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <div className="border-t border-border-light dark:border-border-dark">
                            <a onClick={() => { onCreateWorkspace(); setSwitcherOpen(false); }} className="flex items-center px-4 py-2 text-sm text-primary-text-light dark:text-primary-text-dark hover:bg-light-main dark:hover:bg-dark-main cursor-pointer">
                                <PlusIcon className="w-4 h-4 mr-2"/> Create Workspace
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


interface SidebarProps {
  navigateTo: NavigateTo;
  activeScreen: Screen;
  currentUser: User;
  onLogout: () => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  invitations: Invitation[];
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onAcceptInvitation: (invitationId: string) => void;
  onDeclineInvitation: (invitationId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navigateTo, activeScreen, currentUser, onLogout, workspaces, activeWorkspace, invitations, onSwitchWorkspace, onCreateWorkspace, onAcceptInvitation, onDeclineInvitation }) => {
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, screen: Screen.Dashboard },
    { text: 'Audit Trail', icon: <HistoryIcon />, screen: Screen.AuditTrail },
    { text: 'Knowledge Base', icon: <LibraryIcon />, screen: Screen.KnowledgeBase },
    { text: 'Settings', icon: <SettingsIcon />, screen: Screen.Settings },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const handleCreateWorkspace = () => {
      const name = prompt("Enter a name for your new workspace:");
      if (name) {
          onCreateWorkspace(name);
      }
  };

  return (
    <aside className="w-64 bg-light-sidebar dark:bg-dark-sidebar text-white flex flex-col min-h-screen">
      <div 
        className="flex items-center justify-center p-4 h-[65px] border-b border-gray-200 dark:border-white/10 cursor-pointer"
        onClick={() => navigateTo(Screen.Dashboard)}
        aria-label="Go to Dashboard"
      >
        <VestaLogo className="w-10 h-10" />
        <h1 className="text-2xl font-bold ml-3 text-gray-800 dark:text-white">Vesta</h1>
      </div>
      
      <WorkspaceSwitcher 
        workspaces={workspaces} 
        activeWorkspace={activeWorkspace}
        invitations={invitations}
        onSwitchWorkspace={onSwitchWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onAcceptInvitation={onAcceptInvitation}
        onDeclineInvitation={onDeclineInvitation}
      />
      
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => (
             <li
              key={item.text}
              onClick={() => navigateTo(item.screen)}
              className={`flex items-center px-4 py-3 cursor-pointer rounded-lg transition-colors duration-200 ${
                activeScreen === item.screen
                  ? 'bg-primary-blue text-white font-semibold'
                  : 'text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-200 dark:hover:bg-dark-main'
              } ${!activeWorkspace ? 'opacity-50 cursor-not-allowed' : ''}`}
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

interface SidebarMainLayoutProps {
  children: React.ReactNode;
  navigateTo: NavigateTo;
  activeScreen: Screen;
  currentUser: User;
  onLogout: () => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  invitations: Invitation[];
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onAcceptInvitation: (invitationId: string) => void;
  onDeclineInvitation: (invitationId: string) => void;
}

export const SidebarMainLayout: React.FC<SidebarMainLayoutProps> = ({ children, navigateTo, activeScreen, currentUser, onLogout, ...rest }) => {
  return (
    <div className="flex h-screen bg-light-sidebar dark:bg-dark-sidebar">
      <Sidebar 
        navigateTo={navigateTo} 
        activeScreen={activeScreen} 
        currentUser={currentUser} 
        onLogout={onLogout} 
        {...rest}
      />
      <main className="flex-1 h-screen overflow-y-auto bg-light-main dark:bg-dark-main">{children}</main>
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
