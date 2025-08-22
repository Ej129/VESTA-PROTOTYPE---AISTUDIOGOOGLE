
import React, { useState } from 'react';
import { Finding, FeedbackReason } from '../types';

interface FeedbackModalProps {
    finding: Finding;
    onClose: () => void;
    onSubmit: (reason: FeedbackReason) => void;
}

const reasons: FeedbackReason[] = [
    "This is a false positive",
    "Not relevant to this project",
    "This is an accepted business risk",
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ finding, onClose, onSubmit }) => {
    const [selectedReason, setSelectedReason] = useState<FeedbackReason | null>(null);

    const handleSubmit = () => {
        if (selectedReason) {
            onSubmit(selectedReason);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={onClose}>
            <div 
                className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-8 max-w-lg w-full transform transition-all animate-fade-in-up" 
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark mb-2">Provide Feedback</h2>
                <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-4">Why are you dismissing this finding?</p>
                <p className="text-sm font-semibold p-3 mb-6 bg-gray-100 dark:bg-vesta-bg-dark rounded-lg border border-vesta-border-light dark:border-vesta-border-dark text-vesta-text-light dark:text-vesta-text-dark">
                    "{finding.title}"
                </p>

                <div className="space-y-4">
                    {reasons.map(reason => (
                        <label key={reason} className="flex items-center p-4 rounded-lg border border-vesta-border-light dark:border-vesta-border-dark cursor-pointer hover:bg-gray-100 dark:hover:bg-vesta-bg-dark transition-colors">
                            <input 
                                type="radio"
                                name="feedback-reason"
                                value={reason}
                                checked={selectedReason === reason}
                                onChange={() => setSelectedReason(reason)}
                                className="w-5 h-5 text-vesta-red bg-gray-100 border-gray-300 focus:ring-vesta-red dark:focus:ring-vesta-red dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <span className="ml-4 text-vesta-text-light dark:text-vesta-text-dark font-medium">{reason}</span>
                        </label>
                    ))}
                </div>
                
                <div className="flex justify-end gap-4 pt-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-vesta-card-dark transition-all text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark border border-transparent"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason}
                        className="bg-vesta-red hover:bg-vesta-red-dark text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit Feedback
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

export default FeedbackModal;