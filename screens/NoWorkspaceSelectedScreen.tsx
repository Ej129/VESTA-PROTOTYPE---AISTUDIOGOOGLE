
import React from 'react';
import { BriefcaseIcon } from '../components/Icons';

const NoWorkspaceSelectedScreen: React.FC<{onCreateWorkspace: () => void}> = ({onCreateWorkspace}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-vesta-bg-light dark:bg-vesta-bg-dark">
            <BriefcaseIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-6" />
            <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark">Select a Workspace</h2>
            <p className="mt-2 max-w-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                Choose a workspace from the list on the left to view its content, or create a new one to get started.
            </p>
             <button 
                onClick={onCreateWorkspace}
                className="mt-6 flex items-center bg-vesta-red text-white font-bold py-2.5 px-5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:bg-vesta-red-dark"
            >
                Create New Workspace
            </button>
        </div>
    );
};

export default NoWorkspaceSelectedScreen;
