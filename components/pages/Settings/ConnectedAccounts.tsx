import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../../Layout/SocialLayout';
import { getConnectedAccounts } from '../../../services/userService';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

const ConnectedAccounts: React.FC = () => {
    const { loading: userLoading } = useCurrentUser();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const identities = await getConnectedAccounts();
                setAccounts(identities);
            } catch (error) {
                console.error('Failed to fetch connected accounts', error);
            } finally {
                setLoading(false);
            }
        };

        if (!userLoading) {
            fetchAccounts();
        }
    }, [userLoading]);

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'google': return 'logos:google-icon';
            case 'github': return 'logos:github-icon';
            case 'discord': return 'logos:discord-icon';
            case 'apple': return 'logos:apple'; // Iconify name for Apple
            case 'twitter': return 'logos:twitter';
            case 'email': return 'ph:envelope-simple-fill';
            default: return 'ph:link-simple-bold';
        }
    };

    const getProviderLabel = (provider: string) => {
        switch (provider) {
            case 'google': return 'Google';
            case 'github': return 'GitHub';
            case 'discord': return 'Discord';
            case 'apple': return 'Apple';
            case 'twitter': return 'X / Twitter';
            case 'email': return 'Email';
            default: return provider.charAt(0).toUpperCase() + provider.slice(1);
        }
    };

    if (loading || userLoading) {
        return (
            <SocialLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
                </div>
            </SocialLayout>
        );
    }

    // Filter out duplicates if any (though identities should be unique by provider)
    // Note: 'email' identity is always present if signed up by email.

    return (
        <SocialLayout>
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Icon icon="ph:arrow-left-bold" width="20" height="20" />
                </button>
                <h2 className="font-bold text-xl text-gray-900">Connected Accounts</h2>
            </div>

            <div className="p-4 max-w-xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {accounts.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {accounts.map((account) => (
                                <div key={account.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                                            <Icon icon={getProviderIcon(account.provider)} width="20" height="20" className={account.provider === 'email' ? 'text-gray-500' : ''} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{getProviderLabel(account.provider)}</p>
                                            <p className="text-xs text-gray-500">
                                                {account.identity_data?.email || account.identity_data?.user_name || 'Connected'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                        <Icon icon="ph:check-circle-fill" />
                                        Connected
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <p>No connected accounts found.</p>
                        </div>
                    )}
                </div>

                <p className="text-xs text-gray-400 mt-4 px-2">
                    These are the accounts you can use to sign in to NSP. To unlink an account, please contact support.
                </p>
            </div>
        </SocialLayout>
    );
};

export default ConnectedAccounts;
