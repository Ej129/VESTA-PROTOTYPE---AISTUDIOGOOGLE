

import React from 'react';
import { Workspace, User, WorkspaceInvitation } from '../types';
import { PlusIcon, VestaLogo, BellIcon, LogoutIcon } from '../components/Icons';
import InvitationDropdown from '../components/InvitationDropdown';

interface WorkspaceCardProps {
  workspace: Workspace;
  onSelect: () => void;
}

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onSelect }) => (
  <button
    onClick={onSelect}
    className="w-full bg-vesta-card-light dark:bg-vesta-card-dark p-6 rounded-xl shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between border border-vesta-border-light dark:border-vesta-border-dark text-left"
  >
    <div>
      <h3 className="font-bold text-lg text-vesta-red dark:text-vesta-gold truncate">{workspace.name}</h3>
      <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-2">
        Created on {new Date(workspace.createdAt).toLocaleDateString()}
      </p>
    </div>
    <div className="mt-4 text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
        Workspace ID: {workspace.id}
    </div>
  </button>
);


interface WorkspaceDashboardProps {
  workspaces: Workspace[];
  currentUser: User;
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onLogout: () => void;
  invitations: WorkspaceInvitation[];
  onRespondToInvitation: (workspaceId: string, response: 'accept' | 'decline') => void;
}

const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  workspaces,
  currentUser,
  onSelectWorkspace,
  onCreateWorkspace,
  onLogout,
  invitations,
  onRespondToInvitation,
}) => {

  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-vesta-bg-light dark:bg-vesta-bg-dark">
      <header className="bg-vesta-card-light dark:bg-vesta-card-dark shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <VestaLogo className="w-10 h-10" />
              <h1 className="ml-4 text-xl font-bold font-display text-vesta-text-light dark:text-vesta-text-dark">Your Workspaces</h1>
            </div>
            <div className="flex items-center space-x-4">
               <div ref={dropdownRef} className="relative">
                <button onClick={() => setDropdownOpen(o => !o)} className="p-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-vesta-text-light dark:hover:text-vesta-text-dark rounded-full hover:bg-gray-100 dark:hover:bg-vesta-bg-dark/50 relative">
                    <BellIcon className="w-6 h-6"/>
                    {invitations.length > 0 && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-vesta-red ring-2 ring-white dark:ring-vesta-card-dark"></span>}
                </button>
                {isDropdownOpen && <InvitationDropdown invitations={invitations} onRespond={onRespondToInvitation} onClose={() => setDropdownOpen(false)} />}
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-vesta-gold rounded-full flex items-center justify-center text-vesta-red font-bold text-sm overflow-hidden flex-shrink-0">
                  {currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" /> : getInitials(currentUser.name)}
                </div>
                <div className="ml-3 text-right">
                  <p className="font-semibold text-sm text-vesta-text-light dark:text-vesta-text-dark truncate">{currentUser.name}</p>
                  <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:text-vesta-red dark:hover:text-vesta-gold"
                title="Logout"
              >
                <LogoutIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark">Select a workspace</h2>
          <button
            onClick={onCreateWorkspace}
            className="flex items-center bg-vesta-red text-white font-bold py-2 px-4 rounded-lg hover:bg-vesta-red-dark transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Workspace
          </button>
        </div>

        {workspaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map(ws => (
              <WorkspaceCard key={ws.id} workspace={ws} onSelect={() => onSelectWorkspace(ws)} />
            ))}
          </div>
        ) : (
          <div className="text-center bg-vesta-card-light dark:bg-vesta-card-dark p-12 rounded-xl border border-vesta-border-light dark:border-vesta-border-dark">
            <h3 className="text-xl font-bold text-vesta-text-light dark:text-vesta-text-dark">No workspaces found</h3>
            <p className="mt-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
              Get started by creating your first workspace.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkspaceDashboard;
