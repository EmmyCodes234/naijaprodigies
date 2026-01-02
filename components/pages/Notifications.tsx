import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead, Notification as NotificationModel, subscribeToPushNotifications } from '../../services/notificationService';
import { formatRelativeTime } from '../../utils/dateUtils';
import { useNotification } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';

const NotificationItem: React.FC<{ notification: NotificationModel; onClick: () => void }> = ({ notification, onClick }) => {
    const getIcon = () => {
        switch (notification.type) {
            case 'like': return { icon: 'ph:heart-fill', color: 'text-pink-500' };
            case 'comment': return { icon: 'ph:chat-circle-fill', color: 'text-blue-500' };
            case 'follow': return { icon: 'ph:user-plus-fill', color: 'text-nsp-teal' };
            case 'rerack': return { icon: 'ph:arrows-left-right', color: 'text-green-500' };
            case 'mention': return { icon: 'ph:at', color: 'text-purple-500' };
            default: return { icon: 'ph:bell-fill', color: 'text-gray-500' };
        }
    };

    const { icon, color } = getIcon();

    return (
        <div
            onClick={onClick}
            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
        >
            <div className={`mt-1 ${color}`}>
                <Icon icon={icon} width="24" height="24" />
            </div>

            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <img
                        src={notification.actor_avatar || '/default-avatar.png'}
                        alt={notification.actor_name}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="font-bold text-gray-900">{notification.actor_name}</span>
                    {notification.actor_verified && <Icon icon="ph:seal-check-fill" className="text-green-500" width="14" height="14" />}
                    <span className="text-gray-500 text-sm">@{notification.actor_handle}</span>
                    <span className="text-gray-400 text-sm">· {formatRelativeTime(notification.created_at)}</span>
                </div>

                <p className="text-gray-600 mb-1">
                    {notification.type === 'like' && 'liked your post'}
                    {notification.type === 'comment' && 'commented on your post'}
                    {notification.type === 'follow' && 'followed you'}
                    {notification.type === 'rerack' && 're-racked your post'}
                    {notification.type === 'mention' && 'mentioned you'}
                </p>

                {(notification.post_content || notification.comment_content) && (
                    <p className="text-gray-500 text-sm line-clamp-2">
                        "{notification.comment_content || notification.post_content}"
                    </p>
                )}
            </div>

            {!notification.is_read && (
                <div className="self-center">
                    <div className="w-2 h-2 bg-nsp-teal rounded-full"></div>
                </div>
            )}
        </div>
    );
};

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const { profile: currentUser } = useCurrentUser();
    const { refreshUnreadCount, markAsReadLocally } = useNotification();
    const { addToast } = useToast();

    // Simple state to track if we should show the prompt (can be more robust by checking actual permission)
    const [showPushPrompt, setShowPushPrompt] = useState(Notification.permission === 'default');

    const enablePush = async () => {
        if (!currentUser) return;
        const success = await subscribeToPushNotifications(currentUser.id);
        if (success) {
            addToast('success', 'Push notifications enabled!');
            setShowPushPrompt(false);
        } else {
            addToast('error', 'Failed to enable push notifications. Check your browser settings.');
        }
    };

    const [notifications, setNotifications] = useState<NotificationModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'mentions'>('all');

    useEffect(() => {
        if (currentUser) {
            loadNotifications();
        }
    }, [currentUser]);

    const loadNotifications = async () => {
        if (!currentUser) return;
        try {
            setIsLoading(true);
            const data = await getNotifications(currentUser.id);
            setNotifications(data);
            // We don't verify read here, we let user interact or create a "Mark All Read" button
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotificationClick = async (notification: NotificationModel) => {
        // Navigate based on type
        if (!notification.is_read) {
            // Mark as read in DB and locally
            markAsReadLocally(1); // Update context count
            // Update local list
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            try {
                await markNotificationAsRead(notification.id);
            } catch (e) { console.error(e); }
        }

        if (notification.type === 'follow') {
            navigate(`/profile/${notification.actor_id}`);
        } else if (notification.post_id) {
            navigate(`/post/${notification.post_id}`);
        }
    };

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        try {
            await markAllNotificationsAsRead(currentUser.id);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            refreshUnreadCount(); // Should sync to 0
        } catch (e) {
            console.error('Error marking all as read', e);
        }
    };

    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => n.type === 'mention');

    return (
        <SocialLayout>
            {/* Sticky Header */}
            <div className="sticky top-[60px] md:top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="px-4 py-3 flex items-center justify-between">
                    <h2 className="font-bold text-xl text-gray-900">Notifications</h2>
                    <button onClick={handleMarkAllRead} className="text-nsp-teal text-sm font-bold hover:underline">
                        Mark all read
                    </button>
                </div>

                {showPushPrompt && (
                    <div className="mx-4 mb-2 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Don't miss out!</p>
                            <p className="text-xs text-gray-600">Get push notifications for likes and replies.</p>
                        </div>
                        <button
                            onClick={enablePush}
                            className="bg-nsp-teal text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-nsp-dark-teal transition-colors"
                        >
                            Enable
                        </button>
                    </div>
                )}

                <div className="flex w-full">
                    <button
                        onClick={() => setFilter('all')}
                        className="flex-1 hover:bg-gray-100 transition-colors py-4 relative"
                    >
                        <div className="flex justify-center">
                            <span className={`font-bold ${filter === 'all' ? 'text-gray-900' : 'text-gray-500'}`}>
                                All
                            </span>
                            {filter === 'all' && (
                                <div className="absolute bottom-0 h-1 w-8 bg-nsp-teal rounded-full"></div>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setFilter('mentions')}
                        className="flex-1 hover:bg-gray-100 transition-colors py-4 relative"
                    >
                        <div className="flex justify-center">
                            <span className={`font-bold ${filter === 'mentions' ? 'text-gray-900' : 'text-gray-500'}`}>
                                Mentions
                            </span>
                            {filter === 'mentions' && (
                                <div className="absolute bottom-0 h-1 w-16 bg-nsp-teal rounded-full"></div>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Icon icon="line-md:loading-twotone-loop" width="48" height="48" className="text-nsp-teal" />
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 px-8">
                    <Icon icon="ph:bell-slash" width="64" height="64" className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No notifications yet</h3>
                    <p className="text-gray-500">When someone interacts with your posts, you'll see it here.</p>
                </div>
            ) : (
                <div>
                    {filteredNotifications.map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClick={() => handleNotificationClick(notification)}
                        />
                    ))}
                </div>
            )}
        </SocialLayout>
    );
};

export default Notifications;
