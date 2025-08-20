import React, { useEffect } from 'react';
import { BriefcaseIcon, XCircleIcon } from './Icons';

interface NotificationToastProps {
    message: string;
    workspaceName: string;
    onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, workspaceName, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 8000); // Auto-dismiss after 8 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div 
            className="fixed top-5 right-5 z-[10000] w-full max-w-sm bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-4 border border-vesta-border-light dark:border-vesta-border-dark animate-slide-in"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                    <BriefcaseIcon className="w-6 h-6 text-vesta-red" />
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-bold text-vesta-text-light dark:text-vesta-text-dark">{message}</p>
                    <p className="mt-1 text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark truncate">
                        Workspace: "{workspaceName}"
                    </p>
                    <div className="mt-3 flex space-x-3">
                        <button
                            onClick={onClose}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vesta-red"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={onClose}
                        className="inline-flex text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
                        aria-label="Close"
                    >
                        <XCircleIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
                }
            `}</style>
        </div>
    );
};

export default NotificationToast;