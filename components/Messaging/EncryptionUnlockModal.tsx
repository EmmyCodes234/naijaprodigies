import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { recoverKeys } from '../../services/messageService';

interface EncryptionUnlockModalProps {
    isOpen: boolean;
    onClose?: () => void; // Optional close handler
    onSuccess: () => void;
    userId: string;
}

const EncryptionUnlockModal: React.FC<EncryptionUnlockModalProps> = ({ isOpen, onSuccess, userId }) => {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        setLoading(true);
        try {
            const success = await recoverKeys(userId, pin);
            if (success) {
                onSuccess();
            } else {
                setError('Incorrect PIN. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('Unlock failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-nsp-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon icon="ph:lock-open-bold" className="text-nsp-teal" width="32" height="32" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Unlock Messages</h2>
                    <p className="text-gray-500 text-sm mt-2">
                        Enter your PIN to decrypt and access your messages.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nsp-teal/50 focus:border-nsp-teal transition-all text-center tracking-widest text-lg text-gray-900"
                            placeholder="Enter PIN"
                            autoFocus
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
                        disabled={loading || !pin}
                        className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Unlocking...' : 'Unlock'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EncryptionUnlockModal;
