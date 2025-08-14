import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { GoogleIcon, MicrosoftIcon, VestaLogo } from '../components/Icons';
import { CenteredLayout } from '../components/Layout';

interface SocialAuthPopupProps {
    provider: 'google' | 'microsoft';
}

const SocialAuthPopup: React.FC<SocialAuthPopupProps> = ({ provider }) => {
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        const timer = setTimeout(() => {
            setStatus('Authenticating...');

            const secondTimer = setTimeout(() => {
                let user: User;
                if (provider === 'google') {
                    user = { name: 'Alex Chen', email: 'alex.chen@gmail.com', avatar: 'https://i.pravatar.cc/150?u=alexchen' };
                } else { // microsoft
                    user = { name: 'Maria Garcia', email: 'maria.garcia@outlook.com', avatar: 'https://i.pravatar.cc/150?u=mariagarcia' };
                }

                if (window.opener) {
                    window.opener.postMessage({ type: 'auth-success', user }, window.location.origin);
                }
                
                setStatus('Success! Redirecting...');

                setTimeout(() => {
                    window.close();
                }, 1000);

            }, 1500);

            return () => clearTimeout(secondTimer);
        }, 1000);

        return () => clearTimeout(timer);
    }, [provider]);

    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    const ProviderIcon = provider === 'google' ? GoogleIcon : MicrosoftIcon;

    return (
        <CenteredLayout>
            <div className="w-full max-w-sm bg-light-card dark:bg-dark-card p-8 rounded-xl shadow-lg text-center">
                 <VestaLogo className="w-20 h-20 mx-auto" />
                 <h2 className="text-2xl font-bold text-primary-blue mt-4">Connecting to {providerName}</h2>
                 <p className="text-secondary-text-light dark:text-secondary-text-dark mt-2 mb-6">
                    Please wait while we securely connect to your account.
                 </p>
                 <div className="flex justify-center items-center space-x-4 my-8">
                    <div className="p-3 bg-gray-100 dark:bg-dark-main rounded-full">
                        <VestaLogo className="w-10 h-10" />
                    </div>
                    <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="p-3 bg-gray-100 dark:bg-dark-main rounded-full">
                        <ProviderIcon className="w-10 h-10" />
                    </div>
                 </div>
                 <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-semibold text-primary-text-light dark:text-primary-text-dark">{status}</p>
                 </div>
            </div>
        </CenteredLayout>
    );
};

export default SocialAuthPopup;