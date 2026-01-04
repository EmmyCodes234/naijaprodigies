import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from './ToastContext';

interface Participant {
    id: string; // participant record id
    user_id: string;
    role: 'host' | 'co-host' | 'speaker' | 'listener';
    status: 'active' | 'left' | 'requested_to_speak';
    raised_hand: boolean;
    is_muted: boolean;
    user?: any; // populated user data
}

interface Reaction {
    id: string;
    userId: string;
    emoji: string;
    timestamp: number;
}

interface Gist {
    id: string;
    host_id: string;
    title: string;
    topic?: string;
    status: 'live' | 'ended' | 'scheduled';
    started_at: string;
    participants_count?: number;
}

interface GistContextType {
    activeGist: Gist | null;
    isMinimized: boolean;
    role: 'host' | 'co-host' | 'speaker' | 'listener' | null;
    participants: Participant[];
    reactions: Reaction[];
    liveGists: Gist[];
    scheduledGists: Gist[];
    startGist: (title: string, topic?: string) => Promise<void>;
    joinGist: (gistId: string) => Promise<void>;
    leaveGist: () => Promise<void>;
    toggleMinimize: () => void;
    raiseHand: () => Promise<void>;
    sendReaction: (emoji: string) => void;
    inviteToSpeak: (userId: string) => Promise<void>;
    promoteToCoHost: (userId: string) => Promise<void>;
    toggleMute: () => Promise<void>;
    scheduleGist: (title: string, scheduledFor: Date, topic?: string, description?: string) => Promise<void>;
    isDiscoveryCollapsed: boolean;
    toggleDiscoveryCollapse: () => void;
    deleteGist: (gistId: string) => Promise<void>;
}

const GistContext = createContext<GistContextType | undefined>(undefined);

export const GistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile: currentUser } = useCurrentUser();
    const { addToast } = useToast();
    const [activeGist, setActiveGist] = useState<Gist | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [role, setRole] = useState<'host' | 'co-host' | 'speaker' | 'listener' | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [isDiscoveryCollapsed, setIsDiscoveryCollapsed] = useState(false);
    const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

    // Persist minimize state if desired, or auto-maximize on new join
    useEffect(() => {
        if (!activeGist) {
            setRole(null);
            setParticipants([]);
        }
    }, [activeGist]);

    const subscribeToGist = useCallback((gistId: string) => {
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }

        const channel = supabase
            .channel(`gist:${gistId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'gist_participants', filter: `gist_id=eq.${gistId}` },
                async (payload) => {
                    fetchParticipants(gistId);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'gists', filter: `id=eq.${gistId}` },
                (payload) => {
                    if (payload.new.status === 'ended') {
                        addToast('info', 'The Gist has ended');
                        leaveGist();
                    }
                }
            )
            .on('broadcast', { event: 'reaction' }, (payload) => {
                const newReaction = {
                    id: Math.random().toString(),
                    userId: payload.payload.userId,
                    emoji: payload.payload.emoji,
                    timestamp: Date.now()
                };
                setReactions(prev => [...prev, newReaction]);
                // Remove reaction after 3 seconds
                setTimeout(() => {
                    setReactions(prev => prev.filter(r => r.id !== newReaction.id));
                }, 3000);
            })
            .subscribe();

        setRealtimeChannel(channel);
        fetchParticipants(gistId);
    }, [addToast, currentUser]);

    const fetchParticipants = async (gistId: string) => {
        const { data, error } = await supabase
            .from('gist_participants')
            .select(`
                *,
                user:users(*)
            `)
            .eq('gist_id', gistId)
            .eq('status', 'active');

        if (error) {
            console.error('Error fetching participants:', error);
            return;
        }
        setParticipants(data || []);

        // Update local role if changed
        const me = (data || []).find((p: any) => p.user_id === currentUser?.id);
        if (me) setRole(me.role);
    };

    const startGist = async (title: string, topic?: string) => {
        if (!currentUser) return;

        try {
            const { data: gist, error: gistError } = await supabase
                .from('gists')
                .insert({
                    host_id: currentUser.id,
                    title,
                    topic,
                    status: 'live'
                })
                .select()
                .single();

            if (gistError) throw gistError;

            const { error: partError } = await supabase
                .from('gist_participants')
                .insert({
                    gist_id: gist.id,
                    user_id: currentUser.id,
                    role: 'host',
                    status: 'active'
                });

            if (partError) throw partError;

            setActiveGist(gist);
            setRole('host');
            setIsMinimized(false);
            subscribeToGist(gist.id);
            addToast('success', 'Gist started!');
        } catch (error) {
            console.error('Failed to start gist', error);
            addToast('error', 'Failed to start Gist');
        }
    };

    const joinGist = async (gistId: string) => {
        if (!currentUser) return;

        try {
            const { data: existing } = await supabase
                .from('gist_participants')
                .select('*')
                .eq('gist_id', gistId)
                .eq('user_id', currentUser.id)
                .single();

            if (existing) {
                await supabase
                    .from('gist_participants')
                    .update({ status: 'active', joined_at: new Date().toISOString() })
                    .eq('id', existing.id);
                setRole(existing.role as any);
            } else {
                await supabase
                    .from('gist_participants')
                    .insert({
                        gist_id: gistId,
                        user_id: currentUser.id,
                        role: 'listener',
                        status: 'active'
                    });
                setRole('listener');
            }

            const { data: gist } = await supabase
                .from('gists')
                .select('*')
                .eq('id', gistId)
                .single();

            if (gist) {
                setActiveGist(gist);
                setIsMinimized(false);
                subscribeToGist(gistId);
            }

        } catch (error) {
            console.error('Failed to join gist', error);
            addToast('error', 'Failed to join Gist');
        }
    };

    const leaveGist = async () => {
        if (!activeGist || !currentUser) {
            setActiveGist(null);
            if (realtimeChannel) supabase.removeChannel(realtimeChannel);
            return;
        }

        try {
            if (role === 'host') {
                await supabase
                    .from('gists')
                    .update({ status: 'ended', ended_at: new Date().toISOString() })
                    .eq('id', activeGist.id);
            } else {
                await supabase
                    .from('gist_participants')
                    .update({ status: 'left' })
                    .eq('gist_id', activeGist.id)
                    .eq('user_id', currentUser.id);
            }
        } catch (error) {
            console.error('Error leaving gist:', error);
        } finally {
            setActiveGist(null);
            setRole(null);
            setIsMinimized(false);
            if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        }
    };

    const toggleMinimize = () => {
        setIsMinimized(prev => !prev);
    };

    const toggleDiscoveryCollapse = () => {
        setIsDiscoveryCollapsed(prev => !prev);
    };

    const sendReaction = (emoji: string) => {
        if (!realtimeChannel || !currentUser) return;
        realtimeChannel.send({
            type: 'broadcast',
            event: 'reaction',
            payload: { userId: currentUser.id, emoji }
        });
    };

    const raiseHand = async () => {
        if (!activeGist || !currentUser) return;
        await supabase
            .from('gist_participants')
            .update({ raised_hand: true, status: 'requested_to_speak' })
            .eq('gist_id', activeGist.id)
            .eq('user_id', currentUser.id);
        addToast('info', 'Request to speak sent');
    };

    const inviteToSpeak = async (userId: string) => {
        if (!activeGist) return;
        await supabase
            .from('gist_participants')
            .update({ role: 'speaker', raised_hand: false, status: 'active' })
            .eq('gist_id', activeGist.id)
            .eq('user_id', userId);
        addToast('success', 'Participant invited to speak');
    };

    const promoteToCoHost = async (userId: string) => {
        if (!activeGist) return;
        await supabase
            .from('gist_participants')
            .update({ role: 'co-host' })
            .eq('gist_id', activeGist.id)
            .eq('user_id', userId);
        addToast('success', 'Participant promoted to Co-host');
    };

    const toggleMute = async () => {
        if (!activeGist || !currentUser) return;

        const myParticipant = participants.find(p => p.user_id === currentUser.id);
        if (!myParticipant) return;

        const newMuteStatus = !myParticipant.is_muted;

        try {
            await supabase
                .from('gist_participants')
                .update({ is_muted: newMuteStatus })
                .eq('gist_id', activeGist.id)
                .eq('user_id', currentUser.id);

            // Optimistic update
            setParticipants(prev => prev.map(p =>
                p.user_id === currentUser.id ? { ...p, is_muted: newMuteStatus } : p
            ));

            addToast('info', newMuteStatus ? 'Microphone muted' : 'Microphone unmuted');
        } catch (error) {
            console.error('Error toggling mute:', error);
            addToast('error', 'Failed to toggle microphone');
        }
    };

    const [liveGists, setLiveGists] = useState<Gist[]>([]);
    const [scheduledGists, setScheduledGists] = useState<Gist[]>([]);

    useEffect(() => {
        fetchDiscoveryGists();

        // Refresh every minute
        const interval = setInterval(fetchDiscoveryGists, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchDiscoveryGists = async () => {
        try {
            // Fetch Live
            const { data: liveData } = await supabase
                .from('gists')
                .select(`
                    *,
                    host:users(*)
                `)
                .eq('status', 'live')
                .order('started_at', { ascending: false });

            setLiveGists(liveData || []);

            // Fetch Scheduled
            const { data: scheduledData } = await supabase
                .from('gists')
                .select(`
                    *,
                    host:users(*)
                `)
                .eq('status', 'scheduled')
                .gte('scheduled_for', new Date().toISOString())
                .order('scheduled_for', { ascending: true });

            setScheduledGists(scheduledData || []);
        } catch (error) {
            console.error('Error fetching discovery gists:', error);
        }
    };

    const scheduleGist = async (title: string, scheduledFor: Date, topic?: string, description?: string) => {
        if (!currentUser) return;
        try {
            const { error } = await supabase
                .from('gists')
                .insert({
                    host_id: currentUser.id,
                    title,
                    topic,
                    description,
                    status: 'scheduled',
                    scheduled_for: scheduledFor.toISOString()
                });

            if (error) throw error;
            addToast('success', 'Gist scheduled successfully!');
            fetchDiscoveryGists();
        } catch (error) {
            console.error('Error scheduling gist:', error);
            addToast('error', 'Failed to schedule Gist');
        }
    };

    const deleteGist = async (gistId: string) => {
        try {
            const { error } = await supabase
                .from('gists')
                .delete()
                .eq('id', gistId);

            if (error) throw error;

            // Optimistic update
            setLiveGists(prev => prev.filter(g => g.id !== gistId));
            setScheduledGists(prev => prev.filter(g => g.id !== gistId));

            addToast('success', 'Gist deleted successfully');

            // If the deleted gist was the active one, clear it
            if (activeGist?.id === gistId) {
                setActiveGist(null);
                setRole(null);
                setIsMinimized(false);
                if (realtimeChannel) supabase.removeChannel(realtimeChannel);
            }

            fetchDiscoveryGists();
        } catch (error) {
            console.error('Error deleting gist:', error);
            addToast('error', 'Failed to delete Gist');
        }
    };

    return (
        <GistContext.Provider value={{
            activeGist,
            isMinimized,
            role,
            participants,
            reactions,
            liveGists,
            scheduledGists,
            startGist,
            joinGist,
            leaveGist,
            toggleMinimize,
            raiseHand,
            sendReaction,
            inviteToSpeak,
            promoteToCoHost,
            toggleMute,
            scheduleGist,
            fetchDiscoveryGists,
            deleteGist,
            isDiscoveryCollapsed,
            toggleDiscoveryCollapse
        }}>
            {children}
        </GistContext.Provider>
    );
};

export const useGist = () => {
    const context = useContext(GistContext);
    if (!context) {
        throw new Error('useGist must be used within a GistProvider');
    }
    return context;
};
