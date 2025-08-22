import React from 'react';
import { VestaLogo } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-vesta-bg-light dark:bg-vesta-bg-dark font-sans">
      <div className="flex w-full max-w-6xl h-[700px] rounded-2xl shadow-2xl overflow-hidden m-4 bg-vesta-card-light dark:bg-vesta-card-dark">
        {/* Left Column */}
        <div className="w-1/2 hidden md:flex login-bg p-12 flex-col justify-center items-start text-white relative">
          <div className="mb-8">
            <VestaLogo className="w-20 h-20" />
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] font-sans">
            Vesta:
          </h1>
          <p className="text-4xl mt-2 text-vesta-gold font-sans">
            Project Compliance Fortification.
          </p>
          <p className="mt-6 text-lg text-white/80 max-w-md font-sans">
            Analyze documents, identify risks, and ensure your projects meet the highest standards of digital resilience.
          </p>
        </div>

        {/* Right Column */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center text-center">
           <h2 className="text-3xl font-bold text-vesta-red dark:text-vesta-gold mb-2 font-sans">
            Welcome to Vesta
          </h2>
          <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-8">
            Securely log in or sign up to access your workspaces.
          </p>
          <button
            onClick={login}
            className="w-full max-w-xs mx-auto mt-2 bg-vesta-red text-white font-bold py-3 rounded-lg hover:bg-vesta-red-dark transition-all duration-200"
          >
            Login or Sign Up
          </button>
           <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-4">
            Powered by Netlify Identity.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;