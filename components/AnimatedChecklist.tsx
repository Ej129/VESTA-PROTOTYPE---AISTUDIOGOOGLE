import React, { useState, useEffect } from 'react';
import { CheckCircleIcon } from './Icons';

interface AnimatedChecklistProps {
  steps: string[];
  onComplete?: () => void;
  textColorClass?: string;
  title?: string;
}

export const AnimatedChecklist: React.FC<AnimatedChecklistProps> = ({ steps, onComplete, textColorClass = 'text-primary-text-light dark:text-primary-text-dark', title }) => {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    setVisibleSteps(0); // Reset on steps change
  }, [steps]);

  useEffect(() => {
    if (visibleSteps < steps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(prev => prev + 1);
      }, 750);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      const completionTimer = setTimeout(onComplete, 1000);
      return () => clearTimeout(completionTimer);
    }
  }, [visibleSteps, steps, onComplete]);

  return (
    <div className="text-center p-8 bg-light-card/95 dark:bg-dark-card/95 backdrop-blur-sm rounded-2xl max-w-lg mx-auto border border-border-light dark:border-border-dark">
        {title && <h2 className={`text-2xl font-bold mb-6 ${textColorClass}`}>{title}</h2>}
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-blue mx-auto mb-8"></div>
        <div className="space-y-4 text-left">
            {steps.map((step, index) => (
                <div key={index} className={`flex items-center justify-start text-lg transition-opacity duration-500 ${index < visibleSteps ? 'opacity-100' : 'opacity-0'}`}>
                    <CheckCircleIcon className="w-6 h-6 mr-4 text-accent-success flex-shrink-0" />
                    <span className={textColorClass}>{step}</span>
                </div>
            ))}
        </div>
    </div>
  );
};