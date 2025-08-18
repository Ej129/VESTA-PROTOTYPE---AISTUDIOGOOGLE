import React, { useState } from 'react';
import { GoogleIcon, MicrosoftIcon } from './Icons';

interface SocialLoginModalProps {
  provider: 'google' | 'microsoft';
  onLogin: (email: string) => void;
  onClose: () => void;
}

const SocialLoginModal: React.FC<SocialLoginModalProps> = ({ provider, onLogin, onClose }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin(email);
    }
  };

  const googleModal = (
    <>
      <GoogleIcon className="w-12 h-12 mx-auto" />
      <h2 className="text-2xl font-normal text-center text-gray-800 dark:text-white mt-4">Sign in</h2>
      <p className="text-center text-gray-600 dark:text-gray-300 mt-2 mb-8">Use your Google Account</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email or phone"
          required
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-vesta-text-light dark:text-vesta-text-dark"
          autoFocus
        />
        <button type="button" className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2 hover:underline">
          Forgot email?
        </button>
        <div className="flex justify-between items-center mt-8">
          <button type="button" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Create account
          </button>
          <button
            type="submit"
            disabled={!email.trim()}
            className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </form>
    </>
  );

  const microsoftModal = (
    <>
      <MicrosoftIcon className="w-8 h-8" />
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mt-4">Sign in</h2>
      <form onSubmit={handleSubmit} className="mt-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email, phone, or Skype"
          required
          className="w-full px-3 py-2 border-b-2 border-gray-500 focus:outline-none focus:border-blue-600 bg-transparent text-vesta-text-light dark:text-vesta-text-dark"
          autoFocus
        />
        <div className="text-sm mt-4">
          <span>No account? </span>
          <button type="button" className="text-blue-600 dark:text-blue-400 hover:underline">Create one!</button>
        </div>
        <div className="text-sm mt-2">
           <button type="button" className="text-blue-600 dark:text-blue-400 hover:underline">Sign-in options</button>
        </div>
        <div className="flex justify-end items-center mt-8 space-x-4">
           <button
            type="button"
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-1.5 px-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!email.trim()}
            className="bg-blue-600 text-white font-semibold py-1.5 px-6 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-xl p-8 max-w-sm w-full transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
        {provider === 'google' ? googleModal : microsoftModal}
      </div>
       <style>{`
            @keyframes fade-in-up {
                0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
        `}</style>
    </div>
  );
};

export default SocialLoginModal;