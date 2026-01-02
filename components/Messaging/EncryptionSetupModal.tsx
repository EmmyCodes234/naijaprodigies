import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { setupKeys } from '../../services/messageService';

interface EncryptionSetupModalProps {
    isOpen: boolean;
    onClose: () => void; // Usually strictly blocking, but maybe allow close?
    onSuccess: () => void;
    userId: string;
}

const EncryptionSetupModal: React.FC<EncryptionSetupModalProps> = ({ isOpen, onSuccess, userId }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (pin.length < 4) {
            setError('PIN must be at least 4 characters');
            return;
        }

        if (pin !== confirmPin) {
            setError('PINs do not match');
            return;
        }

        setLoading(true);
        try {
            await setupKeys(userId, pin);
            onSuccess();
        } catch (err) {
            console.error(err);
            setError('Failed to setup keys. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-nsp-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon icon="ph:lock-key-bold" className="text-nsp-teal" width="32" height="32" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Secure Your Messages</h2>
                    <p className="text-gray-500 text-sm mt-2">
                        Create a secure PIN to encrypt your messages. You will need this PIN to access your messages on other devices.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Create PIN</label>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nsp-teal/50 focus:border-nsp-teal transition-all"
                            placeholder="Enter a secure PIN"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                        <input
                            type="password"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nsp-teal/50 focus:border-nsp-teal transition-all"
                            placeholder="Repeat your PIN"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                            <Icon icon="ph:warning-circle-bold" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !pin || !confirmPin}
                        className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Setting up security...' : 'Enable Encryption'}
                    </button>

                    <p className="text-xs text-center text-gray-400 mt-4">
                        Do not lose this PIN. It cannot be reset.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default EncryptionSetupModal;
