
import React from 'react';
import { sampleReportForTour } from '../data/sample-report';
import { VestaLogo } from './Icons';

interface WelcomeModalProps {
  onStartTour: () => void;
  onSkip: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStartTour, onSkip }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onSkip}>
      <div 
        className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl w-full max-w-lg transform transition-all animate-fade-in-up" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8">
            <VestaLogo className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-center text-vesta-red dark:text-vesta-gold mb-2">Welcome to Vesta</h2>
            <p className="text-center text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-6">
                Let's take a quick tour to see how Vesta can help you fortify your project plans.
            </p>
            <div className="flex justify-center gap-4">
                <button
                    onClick={onSkip}
                    className="px-6 py-2 font-bold rounded-lg text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-200 dark:hover:bg-vesta-card-dark"
                >
                    Skip
                </button>
                <button
                    onClick={onStartTour}
                    className="bg-vesta-red hover:bg-vesta-red-dark text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 shadow-md"
                >
                    Start Tour
                </button>
            </div>
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

export default WelcomeModal;
