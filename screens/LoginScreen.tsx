import React, { useState } from 'react';
import { User } from '../types';
import { VestaLogo, GoogleIcon, MicrosoftIcon } from '../components/Icons';
import * as auth from '../api/auth';
import SocialLoginModal from '../components/SocialLoginModal';

interface LoginScreenProps {
  onLoginSuccess: (user: User, isSocialLogin?: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalProvider, setModalProvider] = useState<'google' | 'microsoft' | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoginView && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);

    try {
      let user: User | null;
      if (isLoginView) {
        user = await auth.login(email, password);
      } else {
        user = await auth.signUp(name, email, password);
      }
      onLoginSuccess(user, false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSocialLoginClick = (provider: 'google' | 'microsoft') => {
    setError('');
    setModalProvider(provider);
  };
  
  const handleSocialLoginSubmit = async (email: string) => {
    setModalProvider(null);
    setIsLoading(true);
    try {
        const user = await auth.socialLogin(email);
        onLoginSuccess(user, true);
    } catch(err) {
        setError((err as Error).message);
    } finally {
        setIsLoading(false);
    }
  };
  
  const inputClasses = "w-full px-4 py-3 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-card dark:bg-dark-card text-primary-text-light dark:text-primary-text-dark placeholder:text-secondary-text-light dark:placeholder:text-secondary-text-dark";
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
            {isLoginView ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="text-secondary-text-light dark:text-secondary-text-dark mb-8">
            Enter your credentials to access your dashboard.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
              {!isLoginView && (
                   <input 
                      type="text" 
                      placeholder="Full Name"
                      id="nameInput"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={inputClasses}
                  />
              )}
              <input 
                  type="email" 
                  placeholder="Corporate Email"
                  id="emailInput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClasses}
              />
              <input 
                  type="password"
                  placeholder="Password"
                  id="passwordInput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClasses}
              />
               {!isLoginView && (
                   <input 
                      type="password" 
                      placeholder="Confirm Password"
                      id="confirmPasswordInput"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className={inputClasses}
                  />
              )}
          
              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 btn-primary font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : (isLoginView ? 'Login Securely' : 'Create Account')}
              </button>
          </form>

          {isLoginView && (
              <>
                  <div className="flex items-center my-6">
                      <hr className="flex-grow border-t border-border-light dark:border-border-dark" />
                      <span className="px-4 text-xs text-secondary-text-light dark:text-secondary-text-dark font-semibold">OR</span>
                      <hr className="flex-grow border-t border-border-light dark:border-border-dark" />
                  </div>
                  <div className="space-y-3">
                      <button onClick={() => handleSocialLoginClick('google')} className={socialButtonClasses} disabled={isLoading}>
                          <GoogleIcon className="w-5 h-5 mr-3" />
                          <span className="text-sm font-semibold text-primary-text-light dark:text-primary-text-dark">Sign in with Google</span>
                      </button>
                       <button onClick={() => handleSocialLoginClick('microsoft')} className={socialButtonClasses} disabled={isLoading}>
                          <MicrosoftIcon className="w-5 h-5 mr-3" />
                          <span className="text-sm font-semibold text-primary-text-light dark:text-primary-text-dark">Sign in with Microsoft</span>
                      </button>
                  </div>
              </>
          )}

          <div className="mt-8 text-sm text-center">
              <button
                  onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
                  className="text-primary-blue dark:text-blue-400 hover:underline cursor-pointer font-medium"
                  disabled={isLoading}
              >
                  {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Login"}
              </button>
          </div>
        </div>
      </div>
      {modalProvider && (
        <SocialLoginModal
          provider={modalProvider}
          onLogin={handleSocialLoginSubmit}
          onClose={() => setModalProvider(null)}
        />
      )}
    </div>
  );
};

export default LoginScreen;