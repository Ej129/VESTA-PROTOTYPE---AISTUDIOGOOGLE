import React, { useState, useEffect, useRef } from 'react';
import { Screen, User, DismissalRule, ScreenLayoutProps } from '../types';
import { SidebarMainLayout } from '../components/Layout';
import { UserProfileIcon, BellIcon, BriefcaseIcon, ShieldIcon, LinkIcon, KeyIcon, MoonIcon, SunIcon, TrashIcon, BrainCircuitIcon } from '../components/Icons';

interface SettingsScreenProps extends ScreenLayoutProps {
  dismissalRules: DismissalRule[];
  onDeleteDismissalRule: (id: string) => void;
}

const SettingsCard = ({ title, subtitle, children, footer }: { title: string, subtitle: string, children: React.ReactNode, footer?: React.ReactNode }) => (
    <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-sm border border-border-light dark:border-border-dark">
        <div className="p-6">
            <h3 className="text-lg font-bold text-primary-text-light dark:text-primary-text-dark">{title}</h3>
            <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark mt-1">{subtitle}</p>
        </div>
        <div className="p-6 pt-0 space-y-6">
            {children}
        </div>
        {footer && (
          <div className="bg-gray-50 dark:bg-dark-main px-6 py-4 rounded-b-lg border-t border-border-light dark:border-border-dark text-right">
              {footer}
          </div>
        )}
    </div>
);

const SettingsInput = ({ label, type, id, value, onChange, placeholder, disabled = false }: { label: string, type: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, disabled?: boolean }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-primary-text-light dark:text-primary-text-dark mb-2">{label}</label>
        <input type={type} id={id} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-light-card dark:bg-dark-card text-primary-text-light dark:text-primary-text-dark disabled:bg-gray-100 dark:disabled:bg-gray-800" />
    </div>
);

const SettingsToggle = ({ label, enabled, setEnabled }: { label: string, enabled: boolean, setEnabled: (enabled: boolean) => void }) => (
    <div className="flex items-center justify-between">
        <span className="text-primary-text-light dark:text-primary-text-dark">{label}</span>
        <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-primary-blue' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const ProfileSettings = ({ user }: { user: User }) => {
    const [theme, setTheme] = useState(localStorage.getItem('vesta-theme') || 'light');
    
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('vesta-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('vesta-theme', 'light');
        }
    }, [theme]);
    
    return (
        <div className="space-y-8">
            <SettingsCard title="Personal Information" subtitle="Your profile is managed by our authentication provider.">
                <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : <UserProfileIcon className="w-12 h-12 text-gray-400" />}
                    </div>
                    <div>
                        <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark">To update your picture or name, please visit your identity provider's settings.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SettingsInput label="Full Name" id="name" type="text" value={user.name} onChange={() => {}} disabled />
                    <SettingsInput label="Email Address" id="email" type="email" value={user.email} onChange={() => {}} disabled />
                </div>
            </SettingsCard>
            
            <SettingsCard title="Appearance & Theme" subtitle="Customize how Vesta looks for you.">
                <div className="flex items-center justify-between">
                    <span className="text-primary-text-light dark:text-primary-text-dark">Theme</span>
                    <div className="flex items-center border border-border-light dark:border-border-dark rounded-lg p-1">
                        <button onClick={() => setTheme('light')} className={`px-3 py-1 rounded-md text-sm flex items-center ${theme === 'light' ? 'bg-primary-blue text-white' : 'text-primary-text-light dark:text-primary-text-dark'}`}>
                            <SunIcon className="w-4 h-4 mr-2" /> Light
                        </button>
                         <button onClick={() => setTheme('dark')} className={`px-3 py-1 rounded-md text-sm flex items-center ${theme === 'dark' ? 'bg-primary-blue text-white' : 'text-primary-text-light dark:text-primary-text-dark'}`}>
                            <MoonIcon className="w-4 h-4 mr-2" /> Dark
                        </button>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
};


const NotificationsSettings = () => {
    const [email, setEmail] = useState(true);
    const [inApp, setInApp] = useState(true);
    const [analysisComplete, setAnalysisComplete] = useState(true);
    const [assignedFinding, setAssignedFinding] = useState(true);
    const [reportComment, setReportComment] = useState(false);
    const [weeklySummary, setWeeklySummary] = useState(true);

    return (
        <div className="space-y-8">
            <SettingsCard title="Notification Channels" subtitle="Choose how you receive alerts from Vesta.">
                <SettingsToggle label="Email Notifications" enabled={email} setEnabled={setEmail} />
                <SettingsToggle label="In-App Notifications" enabled={inApp} setEnabled={setInApp} />
            </SettingsCard>
            <SettingsCard title="Event Alerts" subtitle="Select which events you want to be notified about.">
                <SettingsToggle label="When my document analysis is complete" enabled={analysisComplete} setEnabled={setAnalysisComplete} />
                <SettingsToggle label="When a team member assigns a finding to me" enabled={assignedFinding} setEnabled={setAssignedFinding} />
                <SettingsToggle label="When a comment is made on my report" enabled={reportComment} setEnabled={setReportComment} />
                <SettingsToggle label="A weekly summary of all unresolved critical issues" enabled={weeklySummary} setEnabled={setWeeklySummary} />
            </SettingsCard>
        </div>
    );
};

const SecuritySettings = () => (
    <div className="space-y-8">
        <SettingsCard 
            title="Account Security" 
            subtitle="Password and Two-Factor Authentication are managed through your identity provider (e.g., Google, Microsoft, or email)."
        >
            <div className="p-4 text-center bg-light-main dark:bg-dark-main rounded-lg">
                <p className="text-secondary-text-light dark:text-secondary-text-dark">Please manage your security settings directly with your authentication provider for the highest level of security.</p>
            </div>
        </SettingsCard>
    </div>
);

const IntegrationsSettings = () => (
    <div className="space-y-8">
        <SettingsCard title="Project Management" subtitle="Connect to your team's project management tool.">
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-lg">
                    <span className="font-bold text-lg text-primary-text-light dark:text-primary-text-dark">Jira</span>
                    <button className="px-4 py-2 font-semibold text-white bg-primary-blue rounded-lg hover:bg-opacity-90">Connect</button>
                </div>
                <div className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-lg">
                    <span className="font-bold text-lg text-primary-text-light dark:text-primary-text-dark">Asana</span>
                    <button className="px-4 py-2 font-semibold text-white bg-primary-blue rounded-lg hover:bg-opacity-90">Connect</button>
                </div>
                 <div className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-lg">
                    <span className="font-bold text-lg text-primary-text-light dark:text-primary-text-dark">Trello</span>
                    <button className="px-4 py-2 font-semibold text-gray-500 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 rounded-lg cursor-not-allowed">Coming Soon</button>
                </div>
            </div>
        </SettingsCard>
    </div>
);

const AICustomizationSettings = ({ rules, onDeleteRule }: { rules: DismissalRule[], onDeleteRule: (id: string) => void }) => {
    return (
        <SettingsCard
            title="AI Learning & Customization"
            subtitle="Manage the rules Vesta has learned from your feedback."
        >
            {rules.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-border-light dark:border-border-dark">
                            <tr>
                                <th className="p-2 font-semibold text-secondary-text-light dark:text-secondary-text-dark text-sm">Dismissed Finding</th>
                                <th className="p-2 font-semibold text-secondary-text-light dark:text-secondary-text-dark text-sm">Reason</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(rule => (
                                <tr key={rule.id} className="border-b border-border-light dark:border-border-dark last:border-b-0">
                                    <td className="p-2 text-primary-text-light dark:text-primary-text-dark align-top">
                                        <p className="font-medium">{rule.findingTitle}</p>
                                    </td>
                                    <td className="p-2 text-secondary-text-light dark:text-secondary-text-dark align-top">
                                        <span className="px-3 py-1 text-xs font-semibold text-primary-blue bg-primary-blue/10 rounded-full">
                                          {rule.reason}
                                        </span>
                                    </td>
                                    <td className="p-2 text-right align-top">
                                        <button onClick={() => onDeleteRule(rule.id)} aria-label="Forget this rule">
                                            <TrashIcon className="w-5 h-5 text-gray-400 hover:text-accent-critical cursor-pointer" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-8 text-center bg-light-main dark:bg-dark-main rounded-lg">
                    <BrainCircuitIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-semibold text-primary-text-light dark:text-primary-text-dark mt-4">No Custom Rules Yet</h3>
                    <p className="mt-1 text-secondary-text-light dark:text-secondary-text-dark">As you dismiss findings and provide feedback, Vesta will learn. Your custom rules will appear here.</p>
                </div>
            )}
        </SettingsCard>
    );
};


const SettingsScreen: React.FC<SettingsScreenProps> = ({ dismissalRules, onDeleteDismissalRule, ...layoutProps }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const { currentUser } = layoutProps;
    
    const TABS = [
        { id: 'profile', label: 'Profile', icon: <UserProfileIcon className="w-5 h-5 mr-3" /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5 mr-3" /> },
        { id: 'security', label: 'Security', icon: <ShieldIcon className="w-5 h-5 mr-3" /> },
        { id: 'integrations', label: 'Integrations', icon: <LinkIcon className="w-5 h-5 mr-3" /> },
        { id: 'ai', label: 'AI Customization', icon: <BrainCircuitIcon className="w-5 h-5 mr-3" /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileSettings user={currentUser} />;
            case 'notifications': return <NotificationsSettings />;
            case 'security': return <SecuritySettings />;
            case 'integrations': return <IntegrationsSettings />;
            case 'ai': return <AICustomizationSettings rules={dismissalRules} onDeleteRule={onDeleteDismissalRule} />;
            default: return <ProfileSettings user={currentUser} />;
        }
    };

    return (
        <SidebarMainLayout {...layoutProps} activeScreen={Screen.Settings}>
            <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1">
                        <nav className="space-y-1">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-primary-blue text-white'
                                            : 'text-secondary-text-light dark:text-secondary-text-dark hover:bg-gray-200 dark:hover:bg-dark-card'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </aside>
                    <div className="lg:col-span-3">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </SidebarMainLayout>
    );
};

export default SettingsScreen;