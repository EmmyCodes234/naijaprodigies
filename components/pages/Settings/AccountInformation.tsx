import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../../Layout/SocialLayout';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getAccountEmail } from '../../../services/userService';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import VerifiedBadge from '../../Shared/VerifiedBadge';

const AccountInformation: React.FC = () => {
    const { profile: currentUser, loading } = useCurrentUser();
    const [email, setEmail] = useState<string | null>(null);
    const [isLoadingEmail, setIsLoadingEmail] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEmail = async () => {
            if (!currentUser) return;
            try {
                const userEmail = await getAccountEmail();
                setEmail(userEmail || null);
            } catch (error) {
                console.error('Failed to fetch email', error);
            } finally {
                setIsLoadingEmail(false);
            }
        };

        if (!loading) {
            fetchEmail();
        }
    }, [currentUser, loading]);

    if (loading || isLoadingEmail) {
        return (
            <SocialLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
                </div>
            </SocialLayout>
        );
    }

    if (!currentUser) return null;

    return (
        <SocialLayout>
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Icon icon="ph:arrow-left-bold" width="20" height="20" />
                </button>
                <h2 className="font-bold text-xl text-gray-900">Account Information</h2>
            </div>

            <div className="p-4 max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Username */}
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Username</p>
                        <div className="flex items-center justify-between">
                            <p className="text-lg text-gray-900 font-medium">@{currentUser.handle}</p>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                        <div className="flex items-center justify-between">
                            <p className="text-lg text-gray-900">{email || 'Not available'}</p>
                        </div>
                    </div>

                    {/* Verified Status */}
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Verified Status</p>
                        <div className="flex items-center gap-2">
                            <p className="text-lg text-gray-900">
                                {currentUser.verified ? 'Verified' : 'Not Verified'}
                            </p>
                            <VerifiedBadge user={currentUser} size={24} />
                        </div>
                    </div>

                    {/* Creation Date */}
                    <div className="p-4">
                        <p className="text-sm font-medium text-gray-500 mb-1">Account Created</p>
                        <p className="text-lg text-gray-900">
                            {format(new Date(currentUser.created_at), 'MMMM d, yyyy')}
                        </p>
                    </div>

                </div>

                <p className="text-xs text-gray-400 mt-4 px-2">
                    To update your username or email, please contact support or use the available edit profile options.
                </p>
            </div>
        </SocialLayout>
    );
};

export default AccountInformation;
