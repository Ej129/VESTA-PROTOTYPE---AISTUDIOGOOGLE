
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { TourStep } from '../types';

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  endTour: () => void;
  addStep: (step: TourStep) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => useContext(TourContext);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);

  const addStep = useCallback((step: TourStep) => {
    // Avoid adding duplicate steps
    setSteps(prevSteps => {
      if (prevSteps.some(s => s.selector === step.selector)) {
        return prevSteps;
      }
      return [...prevSteps, step];
    });
  }, []);

  const startTour = useCallback(() => {
    const isCompleted = localStorage.getItem('vesta-tour-completed');
    if (!isCompleted) {
      setIsActive(true);
      setCurrentStep(0);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, steps]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem('vesta-tour-completed', 'true');
  }, []);

  const value = {
    isActive,
    currentStep,
    steps,
    startTour,
    nextStep,
    endTour,
    addStep
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};