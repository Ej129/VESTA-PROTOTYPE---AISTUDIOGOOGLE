// src/components/ConfirmationModal.tsx

import React, { useState } from 'react';
import { AlertTriangleIcon } from './Icons';

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel, confirmText = "Confirm" }) => {
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirmClick = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
            // After the async onConfirm is successful, call onCancel to close the modal.
            onCancel(); 
        } catch (error) {
            console.error("Confirmation action failed:", error);
            // The parent will show an alert, so we just reset the button state.
            setIsConfirming(false);
        }
    };

    return (
        // The overlay is now part of this component's logic
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangleIcon className="h-6 w-6 text-red-700 dark:text-red-500" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-neutral-100" id="modal-title">
                        {title}
                    </h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-neutral-400">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-700 text-base font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50"
                    onClick={handleConfirmClick}
                    disabled={isConfirming}
                >
                    {isConfirming ? 'Processing...' : confirmText}
                </button>
                <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-600 shadow-sm px-4 py-2 bg-white dark:bg-neutral-800 text-base font-medium text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onCancel}
                    disabled={isConfirming} // Also disable cancel while processing
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ConfirmationModal;