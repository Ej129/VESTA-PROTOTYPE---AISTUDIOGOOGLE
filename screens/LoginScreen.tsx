import React from 'react';
import { VestaLogo, GoogleIcon, MicrosoftIcon } from '../components/Icons';
import netlifyIdentity from 'netlify-identity-widget';

const LoginScreen: React.FC = () => {

  const handleLogin = () => {
    netlifyIdentity.open('login');
  };

  const handleSignup = () => {
    netlifyIdentity.open('signup');
  };
  
  const socialButtonClasses = "w-full flex items-center justify-center py-2.5 border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50";

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-main dark:bg-dark-main font-sans">
      <div className="flex w-full max-w-6xl h-[700px] rounded-2xl shadow-2xl overflow-hidden m-4 bg-light-card dark:bg-dark-card">
        {/* Left Column */}
        <div className="w-1/2 hidden md:flex login-bg p-12 flex-col justify-center items-start text-white relative">
          <div className="mb-8">
            <VestaLogo className="w-20 h-20" />
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Vesta:
          </h1>
          <p className="text-4xl font-light mt-2 text-blue-200">
            Fortifying Your Project's Compliance.
          </p>
          <p className="mt-6 text-lg text-blue-300 max-w-md">
            Analyze documents, identify risks, and ensure your projects meet the highest standards of digital resilience.
          </p>
        </div>

        {/* Right Column */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-primary-text-light dark:text-primary-text-dark mb-2">
            Secure Workspace Login
          </h2>
          <p className="text-secondary-text-light dark:text-secondary-text-dark mb-8">
            Access your collaborative analysis dashboard.
          </p>
          
          <div className="space-y-4">
              <button
                onClick={handleLogin}
                className="w-full mt-2 bg-primary-blue text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all duration-200"
              >
                Login Securely
              </button>
               <button
                onClick={handleSignup}
                className="w-full bg-transparent text-primary-blue dark:text-blue-400 font-bold py-3 rounded-lg border-2 border-primary-blue hover:bg-primary-blue/10 transition-all duration-200"
              >
                Create Account
              </button>
          </div>
          
          <div className="flex items-center my-6">
              <hr className="flex-grow border-t border-border-light dark:border-border-dark" />
              <span className="px-4 text-xs text-secondary-text-light dark:text-secondary-text-dark font-semibold">OR</span>
              <hr className="flex-grow border-t border-border-light dark:border-border-dark" />
          </div>
          <div className="space-y-3">
              <button onClick={() => netlifyIdentity.open()} className={socialButtonClasses}>
                  <GoogleIcon className="w-5 h-5 mr-3" />
                  <span className="text-sm font-semibold text-primary-text-light dark:text-primary-text-dark">Sign in with Google</span>
              </button>
                <button onClick={() => netlifyIdentity.open()} className={socialButtonClasses}>
                  <MicrosoftIcon className="w-5 h-5 mr-3" />
                  <span className="text-sm font-semibold text-primary-text-light dark:text-primary-text-dark">Sign in with Microsoft</span>
              </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;