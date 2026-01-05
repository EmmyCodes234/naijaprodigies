import React, { useState } from 'react';
import { Icon } from '@iconify/react';

interface NotificationsStepProps {
    onNext: () => void;
    onSkip: () => void;
    isCompleting: boolean;
}

const NotificationsStep: React.FC<NotificationsStepProps> = ({ onNext, onSkip, isCompleting }) => {
    const [isRequesting, setIsRequesting] = useState(false);

    const handleEnableNotifications = async () => {
        setIsRequesting(true);
        try {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            }
        } catch (error) {
            console.error('Failed to request notifications:', error);
        } finally {
            setIsRequesting(false);
            onNext();
        }
    };

    return (
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-8">
                    <div className="w-24 h-24 bg-nsp-teal/10 rounded-full flex items-center justify-center mx-auto">
                        <Icon icon="ph:bell-ringing" width="48" height="48" className="text-nsp-teal" />
                    </div>
                </div>

                {/* Header */}
                <h1 className="text-2xl font-black text-gray-900 mb-3">
                    Turn on notifications
                </h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Get notified when someone follows you, likes your posts, or mentions you in conversations.
                </p>

                {/* Benefits */}
                <div className="text-left space-y-4 mb-10 bg-gray-50 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Icon icon="ph:chat-circle" width="18" height="18" className="text-nsp-teal" />
                        </div>
                        <p className="text-sm text-gray-700">New replies & mentions</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Icon icon="ph:heart" width="18" height="18" className="text-rose-500" />
                        </div>
                        <p className="text-sm text-gray-700">Likes on your posts</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Icon icon="ph:user-plus" width="18" height="18" className="text-blue-500" />
                        </div>
                        <p className="text-sm text-gray-700">New followers</p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleEnableNotifications}
                        disabled={isRequesting || isCompleting}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isRequesting || isCompleting ? (
                            <>
                                <Icon icon="line-md:loading-twotone-loop" width="20" height="20" />
                                {isCompleting ? 'Finishing up...' : 'Enabling...'}
                            </>
                        ) : (
                            'Allow notifications'
                        )}
                    </button>
                    <button
                        onClick={onSkip}
                        disabled={isCompleting}
                        className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors disabled:opacity-50"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationsStep;
