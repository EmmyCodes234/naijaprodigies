import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
    getChatMessages,
    sendChatMessage,
    subscribeToChatMessages,
    TournamentChat as ChatMessage
} from '../../services/arenaService';
import { format } from 'date-fns';

interface TournamentChatProps {
    tournamentId: string;
    isDirector: boolean;
    currentUserId: string | null;
    height?: string;
}

const TournamentChat: React.FC<TournamentChatProps> = ({
    tournamentId,
    isDirector,
    currentUserId,
    height = "500px"
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadMessages();

        const unsubscribe = subscribeToChatMessages(tournamentId, (newMsg) => {
            // Fetch user metadata if needed, but for now just push it
            fetchUserProfile(newMsg).then(completeMsg => {
                setMessages(prev => [...prev, completeMsg]);
                scrollToBottom();
            });
        });

        return () => {
            unsubscribe();
        };
    }, [tournamentId]);

    const loadMessages = async () => {
        try {
            const data = await getChatMessages(tournamentId);
            setMessages(data);
            setLoading(false);
            scrollToBottom();
        } catch (error) {
            console.error('Error loading chat:', error);
        }
    };

    const fetchUserProfile = async (msg: ChatMessage): Promise<ChatMessage> => {
        if ((msg as any).users) return msg;

        const { data } = await supabase
            .from('users')
            .select('display_name, avatar_url')
            .eq('id', msg.user_id)
            .single();

        return {
            ...msg,
            users: data
        } as any;
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !currentUserId || sending) return;

        setSending(true);
        try {
            await sendChatMessage(
                tournamentId,
                newMessage.trim(),
                isDirector, // is_director_message
                isDirector && newMessage.startsWith('/announce') ? 'announcement' : 'text'
            );
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200`} style={{ height }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nsp-teal"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height }}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 py-10">
                        <span className="iconify text-4xl mx-auto mb-2 opacity-30" data-icon="ph:chat-teardrop-dots" />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isMe = msg.user_id === currentUserId;
                    const isDirectorMsg = msg.is_director_message;
                    const isAnnouncement = msg.message_type === 'announcement';
                    const showHeader = idx === 0 || messages[idx - 1].user_id !== msg.user_id ||
                        (new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 300000);

                    if (isAnnouncement) {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="bg-gradient-to-r from-nsp-teal/10 to-blue-500/10 border border-nsp-teal/20 rounded-full px-4 py-1 text-xs font-bold text-gray-600 flex items-center gap-2">
                                    <span className="iconify text-nsp-teal" data-icon="ph:megaphone-simple-fill" />
                                    {msg.message.replace('/announce ', '')}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {showHeader && (
                                <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-xs font-bold text-gray-700">
                                        {(msg as any).users?.display_name || 'Unknown User'}
                                    </span>
                                    {isDirectorMsg && !isMe && (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-bold uppercase tracking-wider">
                                            Director
                                        </span>
                                    )}
                                    <span className="text-[10px] text-gray-400">
                                        {format(new Date(msg.created_at), 'h:mm a')}
                                    </span>
                                </div>
                            )}

                            <div
                                className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm whitespace-pre-wrap shadow-sm ${isMe
                                        ? 'bg-nsp-teal text-white rounded-tr-none'
                                        : isDirectorMsg
                                            ? 'bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-none ring-1 ring-amber-100'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                    }`}
                            >
                                {msg.message}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSend} className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isDirector ? "Message as Director..." : "Type a message..."}
                        className={`w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-all ${isDirector
                                ? 'focus:ring-amber-500/50 focus:border-amber-500'
                                : 'focus:ring-nsp-teal/50 focus:border-nsp-teal'
                            }`}
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${!newMessage.trim()
                                ? 'text-gray-300 cursor-not-allowed'
                                : isDirector
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-nsp-teal hover:bg-nsp-teal/10'
                            }`}
                    >
                        <span className="iconify text-xl" data-icon="ph:paper-plane-right-fill" />
                    </button>
                </form>
                {isDirector && (
                    <div className="flex justify-end mt-2">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <span className="iconify" data-icon="ph:shield-star-fill" />
                            Posting as Director
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TournamentChat;
