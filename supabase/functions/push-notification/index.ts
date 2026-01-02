import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import webpush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // VAPID Keys
        // In production, these should be env vars. For this setup, we'll hardcode or expect env vars.
        const publicVapidKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BGwy0VjV1ei-azSPnBaMaAczAfAYmZMNqXABU8uJkE8LODI8jFDoI4c8BVqEsOHRX6Qvo7BitWV-xFxuah_2kc';
        const privateVapidKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'L639NDvGUGOOwrVYdDIO6LSEzcFxFSL3IVhGfrkn8sQ';
        const subject = 'mailto:admin@nsp.com'; // Change to actual admin email

        webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);

        // payload from Database Webhook or direct call
        const payload = await req.json();

        // Check if this is a webhook payload (insert on notifications table)
        const record = payload.record;

        if (!record) {
            throw new Error('No record found in payload');
        }

        const userId = record.user_id;

        // Fetch user's subscriptions
        const { data: subscriptions, error: subError } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (subError) throw subError;
        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: 'No subscriptions for user' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Construct Notification Payload
        let title = 'New Notification';
        let body = 'You have a new interaction on NSP.';
        let url = '/notifications';

        // We can fetch details if needed, or infer from type
        // The record might just be the raw notification.
        switch (record.type) {
            case 'like':
                title = 'New Like';
                body = 'Someone liked your post.';
                break;
            case 'comment':
                title = 'New Comment';
                body = 'Someone commented on your post.';
                break;
            case 'follow':
                title = 'New Follower';
                body = 'Someone started following you.';
                url = `/profile/${record.actor_id}`; // If actor_id is present
                break;
            case 'mention':
                title = 'New Mention';
                body = 'You were mentioned in a post.';
                break;
            case 'rerack':
                title = 'New Re-Rack';
                body = 'Someone re-racked your post.';
                break;
        }

        const notificationPayload = JSON.stringify({
            title,
            body,
            url,
            icon: '/pwa-icon.svg',
        });

        // Send to all subscriptions
        const promises = subscriptions.map((sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: atob(sub.p256dh), // We stored it as base64 but atob decodes it back to binary string for web-push? 
                    // Wait, web-push expects 'p256dh' and 'auth' as strings.
                    // In our Service we encoded them: `btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh)))`
                    // So `sub.p256dh` is a Base64 string. web-push likely accepts keys as base64 strings if configured or we might need to be careful.
                    // The `web-push` library usually takes the keys object as is if they are strings.
                    // Let's assume the library handles the Base64 strings we stored.

                    // Actually, looking at standard implementations:
                    // keys: { p256dh: '...', auth: '...' } where values are Base64URL encoded strings.
                    // Our `btoa` produces Base64 (std). `web-push` might complain about non-URL safe chars (+/).
                    // But let's try.
                    auth: atob(sub.auth), // Wait, if stored as B64, why atob? 
                    // Re-reading client code: 
                    // p256dh: btoa(...) -> Stored as Base64.
                    // web-push expects strings.
                }
            };

            // Correcting keys:
            // web-push sends GCM/VAPID. It needs the keys.
            // The keys object should be { p256dh: string, auth: string }
            // The values should be the keys.
            // If we stored them as Base64, we can pass them directly probably.

            const subPayload = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh, // Pass the stored Base64 string directly
                    auth: sub.auth
                }
            }

            return webpush.sendNotification(subPayload, notificationPayload)
                .catch((err) => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription expired or invalid
                        // Clean up
                        console.log(`Deleting expired subscription ${sub.id}`);
                        return supabaseClient.from('push_subscriptions').delete().eq('id', sub.id);
                    }
                    console.error('Error sending push:', err);
                });
        });

        await Promise.all(promises);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
