
import React, { useState } from 'react';
import { UserRole } from '../types';

interface InviteUserModalProps {
    onClose: () => void;
    onInvite: (email: string, role: UserRole) => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInvite }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('Member');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onInvite(email, role);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl p-8 max-w-md w-full transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark mb-2">Invite New User</h2>
                <p className="text-secondary-text-light dark:text-secondary-text-dark mb-6">Enter the email address and select a role for the new workspace member.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="invite-email" className="block text-sm font-medium text-primary-text-light dark:text-primary-text-dark mb-2">
                            Email Address
                        </label>
                        <input
                            id="invite-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main text-primary-text-light dark:text-primary-text-dark"
                            placeholder="name@company.com"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="invite-role" className="block text-sm font-medium text-primary-text-light dark:text-primary-text-dark mb-2">
                            Role
                        </label>
                        <select
                            id="invite-role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-main dark:bg-dark-main text-primary-text-light dark:text-primary-text-dark appearance-none bg-no-repeat" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                        >
                            <option value="Member">Member</option>
                            <option value="Compliance Officer">Compliance Officer</option>
                            <option value="Risk Management Officer">Risk Management Officer</option>
                            <option value="Strategy Officer">Strategy Officer</option>
                            <option value="Administrator">Administrator</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-light-main dark:bg-dark-main text-secondary-text-light dark:text-secondary-text-dark font-bold py-2 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-opacity-90 transition-all duration-200 disabled:bg-opacity-50"
                            disabled={!email}
                        >
                            Send Invite
                        </button>
                    </div>
                </form>
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

export default InviteUserModal;