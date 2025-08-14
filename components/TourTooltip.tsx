import React from 'react';
import ReactDOM from 'react-dom';
import { TourStep } from '../types';

interface TourTooltipProps {
  targetElement: HTMLElement;
  step: TourStep;
  onNext: () => void;
  onSkip: () => void;
  nextLabel?: string;
}

const TourTooltip: React.FC<TourTooltipProps> = ({ targetElement, step, onNext, onSkip, nextLabel = 'Next' }) => {
  if (!targetElement) return null;

  const targetRect = targetElement.getBoundingClientRect();

  const getPosition = () => {
    const tooltipHeight = 150; // Approximate height
    const tooltipWidth = 300; // Approximate width
    const offset = 12;

    switch (step.position) {
      case 'bottom':
        return { top: targetRect.bottom + offset, left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2 };
      case 'top':
        return { top: targetRect.top - tooltipHeight - offset, left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2 };
      case 'left':
        return { top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2, left: targetRect.left - tooltipWidth - offset };
      case 'right':
        return { top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2, left: targetRect.right + offset };
      default: // Default to bottom
        return { top: targetRect.bottom + offset, left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2 };
    }
  };
  
  const style: React.CSSProperties = {
    position: 'fixed',
    ...getPosition(),
    width: '300px',
    zIndex: 10000,
    transform: step.position === 'bottom' || step.position === 'top' ? 'translateX(-50%)' : 'translateY(-50%)',
    left: `calc(${targetRect.left + targetRect.width / 2}px)`,
  };

  const content = (
    <div style={style}>
      <div className="bg-primary-blue text-white rounded-lg shadow-2xl p-4 animate-fade-in">
        <h3 className="font-bold text-lg mb-2">{step.title}</h3>
        <p className="text-sm text-gray-200 mb-4">{step.content}</p>
        <div className="flex justify-between items-center">
          <button onClick={onSkip} className="text-xs text-gray-300 hover:underline">Skip Tour</button>
          <button onClick={onNext} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1.5 px-4 rounded-md text-sm transition-all">
            {nextLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default TourTooltip;