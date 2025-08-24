// src/components/InvitationDropdown.tsx

import React from 'react';
import { WorkspaceInvitation } from '../types';

interface InvitationDropdownProps {
  invitations: WorkspaceInvitation[];
  onRespond: (workspaceId: string, response: 'accept' | 'decline') => void;
  onClose: () => void;
  isCollapsed?: boolean; // Accept the new prop
}

const InvitationDropdown: React.FC<InvitationDropdownProps> = ({ invitations, onRespond, onClose, isCollapsed }) => {
  // --- THE FIX ---
  // We now have smarter positioning.
  // When collapsed, it appears to the right.
  // When expanded, it appears below and aligned to the right edge.
  const positionClasses = isCollapsed
    ? 'top-0 left-full ml-2' 
    : 'top-full right-0 mt-2';

  return (
    <div className={`absolute ${positionClasses} w-80 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-20 border border-gray-200 dark:border-neutral-700`}>
      <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
        <h3 className="font-bold text-gray-800 dark:text-neutral-200">Pending Invitations</h3>
      </div>
      {invitations.length > 0 ? (
        <ul className="max-h-80 overflow-y-auto">
          {invitations.map((inv) => (
            <li key={inv.workspaceId} className="p-4 border-b border-gray-200 dark:border-neutral-700 last:border-b-0">
              <p className="text-sm text-gray-800 dark:text-neutral-200">
                You've been invited to join <span className="font-bold">{inv.workspaceName}</span> as a <span className="font-bold">{inv.role}</span>.
              </p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Invited by: {inv.inviterEmail}</p>
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={() => { onRespond(inv.workspaceId, 'decline'); onClose(); }}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-neutral-200 hover:bg-gray-300 dark:hover:bg-neutral-600"
                >
                  Decline
                </button>
                <button
                  onClick={() => { onRespond(inv.workspaceId, 'accept'); onClose(); }}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-red-700 text-white hover:bg-red-800"
                >
                  Accept
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-neutral-400">No pending invitations.</p>
        </div>
      )}
    </div>
  );
};

export default InvitationDropdown;