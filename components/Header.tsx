

import React from 'react';
import { ExportIcon } from './Icons';

interface HeaderProps {
  title: string;
  showExportButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showExportButton }) => {
  return (
    <header className="bg-light-card dark:bg-dark-card p-6 border-b border-border-light dark:border-border-dark flex justify-between items-center">
      <h1 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark">{title}</h1>
      <div className="flex items-center space-x-4">
        {showExportButton && (
          <button className="flex items-center px-4 py-2 bg-light-card dark:bg-dark-card border border-border-light dark:border-border-dark rounded-lg text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <ExportIcon className="w-5 h-5 mr-2" />
            Export
          </button>
        )}
      </div>
    </header>
  );
};