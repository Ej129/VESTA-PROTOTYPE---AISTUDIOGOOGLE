import React from 'react';
import { AlertTriangleIcon } from './Icons';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, confirmText = "Confirm", onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onCancel} aria-modal="true" role="dialog">
      <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-6 max-w-md w-full transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-bold text-vesta-text-light dark:text-vesta-text-dark">{title}</h3>
            <div className="mt-2">
              <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-700 text-base font-medium text-white hover:bg-red-800 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            onClick={() => { onConfirm(); onCancel(); }}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-vesta-border-light dark:border-vesta-border-dark shadow-sm px-4 py-2 bg-vesta-card-light dark:bg-vesta-card-dark text-base font-medium text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-100 dark:hover:bg-neutral-800 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onCancel}
          >
            Cancel
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

export default ConfirmationModal;
