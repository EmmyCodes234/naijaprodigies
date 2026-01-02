import React from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="px-4 text-gray-500 font-bold text-sm mb-2 uppercase tracking-wide">{title}</h3>
        <div className="bg-white border-y border-gray-100 divide-y divide-gray-100">
            {children}
        </div>
    </div>
);

const SettingsItem: React.FC<{
    icon: string;
    label: string;
    description?: string;
    to?: string;
    onClick?: () => void;
    color?: string;
    isDestructive?: boolean;
}> = ({ icon, label, description, to, onClick, color = "text-gray-500", isDestructive = false }) => {
    const content = (
        <div className="flex items-center gap-4 px-4 py-4 w-full text-left hover:bg-gray-50 transition-colors">
            <Icon icon={icon} width="24" height="24" className={isDestructive ? "text-red-500" : color} />
            <div className="flex-1">
                <p className={`font-medium ${isDestructive ? 'text-red-600' : 'text-gray-900'}`}>{label}</p>
                {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
            </div>
            <Icon icon="ph:caret-right" className="text-gray-300" />
        </div>
    );

    if (to) {
        return <Link to={to} className="block">{content}</Link>;
    }

    return <button onClick={onClick} className="w-full block">{content}</button>;
};

const Settings: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const { logout } = useAuth();

    return (
        <SocialLayout>
            <div className="sticky top-[60px] md:top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
                <h2 className="font-bold text-xl text-gray-900">Settings</h2>
                <p className="text-xs text-gray-500">@{currentUser?.handle}</p>
            </div>

            <div className="bg-gray-50 min-h-screen pb-20 pt-4">
                <SettingsSection title="Your Account">
                    <SettingsItem
                        icon="ph:user-circle"
                        label="Account Information"
                        description="See your account information like your phone number and email address."
                        to={`/profile/${currentUser?.id}`}
                    />
                    <SettingsItem
                        icon="ph:lock-key"
                        label="Change your password"
                        description="Change your password at any time."
                    />
                    <SettingsItem
                        icon="ph:download-simple"
                        label="Download an archive of your data"
                        description="Get insights into the type of information stored for your account."
                    />
                </SettingsSection>

                <SettingsSection title="Security and Access">
                    <SettingsItem
                        icon="ph:shield-check"
                        label="Security"
                        description="Manage your account's security and keep track of your account's usage."
                    />
                    <SettingsItem
                        icon="ph:app-window"
                        label="Apps and Sessions"
                        description="See apps and sessions that you've logged into."
                    />
                    <SettingsItem
                        icon="ph:users"
                        label="Connected Accounts"
                        description="Manage Google or Apple accounts connected to NSP."
                    />
                </SettingsSection>

                <SettingsSection title="Additional Resources">
                    <SettingsItem
                        icon="ph:question"
                        label="Help Center"
                    />
                    <SettingsItem
                        icon="ph:file-text"
                        label="Terms of Service"
                    />
                    <SettingsItem
                        icon="ph:shield"
                        label="Privacy Policy"
                    />
                </SettingsSection>

                <div className="px-4 mt-8">
                    <button
                        onClick={logout}
                        className="w-full py-3 text-red-600 font-bold bg-red-50 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                    >
                        Log out
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-4">
                        NSP Website v1.0.0
                    </p>
                </div>
            </div>
        </SocialLayout>
    );
};

export default Settings;
