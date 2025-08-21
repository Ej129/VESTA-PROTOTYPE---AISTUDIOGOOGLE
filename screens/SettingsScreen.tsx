
import React, { useState, useEffect, useRef } from 'react';
import { Screen, User, DismissalRule, ScreenLayoutProps, CustomRegulation } from '../types';
import { UserProfileIcon, BellIcon, BriefcaseIcon, ShieldIcon, LinkIcon, KeyIcon, MoonIcon, SunIcon, TrashIcon, BrainCircuitIcon, PlusIcon } from '../components/Icons';

interface SettingsScreenProps extends ScreenLayoutProps {
  dismissalRules: DismissalRule[];
  onDeleteDismissalRule: (id: string) => void;
  onUserUpdate: (user: User) => void;
  customRegulations: CustomRegulation[];
  onAddRegulation: (ruleText: string) => void;
  onDeleteRegulation: (regulationId: string) => void;
}

const SettingsCard = ({ title, subtitle, children, footer }: { title: string, subtitle: string, children: React.ReactNode, footer?: React.ReactNode }) => (
    <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-sm border border-vesta-border-light dark:border-vesta-border-dark">
        <div className="p-6">
            <h3 className="text-lg font-bold text-vesta-text-light dark:text-vesta-text-dark">{title}</h3>
            <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-1">{subtitle}</p>
        </div>
        <div className="p-6 pt-0 space-y-6">
            {children}
        </div>
        {footer && (
          <div className="bg-gray-50 dark:bg-vesta-bg-dark px-6 py-4 rounded-b-lg border-t border-vesta-border-light dark:border-vesta-border-dark text-right">
              {footer}
          </div>
        )}
    </div>
);

const SettingsInput = ({ label, type, id, value, onChange, placeholder, disabled = false }: { label: string, type: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, disabled?: boolean }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-vesta-text-light dark:text-vesta-text-dark mb-2">{label}</label>
        <input type={type} id={id} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="w-full px-4 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-card-light dark:bg-vesta-card-dark text-vesta-text-light dark:text-vesta-text-dark disabled:bg-gray-100 dark:disabled:bg-gray-800" />
    </div>
);

const useLocalStorageState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [key, state]);

  return [state, setState];
};

const SettingsToggle = ({ label, enabled, setEnabled }: { label: string, enabled: boolean, setEnabled: (enabled: boolean) => void }) => (
    <div className="flex items-center justify-between">
        <span className="text-vesta-text-light dark:text-vesta-text-dark">{label}</span>
        <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-vesta-red' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const ProfileSettings = ({ user, onUserUpdate }: { user: User, onUserUpdate: (user: User) => void }) => {
    const [theme, setTheme] = useState(localStorage.getItem('vesta-theme') || 'light');
    const [name, setName] = useState(user.name);
    const [profilePic, setProfilePic] = useState<string | null>(user.avatar || null);
    const [currentPassword, setCurrentPassword] = useState('');
    const profilePicInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(user.name);
        setProfilePic(user.avatar || null);
    }, [user]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('vesta-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('vesta-theme', 'light');
        }
    }, [theme]);
    
    const handlePictureUpload = () => profilePicInputRef.current?.click();
    
    const onProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setProfilePic(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = () => {
        onUserUpdate({ ...user, name, avatar: profilePic || undefined });
        alert('Changes Saved!');
    };

    const handleCancel = () => {
        setName(user.name);
        setProfilePic(user.avatar || null);
    }
    
    const handleUpdatePassword = () => {
        if (!currentPassword) {
            alert("Please enter your current password to make changes.");
            return;
        }
        alert("In a real application, password update logic would be handled here.");
    }

    return (
        <div className="space-y-8">
            <SettingsCard title="Personal Information" subtitle="Update your photo and personal details here.">
                <input type="file" accept="image/*" ref={profilePicInputRef} onChange={onProfilePicChange} className="hidden" />
                <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePic ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" /> : <UserProfileIcon className="w-12 h-12 text-gray-400" />}
                    </div>
                    <div className="space-x-2">
                         <button onClick={handlePictureUpload} className="px-4 py-2 text-sm font-semibold text-white bg-vesta-red rounded-lg hover:bg-vesta-red-dark">Upload new picture</button>
                         <button onClick={() => setProfilePic(null)} className="px-4 py-2 text-sm font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Remove</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SettingsInput label="Full Name" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    <SettingsInput label="Email Address" id="email" type="email" value={user.email} onChange={() => {}} disabled />
                </div>
            </SettingsCard>

             <SettingsCard title="Password Management" subtitle="Manage your password for added security.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SettingsInput label="Current Password" id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                    <SettingsInput label="New Password" id="newPassword" type="password" value="" onChange={() => {}} placeholder="Leave blank to keep unchanged" />
                </div>
                 <div className="flex justify-end">
                    <button onClick={handleUpdatePassword} className="px-6 py-2 font-semibold text-white bg-vesta-red rounded-lg hover:bg-vesta-red-dark">Update Password</button>
                </div>
            </SettingsCard>
            
            <SettingsCard title="Appearance & Theme" subtitle="Customize how Vesta looks for you.">
                <div className="flex items-center justify-between">
                    <span className="text-vesta-text-light dark:text-vesta-text-dark">Theme</span>
                    <div className="flex items-center border border-vesta-border-light dark:border-vesta-border-dark rounded-lg p-1">
                        <button onClick={() => setTheme('light')} className={`px-3 py-1 rounded-md text-sm flex items-center ${theme === 'light' ? 'bg-vesta-red text-white' : 'text-vesta-text-light dark:text-vesta-text-dark'}`}>
                            <SunIcon className="w-4 h-4 mr-2" /> Light
                        </button>
                         <button onClick={() => setTheme('dark')} className={`px-3 py-1 rounded-md text-sm flex items-center ${theme === 'dark' ? 'bg-vesta-red text-white' : 'text-vesta-text-light dark:text-vesta-text-dark'}`}>
                            <MoonIcon className="w-4 h-4 mr-2" /> Dark
                        </button>
                    </div>
                </div>
            </SettingsCard>

             <div className="flex justify-end space-x-3">
                <button onClick={handleCancel} className="px-6 py-2 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark bg-vesta-card-light dark:bg-vesta-card-dark border border-vesta-border-light dark:border-vesta-border-dark rounded-lg hover:bg-gray-200 dark:hover:bg-vesta-card-dark">Cancel</button>
                <button onClick={handleSaveChanges} className="px-6 py-2 font-semibold text-white bg-vesta-red rounded-lg hover:bg-vesta-red-dark">Save Changes</button>
            </div>
        </div>
    );
};


const NotificationsSettings = () => {
    const [email, setEmail] = useLocalStorageState('vesta-notif-email', true);
    const [inApp, setInApp] = useLocalStorageState('vesta-notif-inApp', true);
    const [analysisComplete, setAnalysisComplete] = useLocalStorageState('vesta-notif-analysisComplete', true);
    const [assignedFinding, setAssignedFinding] = useLocalStorageState('vesta-notif-assignedFinding', true);
    const [reportComment, setReportComment] = useLocalStorageState('vesta-notif-reportComment', false);
    const [weeklySummary, setWeeklySummary] = useLocalStorageState('vesta-notif-weeklySummary', true);

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

const SecuritySettings = () => {
    const [is2faEnabled, setIs2faEnabled] = useState(false);

    const handle2faToggle = () => {
        if (!is2faEnabled) {
            alert("This would begin the 2FA setup process, likely involving a QR code scan.");
        }
        setIs2faEnabled(!is2faEnabled);
    };

    return (
        <div className="space-y-8">
            <SettingsCard title="Two-Factor Authentication (2FA)" subtitle="Add an extra layer of security to your account.">
                <div className="flex items-center justify-between">
                    <p className="text-vesta-text-light dark:text-vesta-text-dark">{is2faEnabled ? "2FA is currently enabled." : "2FA is currently disabled."}</p>
                    <button onClick={handle2faToggle} className={`px-4 py-2 font-semibold text-white rounded-lg hover:bg-opacity-90 ${is2faEnabled ? 'bg-accent-critical' : 'bg-accent-success'}`}>
                        {is2faEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </button>
                </div>
            </SettingsCard>
        </div>
    );
}

const AICustomizationSettings = ({ rules, onDeleteRule }: { rules: DismissalRule[], onDeleteRule: (id: string) => void }) => {
    return (
        <SettingsCard
            title="AI Learning & Customization"
            subtitle="Manage the rules Vesta has learned from your feedback."
        >
            {rules.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-vesta-border-light dark:border-vesta-border-dark">
                            <tr>
                                <th className="p-2 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Dismissed Finding</th>
                                <th className="p-2 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Reason</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(rule => (
                                <tr key={rule.id} className="border-b border-vesta-border-light dark:border-vesta-border-dark last:border-b-0">
                                    <td className="p-2 text-vesta-text-light dark:text-vesta-text-dark align-top">
                                        <p className="font-medium">{rule.findingTitle}</p>
                                    </td>
                                    <td className="p-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark align-top">
                                        <span className="px-3 py-1 text-xs font-semibold text-vesta-red bg-vesta-red/10 rounded-full">
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
                <div className="p-8 text-center bg-vesta-bg-light dark:bg-vesta-bg-dark rounded-lg">
                    <BrainCircuitIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-semibold text-vesta-text-light dark:text-vesta-text-dark mt-4">No Custom Rules Yet</h3>
                    <p className="mt-1 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">As you dismiss findings and provide feedback, Vesta will learn. Your custom rules will appear here.</p>
                </div>
            )}
        </SettingsCard>
    );
};

const RegulationsSettings = ({ regulations, onAdd, onDelete }: { regulations: CustomRegulation[], onAdd: (ruleText: string) => void, onDelete: (id: string) => void }) => {
    const [newRule, setNewRule] = useState('');

    const handleAddClick = () => {
        if (newRule.trim()) {
            onAdd(newRule.trim());
            setNewRule('');
        }
    };
    
    return (
        <SettingsCard
            title="Custom Regulations"
            subtitle="Define workspace-specific rules that Vesta must check for in every analysis."
        >
            <div className="space-y-4">
                <textarea
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="e.g., All project plans must explicitly mention data encryption standards."
                    className="w-full h-24 p-3 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-bg-light dark:bg-vesta-bg-dark"
                />
                <div className="flex justify-end">
                    <button onClick={handleAddClick} disabled={!newRule.trim()} className="flex items-center px-4 py-2 bg-vesta-red text-white font-semibold rounded-lg hover:bg-vesta-red-dark disabled:opacity-50">
                        <PlusIcon className="w-5 h-5 mr-2" /> Add Rule
                    </button>
                </div>
            </div>

            <div className="space-y-3 mt-6">
                {regulations.map(reg => (
                    <div key={reg.id} className="flex items-center justify-between p-3 bg-vesta-bg-light dark:bg-vesta-bg-dark rounded-lg">
                        <p className="text-sm text-vesta-text-light dark:text-vesta-text-dark flex-1 pr-4">{reg.ruleText}</p>
                        <button onClick={() => onDelete(reg.id)} aria-label="Delete regulation">
                            <TrashIcon className="w-5 h-5 text-gray-400 hover:text-accent-critical" />
                        </button>
                    </div>
                ))}
                {regulations.length === 0 && <p className="text-center text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark py-4">No custom regulations defined.</p>}
            </div>
        </SettingsCard>
    );
}


const SettingsScreen: React.FC<SettingsScreenProps> = ({ dismissalRules, onDeleteDismissalRule, onUserUpdate, customRegulations, onAddRegulation, onDeleteRegulation, currentUser, userRole }) => {
    const [activeTab, setActiveTab] = useState('profile');
    
    const baseTabs = [
        { id: 'profile', label: 'Profile', icon: <UserProfileIcon className="w-5 h-5 mr-3" /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5 mr-3" /> },
        { id: 'security', label: 'Security', icon: <ShieldIcon className="w-5 h-5 mr-3" /> },
        { id: 'ai', label: 'AI Customization', icon: <BrainCircuitIcon className="w-5 h-5 mr-3" /> },
    ];

    const TABS = [...baseTabs];
    if (userRole === 'Administrator') {
        TABS.push({ id: 'regulations', label: 'Custom Regulations', icon: <ShieldIcon className="w-5 h-5 mr-3" /> });
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileSettings user={currentUser} onUserUpdate={onUserUpdate} />;
            case 'notifications': return <NotificationsSettings />;
            case 'security': return <SecuritySettings />;
            case 'ai': return <AICustomizationSettings rules={dismissalRules} onDeleteRule={onDeleteDismissalRule} />;
            case 'regulations': return <RegulationsSettings regulations={customRegulations} onAdd={onAddRegulation} onDelete={onDeleteRegulation} />;
            default: return <ProfileSettings user={currentUser} onUserUpdate={onUserUpdate} />;
        }
    };

    return (
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
                                        ? 'bg-vesta-red text-white'
                                        : 'text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-200 dark:hover:bg-vesta-card-dark'
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
    );
};

export default SettingsScreen;
