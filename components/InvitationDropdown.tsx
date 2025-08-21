
import React from 'react';
import { WorkspaceInvitation } from '../types';
import { BriefcaseIcon, CheckCircleIcon, XCircleIcon } from './Icons';

interface InvitationDropdownProps {
    invitations: WorkspaceInvitation[];
    onRespond: (workspaceId: string, response: 'accept' | 'decline') => void;
    onClose: () => void;
}

const InvitationDropdown: React.FC<InvitationDropdownProps> = ({ invitations, onRespond, onClose }) => {
    return (
        <div className="absolute right-0 mt-2 w-80 bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-xl z-50 border border-vesta-border-light dark:border-vesta-border-dark animate-fade-in-down">
            <div className="p-4 border-b border-vesta-border-light dark:border-vesta-border-dark">
                <h3 className="font-bold text-vesta-text-light dark:text-vesta-text-dark">Workspace Invitations ({invitations.length})</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
                {invitations.length > 0 ? (
                    invitations.map(inv => (
                        <div key={inv.workspaceId} className="p-4 border-b border-vesta-border-light dark:border-vesta-border-dark last:border-b-0">
                            <div className="flex items-start">
                                <BriefcaseIcon className="w-6 h-6 text-vesta-red mr-3 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-vesta-text-light dark:text-vesta-text-dark">
                                        You've been invited to join <strong className="font-semibold">{inv.workspaceName}</strong> as a {inv.role}.
                                    </p>
                                    <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-1">
                                        Invited by: {inv.inviterEmail}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2 mt-3">
                                <button onClick={() => { onRespond(inv.workspaceId, 'decline'); onClose(); }} className="flex items-center px-3 py-1 text-xs font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md">
                                    <XCircleIcon className="w-4 h-4 mr-1" /> Decline
                                </button>
                                <button onClick={() => { onRespond(inv.workspaceId, 'accept'); onClose(); }} className="flex items-center px-3 py-1 text-xs font-semibold text-white bg-accent-success hover:bg-green-600 rounded-md">
                                    <CheckCircleIcon className="w-4 h-4 mr-1" /> Accept
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="p-8 text-center text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">You have no pending invitations.</p>
                )}
            </div>
            <style>{`
                @keyframes fade-in-down {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default InvitationDropdown;
