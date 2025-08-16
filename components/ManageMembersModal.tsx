
import React, { useState } from 'react';
import { WorkspaceMember, UserRole } from '../types';
import { TrashIcon, ChevronDownIcon, PlusIcon } from './Icons';

interface ManageMembersModalProps {
  onClose: () => void;
  currentMembers: WorkspaceMember[];
  currentUserEmail: string;
  onInviteUser: (email: string, role: UserRole) => void;
  onRemoveUser: (email: string) => void;
  onUpdateRole: (email: string, role: UserRole) => void;
}

const MemberRow: React.FC<{
    member: WorkspaceMember;
    isCurrentUser: boolean;
    isLastAdmin: boolean;
    onRemove: () => void;
    onRoleChange: (newRole: UserRole) => void;
}> = ({ member, isCurrentUser, isLastAdmin, onRemove, onRoleChange }) => {
    
    const getInitials = (email: string) => {
        const name = email.split('@')[0];
        return name.slice(0, 2).toUpperCase();
    }
    
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
                <div className="w-9 h-9 bg-primary-blue rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(member.email)}
                </div>
                <div className="ml-3">
                    <p className="font-semibold text-primary-text-light dark:text-primary-text-dark text-sm">{member.email}</p>
                    <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">{isCurrentUser ? 'You' : ''}</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <select
                    value={member.role}
                    onChange={(e) => onRoleChange(e.target.value as UserRole)}
                    disabled={isLastAdmin}
                    className="px-3 py-1 border border-border-light dark:border-border-dark rounded-md text-sm bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-blue disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <option value="Administrator">Administrator</option>
                    <option value="Risk Management Officer">Risk Management Officer</option>
                    <option value="Strategy Officer">Strategy Officer</option>
                    <option value="Member">Member</option>
                </select>
                <button
                    onClick={onRemove}
                    disabled={isLastAdmin}
                    className="p-2 text-secondary-text-light dark:text-secondary-text-dark hover:text-accent-critical dark:hover:text-accent-critical disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Remove member"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ onClose, currentMembers, currentUserEmail, onInviteUser, onRemoveUser, onUpdateRole }) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('Member');
    
    const adminCount = currentMembers.filter(m => m.role === 'Administrator').length;

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if(!inviteEmail.trim()) return;
        onInviteUser(inviteEmail, inviteRole);
        setInviteEmail('');
        setInviteRole('Member');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl p-8 max-w-lg w-full transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark mb-2">Manage Members</h2>
                <p className="text-secondary-text-light dark:text-secondary-text-dark mb-6">Invite new members and manage roles for your workspace.</p>

                {/* Invite Section */}
                <form onSubmit={handleInvite} className="bg-light-main dark:bg-dark-main p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 text-primary-text-light dark:text-primary-text-dark">Invite a new member</h3>
                    <div className="flex items-center space-x-2">
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="flex-grow px-3 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-card dark:bg-dark-card"
                            required
                        />
                         <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as UserRole)}
                            className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        >
                            <option value="Administrator">Administrator</option>
                            <option value="Risk Management Officer">Risk Management Officer</option>
                            <option value="Strategy Officer">Strategy Officer</option>
                            <option value="Member">Member</option>
                        </select>
                        <button type="submit" className="bg-primary-blue text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-1" /> Invite
                        </button>
                    </div>
                </form>

                {/* Member List */}
                <div className="mt-6">
                    <h3 className="font-semibold text-primary-text-light dark:text-primary-text-dark">{currentMembers.length} Members</h3>
                    <div className="mt-2 max-h-64 overflow-y-auto pr-2 divide-y divide-border-light dark:divide-border-dark">
                        {currentMembers.map(member => (
                            <MemberRow 
                                key={member.email}
                                member={member}
                                isCurrentUser={member.email === currentUserEmail}
                                isLastAdmin={member.role === 'Administrator' && adminCount === 1}
                                onRemove={() => onRemoveUser(member.email)}
                                onRoleChange={(newRole) => onUpdateRole(member.email, newRole)}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-primary-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ManageMembersModal;