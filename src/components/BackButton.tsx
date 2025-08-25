import React from 'react';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const BackButton: React.FC<{ onBack: () => void; title?: string }> = ({ onBack, title }) => (
  <button
    onClick={onBack}
    className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 group"
    title={title || "Back"}
  >
    <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
    <span className="text-sm font-medium">Back</span>
  </button>
);

export default BackButton;
