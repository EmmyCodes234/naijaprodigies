import { supabase } from './supabaseClient';
import { User } from '../types';

export interface Notification {
    id: string;
    user_id: string;
    type: 'like' | 'comment' | 'follow' | 'rerack' | 'mention' | 'system';
    actor_id: string;
    post_id?: string;
    comment_id?: string;
    is_read: boolean;
    created_at: string;
    actor_handle?: string;
    actor_name?: string;
    actor_avatar?: string;
    actor_verified?: boolean;
    actor_verification_type?: 'green' | 'gold' | 'grey' | null;
    post_content?: string;
    comment_content?: string;
}

/**
 * Get notifications for a user
 */
export const getNotifications = async (userId: string, limit = 20, offset = 0): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications_with_details')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    // We can use the simpler count query on the table directly instead of the function if we prefer
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
    }
    return count || 0;
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
};

/**
 * Subscribe to new notifications
 */
export const subscribeToNotifications = (
    userId: string,
    onNotification: (notification: Notification) => void,
    onError: (error: any) => void
) => {
    const subscription = supabase
        .channel('public:notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            },
            async (payload) => {
                // Fetch full details for the new notification to display nicely
                // We need to query the view for this specific ID
                const { data, error } = await supabase
                    .from('notifications_with_details')
                    .select('*')
                    .eq('id', payload.new.id)
                    .single();

                if (!error && data) {
                    onNotification(data);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                // console.log('Subscribed to notifications');
            } else if (status === 'CHANNEL_ERROR') {
                onError('Failed to subscribe to notifications');
            }
        });

    return () => {
        supabase.removeChannel(subscription);
    };
};

const PUBLIC_VAPID_KEY = 'BHyiR3nPg303J4wHTB28pWtWjqtgbUbrS-Ls6I-FCKLlZAznA_0dgfGU1hxhvuqfrSx_0lrwR36evRRbHZ4XeZM';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const subscribeToPushNotifications = async (userId: string): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        // Save to Supabase
        const p256dh = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');

        if (!p256dh || !auth) return false;

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh) as any)),
                auth: btoa(String.fromCharCode.apply(null, new Uint8Array(auth) as any)),
                user_agent: navigator.userAgent
            }, { onConflict: 'user_id,endpoint' }); // Assumes unique constraint

        if (error) {
            console.error('Error saving subscription:', error);
            return false;
        }

        return true;
    } catch (error: any) {
        if (error.name === 'InvalidAccessError') {
            console.warn('Push notification subscription failed. The VAPID Public Key appears to be invalid or expired. Please generate a new key pair using web-push.');
            console.warn('Current Key:', PUBLIC_VAPID_KEY);
        } else {
            console.error('Error subscribing to push:', error);
        }
        return false;
    }
};

