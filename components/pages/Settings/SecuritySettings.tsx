import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../../Layout/SocialLayout';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { updatePassword } from '../../../services/userService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';

const SecuritySettings: React.FC = () => {
    const { profile: currentUser, loading } = useCurrentUser();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        try {
            setIsUpdating(true);
            setError(null);
            await updatePassword(newPassword);
            showToast('Password updated successfully', 'success');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Failed to update password', err);
            setError(err.message || 'Failed to update password');
            showToast('Failed to update password', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
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
                <h2 className="font-bold text-xl text-gray-900">Security</h2>
            </div>

            <div className="p-4 max-w-xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Icon icon="ph:lock-key-fill" className="text-nsp-teal" />
                        Change Password
                    </h3>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 focus:border-nsp-teal"
                                placeholder="Enter new password"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 focus:border-nsp-teal"
                                placeholder="Confirm new password"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <Icon icon="ph:warning-circle-fill" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isUpdating}
                            className={`w-full py-3 rounded-full font-bold text-white transition-all
                ${isUpdating
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-nsp-teal hover:bg-nsp-dark-teal shadow-md hover:shadow-lg'
                                }
              `}
                        >
                            {isUpdating ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Icon icon="ph:info-fill" className="text-blue-500 mt-1 flex-shrink-0" width="20" height="20" />
                        <div>
                            <h4 className="font-bold text-blue-900 text-sm">Security Tip</h4>
                            <p className="text-blue-800 text-sm mt-1">
                                Use a strong password that you don't use on other websites. A mix of letters, numbers, and symbols is recommended.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </SocialLayout>
    );
};

export default SecuritySettings;
