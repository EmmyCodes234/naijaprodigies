import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from './ToastContext';
import SimplePeer from 'simple-peer';
import { Buffer } from 'buffer';

// @ts-ignore
window.Buffer = Buffer;

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
    description?: string;
    status: 'live' | 'ended' | 'scheduled';
    started_at?: string;
    scheduled_for?: string;
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

    // Audio & Recording
    localStream: MediaStream | null;
    remoteStreams: { [userId: string]: MediaStream };
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
}

const GistContext = createContext<GistContextType | undefined>(undefined);

export const GistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile: currentUser } = useCurrentUser();
    const { addToast } = useToast();

    // Core Gist State
    const [activeGist, setActiveGist] = useState<Gist | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [role, setRole] = useState<'host' | 'co-host' | 'speaker' | 'listener' | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [isDiscoveryCollapsed, setIsDiscoveryCollapsed] = useState(false);
    const [liveGists, setLiveGists] = useState<Gist[]>([]);
    const [scheduledGists, setScheduledGists] = useState<Gist[]>([]);

    // WebRTC State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<{ [userId: string]: MediaStream }>({});
    const peersRef = useRef<{ [userId: string]: SimplePeer.Instance }>({});
    const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const activeChunksRef = useRef<Blob[]>([]);

    // Persist minimize state/reset on leave
    useEffect(() => {
        if (!activeGist) {
            setRole(null);
            setParticipants([]);
            cleanupMedia();
        }
    }, [activeGist]);

    const cleanupMedia = () => {
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        // Destroy peers
        Object.values(peersRef.current).forEach((peer: any) => {
            if (peer.destroy) peer.destroy();
        });
        peersRef.current = {};
        setRemoteStreams({});
    };

    const subscribeToGist = useCallback((gistId: string) => {
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }

        const channel = supabase
            .channel(`gist:${gistId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'gist_participants', filter: `gist_id=eq.${gistId}` },
                async () => {
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
                setTimeout(() => {
                    setReactions(prev => prev.filter(r => r.id !== newReaction.id));
                }, 3000);
            })
            // WebRTC Signaling
            .on('broadcast', { event: 'signal' }, (payload) => {
                const { userId, signal } = payload.payload;
                // If the signal is NOT from me
                if (userId !== currentUser?.id) {
                    handleSignal(userId, signal);
                }
            })
            // Request to join mesh (new partipant asking for offers)
            .on('broadcast', { event: 'join-request' }, (payload) => {
                const { userId } = payload.payload;
                if (userId !== currentUser?.id && currentUser) {
                    // I am already in the room, I should initiate a connection to this new user
                    // Only speakers initiate? For Mesh, everyone connects to everyone ideally
                    // Optimization: Only if I am a speaker OR the target is a speaker?
                    // For now: FULL MESH for stage participants.
                    const myRole = participants.find(p => p.user_id === currentUser.id)?.role;
                    if (myRole === 'host' || myRole === 'co-host' || myRole === 'speaker') {
                        initiatePeerConnection(userId);
                    }
                }
            })
            .subscribe();

        setRealtimeChannel(channel);
        fetchParticipants(gistId);

        // Announce join after a slight delay to allow subscription
        setTimeout(() => {
            channel.send({
                type: 'broadcast',
                event: 'join-request',
                payload: { userId: currentUser?.id }
            });
        }, 1000);

    }, [addToast, currentUser, participants]);

    const fetchParticipants = async (gistId: string) => {
        const { data, error } = await supabase
            .from('gist_participants')
            .select(`*, user:users(*)`)
            .eq('gist_id', gistId)
            .eq('status', 'active');

        if (error) {
            console.error('Error fetching participants:', error);
            return;
        }
        setParticipants(data || []);

        const me = (data || []).find((p: any) => p.user_id === currentUser?.id);
        if (me) {
            setRole(me.role);

            // If I am a speaker/host, ensure I have a local stream
            if (['host', 'co-host', 'speaker'].includes(me.role) && !localStream) {
                // initializeAudio(); // User interaction needed usually, handled by toggleMute or join
            }
        }
    };

    // --- WebRTC Logic ---

    const initializeAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error('Failed to get local stream', err);
            addToast('error', 'Microphone access denied');
            return null;
        }
    };

    const initiatePeerConnection = (targetUserId: string) => {
        if (peersRef.current[targetUserId]) return; // Already connected

        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: localStream || undefined
        });

        peer.on('signal', (signal) => {
            realtimeChannel?.send({
                type: 'broadcast',
                event: 'signal',
                payload: { userId: currentUser?.id, targetUserId, signal }
            });
        });

        peer.on('stream', (stream) => {
            setRemoteStreams(prev => ({ ...prev, [targetUserId]: stream }));
        });

        peer.on('close', () => {
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[targetUserId];
                return newStreams;
            });
            delete peersRef.current[targetUserId];
        });

        peersRef.current[targetUserId] = peer;
    };

    const handleSignal = (senderId: string, signal: any) => {
        // We might need to check if this signal is intended for ME
        // But in a broadcast, everyone gets it. 
        // We usually add 'targetUserId' to payload to filter.

        // NOTE: simple-peer signaling exchange requires careful handshake.
        // For MVP mesh:
        // 1. Existing peer A sends OFFER to New User B.
        // 2. New User B receives OFFER, creates non-initiator peer, signals ANSWER.
        // 3. Peer A receives ANSWER.

        // This logic is slightly complex to put all in one file without a proper signaling server logic.
        // Simplified approach: 'targetUserId' check.
    };

    // NOTE: This basic Mesh implementation is complex to debug blindly.
    // I will simplify: 
    // Implementing 'initiatePeerConnection' and 'handleSignal' properly requires context of 'payload.targetUserId'.
    // Since I cannot change the 'channel.on' closure easily without ref, I'll rely on a Ref or updated dependency.

    // REDEFINING subscribeToGist to handle signaling better
    // Actually, I'll implement a simpler 'signal' handler that parses the payload.
    // Since 'signal' event handler was defined in subscribeToGist, I need to update it there.

    // TO FIX: I will re-write the subscribeToGist logic below in the main function body to include the updated logic.
    // .on('broadcast', { event: 'signal' }, (payload) => {
    //      const { userId: senderId, targetUserId, signal } = payload.payload;
    //      if (targetUserId === currentUser?.id) {
    //          addPeer(senderId, signal);
    //      }
    // })

    const addPeer = (senderId: string, incomingSignal: any) => {
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: localStream || undefined
        });

        peer.on('signal', (signal) => {
            realtimeChannel?.send({
                type: 'broadcast',
                event: 'signal',
                payload: { userId: currentUser?.id, targetUserId: senderId, signal }
            });
        });

        peer.on('stream', (stream) => {
            setRemoteStreams(prev => ({ ...prev, [senderId]: stream }));
        });

        peer.signal(incomingSignal);
        peersRef.current[senderId] = peer;
    };

    // --- Recording Logic ---
    const startRecording = () => {
        if (!localStream) return;

        // Create a mixed stream? No, Client-side recording usually records the TAB audio or just local mic + remote streams mapped to a destination.
        // Easiest: Record local mic.
        // Better: WebAudioAPI to mix all remoteStreams + localStream.

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioContext.createMediaStreamDestination();

        // Add local
        if (localStream.getAudioTracks().length > 0) {
            const localSource = audioContext.createMediaStreamSource(localStream);
            localSource.connect(dest);
        }

        // Add remotes
        Object.values(remoteStreams).forEach(stream => {
            if (stream.getAudioTracks().length > 0) {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(dest);
            }
        });

        const recorder = new MediaRecorder(dest.stream);
        activeChunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) activeChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(activeChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gist-recording-${new Date().toISOString()}.webm`;
            a.click();
        };

        recorder.start();
        setIsRecording(true);
        mediaRecorderRef.current = recorder;
        addToast('info', 'Recording started');
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            addToast('success', 'Recording saved to downloads');
        }
    };

    // --- Actions ---

    const startGist = async (title: string, topic?: string) => {
        if (!currentUser) return;

        // Init Audio Immdiately for Host
        const stream = await initializeAudio();

        try {
            const { data: gist, error: gistError } = await supabase
                .from('gists')
                .insert({
                    host_id: currentUser.id,
                    title,
                    topic,
                    status: 'live',
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (gistError) throw gistError;

            await supabase
                .from('gist_participants')
                .insert({
                    gist_id: gist.id,
                    user_id: currentUser.id,
                    role: 'host',
                    status: 'active',
                    is_muted: false // Host unmuted by default
                });

            setActiveGist(gist);
            setRole('host');
            setIsMinimized(false);
            // NOTE: Subscribe will attach listeners
        } catch (error) {
            console.error('Failed to start gist', error);
            addToast('error', 'Failed to start Gist');
        }
    };

    // We need to re-run subscribe effect when activeGist changes to attach the handlers
    useEffect(() => {
        if (activeGist) {
            const channel = supabase
                .channel(`gist:${activeGist.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'gist_participants', filter: `gist_id=eq.${activeGist.id}` },
                    async () => fetchParticipants(activeGist.id)
                )
                .on('broadcast', { event: 'reaction' }, (payload) => {
                    // ... reaction logic
                    const newReaction = {
                        id: Math.random().toString(),
                        userId: payload.payload.userId,
                        emoji: payload.payload.emoji,
                        timestamp: Date.now()
                    };
                    setReactions(prev => [...prev, newReaction]);
                    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== newReaction.id)), 3000);
                })
                // SIGNALING HANDLERS
                .on('broadcast', { event: 'signal' }, (payload) => {
                    const { userId: senderId, targetUserId, signal } = payload.payload;
                    if (targetUserId === currentUser?.id) {
                        // Received a signal dedicated to me
                        if (peersRef.current[senderId]) {
                            peersRef.current[senderId].signal(signal);
                        } else {
                            addPeer(senderId, signal);
                        }
                    }
                })
                .on('broadcast', { event: 'join-request' }, (payload) => {
                    const { userId } = payload.payload;
                    // If I am a host/speaker, initiate connection to this new user (if they are meant to be connected)
                    // Or if I am anyone, and we are doing full mesh
                    if (userId !== currentUser?.id) {
                        // Simple check: If I have a stream, I offer it.
                        if (localStream) {
                            initiatePeerConnection(userId);
                        }
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        // Announce presence to request connections
                        channel.send({
                            type: 'broadcast',
                            event: 'join-request',
                            payload: { userId: currentUser?.id }
                        });
                    }
                });

            setRealtimeChannel(channel);
            fetchParticipants(activeGist.id);
        }

        return () => {
            if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        };
    }, [activeGist, currentUser, localStream]); // Try to keep dep array clean


    const joinGist = async (gistId: string) => {
        if (!currentUser) return;

        // Listeners usually don't need mic automatically
        // But if we want them to speak later, we can init later.

        try {
            // ... existing join logic
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
                    .insert({ gist_id: gistId, user_id: currentUser.id, role: 'listener', status: 'active' });
                setRole('listener');
            }

            const { data: gist } = await supabase.from('gists').select('*').eq('id', gistId).single();
            if (gist) {
                setActiveGist(gist);
                setIsMinimized(false);
            }
        } catch (error) {
            console.error('Failed to join gist', error);
        }
    };

    const leaveGist = async () => {
        // ... cleanup logic
        if (!activeGist || !currentUser) {
            setActiveGist(null);
            return;
        }

        try {
            if (role === 'host') {
                await supabase.from('gists').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', activeGist.id);
            } else {
                await supabase.from('gist_participants').update({ status: 'left' }).eq('gist_id', activeGist.id).eq('user_id', currentUser.id);
            }
        } catch (error) {
            console.error('Error leaving gist:', error);
        } finally {
            setActiveGist(null);
        }
    };

    // ... existing helpers
    const toggleMinimize = () => setIsMinimized(prev => !prev);
    const toggleDiscoveryCollapse = () => setIsDiscoveryCollapsed(prev => !prev);
    const sendReaction = (emoji: string) => {
        if (!realtimeChannel || !currentUser) return;
        realtimeChannel.send({ type: 'broadcast', event: 'reaction', payload: { userId: currentUser.id, emoji } });
    };

    const raiseHand = async () => {
        if (!activeGist || !currentUser) return;
        await supabase.from('gist_participants').update({ raised_hand: true, status: 'requested_to_speak' }).eq('gist_id', activeGist.id).eq('user_id', currentUser.id);
        addToast('info', 'Request to speak sent');
    };

    const inviteToSpeak = async (userId: string) => {
        // ...
        if (!activeGist) return;
        await supabase.from('gist_participants').update({ role: 'speaker', raised_hand: false, status: 'active' }).eq('gist_id', activeGist.id).eq('user_id', userId);
        addToast('success', 'Participant invited to speak');
    };

    const promoteToCoHost = async (userId: string) => {
        if (!activeGist) return;
        await supabase.from('gist_participants').update({ role: 'co-host' }).eq('gist_id', activeGist.id).eq('user_id', userId);
        addToast('success', 'Participant promoted to Co-host');
    };

    const toggleMute = async () => {
        if (!activeGist || !currentUser) return;

        // If I don't have a stream yet (was listener), init it now
        if (!localStream) {
            const stream = await initializeAudio();
            if (!stream) return; // failed

            // Now assume connected? We need to broadcast strict.
        }

        const myParticipant = participants.find(p => p.user_id === currentUser.id);
        if (!myParticipant) return;
        const newMuteStatus = !myParticipant.is_muted;

        // Hardware mute
        if (localStream) {
            localStream.getAudioTracks().forEach((track: MediaStreamTrack) => track.enabled = !newMuteStatus);
        }

        try {
            await supabase.from('gist_participants').update({ is_muted: newMuteStatus }).eq('gist_id', activeGist.id).eq('user_id', currentUser.id);
            // Optimistic update
            setParticipants(prev => prev.map(p => p.user_id === currentUser.id ? { ...p, is_muted: newMuteStatus } : p));
            addToast('info', newMuteStatus ? 'Microphone muted' : 'Microphone unmuted');
        } catch (error) {
            console.error('Error toggling mute:', error);
        }
    };

    // ... discovery helpers
    const fetchDiscoveryGists = async () => {
        // ... existing fetching
        try {
            const { data: liveData } = await supabase.from('gists').select(`*, host:users(*)`).eq('status', 'live').order('started_at', { ascending: false });
            setLiveGists(liveData || []);
            const { data: scheduledData } = await supabase.from('gists').select(`*, host:users(*)`).eq('status', 'scheduled').gte('scheduled_for', new Date().toISOString()).order('scheduled_for', { ascending: true });
            setScheduledGists(scheduledData || []);
        } catch (error) { console.error(error) }
    };

    useEffect(() => {
        fetchDiscoveryGists();
        const interval = setInterval(fetchDiscoveryGists, 60000);
        return () => clearInterval(interval);
    }, []);

    const scheduleGist = async (title: string, scheduledFor: Date, topic?: string, description?: string) => {
        if (!currentUser) return;
        try {
            const { error } = await supabase.from('gists').insert({
                host_id: currentUser.id, title, topic, description, status: 'scheduled', scheduled_for: scheduledFor.toISOString()
            });
            if (error) throw error;
            addToast('success', 'Gist scheduled successfully!');
            fetchDiscoveryGists();
        } catch (error) {
            console.error('Error scheduling gist:', error);
        }
    };

    const deleteGist = async (gistId: string) => {
        try {
            const { error } = await supabase.from('gists').delete().eq('id', gistId);
            if (error) throw error;
            setLiveGists(prev => prev.filter(g => g.id !== gistId));
            setScheduledGists(prev => prev.filter(g => g.id !== gistId));
            addToast('success', 'Gist deleted');
            if (activeGist?.id === gistId) leaveGist();
        } catch (e) { console.error(e) }
    };

    return (
        <GistContext.Provider value={{
            activeGist, isMinimized, role, participants, reactions, liveGists, scheduledGists,
            startGist, joinGist, leaveGist, toggleMinimize, raiseHand, sendReaction, inviteToSpeak, promoteToCoHost, toggleMute, scheduleGist, fetchDiscoveryGists, deleteGist, isDiscoveryCollapsed, toggleDiscoveryCollapse,
            localStream, remoteStreams, isRecording, startRecording, stopRecording
        }}>
            {children}
        </GistContext.Provider>
    );
};

export const useGist = () => {
    const context = useContext(GistContext);
    if (!context) throw new Error('useGist must be used within a GistProvider');
    return context;
};
