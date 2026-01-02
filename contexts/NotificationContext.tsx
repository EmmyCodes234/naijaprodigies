import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getUnreadCount, subscribeToNotifications, Notification } from '../services/notificationService';
import { useToast } from './ToastContext';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    markAsReadLocally: (amount?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile: currentUser } = useCurrentUser();
    const { addToast } = useToast();
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = async () => {
        if (!currentUser) return;
        const count = await getUnreadCount(currentUser.id);
        setUnreadCount(count);
    };

    const markAsReadLocally = (amount = 1) => {
        setUnreadCount(prev => Math.max(0, prev - amount));
    };

    useEffect(() => {
        if (!currentUser) {
            setUnreadCount(0);
            return;
        }

        // Initial fetch
        refreshUnreadCount();

        // Subscribe
        const unsubscribe = subscribeToNotifications(
            currentUser.id,
            (notification) => {
                setUnreadCount(prev => prev + 1);

                // Show Toast
                let message = '';
                let title = 'New Notification';

                const actorName = notification.actor_name || 'Someone';

                switch (notification.type) {
                    case 'like':
                        message = `${actorName} liked your post`;
                        title = 'New Like';
                        break;
                    case 'comment':
                        message = `${actorName} commented on your post`;
                        title = 'New Comment';
                        break;
                    case 'follow':
                        message = `${actorName} followed you`;
                        title = 'New Follower';
                        break;
                    case 'rerack':
                        message = `${actorName} re-racked your post`;
                        title = 'New Re-Rack';
                        break;
                    case 'mention':
                        message = `${actorName} mentioned you`;
                        title = 'New Mention';
                        break;
                    default:
                        message = 'You have a new notification';
                }

                addToast('info', message, title);
            },
            (error) => {
                console.error('Notification subscription error:', error);
            }
        );

        return () => unsubscribe();
    }, [currentUser, addToast]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, markAsReadLocally }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
