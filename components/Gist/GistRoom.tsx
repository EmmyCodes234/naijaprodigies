import React from 'react';
import { Icon } from '@iconify/react';
import { useGist } from '../../contexts/GistContext';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useToast } from '../../contexts/ToastContext';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';
import GistReactions from './GistReactions';
import ParticipantList from './ParticipantList';

const GistRoom: React.FC = () => {
    const {
        activeGist,
        isMinimized,
        toggleMinimize,
        leaveGist,
        participants,
        role,
        sendReaction,
        raiseHand,
        toggleMute,
        deleteGist
    } = useGist();
    const { addToast } = useToast();
    const { profile } = useCurrentUser();
    const [isParticipantListOpen, setIsParticipantListOpen] = React.useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

    if (!activeGist || isMinimized) return null;

    const me = participants.find(p => p.user_id === profile?.id);
    const isMuted = me?.is_muted ?? true;

    const emojiShortcuts = ['👋', '💯', '🔥', '😂', '❤️', '👏'];

    const speakers = participants.filter(p => p.role === 'host' || p.role === 'speaker' || p.role === 'co-host');
    const listeners = participants.filter(p => p.role === 'listener');

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/gist/${activeGist.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: activeGist.title,
                    text: `Join the Gist on NSP: ${activeGist.title}`,
                    url: shareUrl
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            addToast('success', 'Link copied to clipboard!');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#052120] text-white animate-in slide-in-from-bottom-full duration-500 overflow-hidden font-sans">
            {/* Reactions Layer */}
            <GistReactions />

            {/* Subtle Brand Glows */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#0f3c3a] rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-nsp-orange/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Header - NSP Branded Glassmorphism */}
            <div className="relative z-10 flex items-center justify-between p-5 bg-[#0f3c3a]/20 backdrop-blur-2xl border-b border-white/5">
                <button onClick={toggleMinimize} className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90">
                    <Icon icon="ph:caret-down-bold" width="24" height="24" className="text-gray-300" />
                </button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-nsp-orange rounded-full animate-pulse shadow-[0_0_8px_#f08920]"></div>
                        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-nsp-orange">Live Gist</span>
                    </div>
                    <h2 className="font-extrabold text-xl font-luckiest tracking-tight truncate max-w-[200px] text-white">
                        {activeGist.title}
                    </h2>
                </div>
                <button
                    onClick={handleShare}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90"
                >
                    <Icon icon="ph:share-network-bold" width="22" height="22" className="text-gray-300" />
                </button>
            </div>

            {/* Stage (Speakers) */}
            <div className="relative z-10 flex-1 overflow-y-auto px-6 py-10">
                <div className="max-w-2xl mx-auto">
                    {/* Speakers Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-12 gap-x-8 mb-20">
                        {speakers.map((speaker) => {
                            const isMe = speaker.user_id === profile?.id;
                            const isCurrentlySpeaking = !speaker.is_muted;
                            return (
                                <div key={speaker.id} className="flex flex-col items-center group">
                                    <div className="relative mb-4">
                                        {/* Speaking Animation Ring */}
                                        {isCurrentlySpeaking && (
                                            <>
                                                <div className="absolute -inset-3 bg-nsp-orange/20 rounded-full blur-xl animate-pulse"></div>
                                                <div className="absolute -inset-1.5 border-2 border-nsp-orange/50 rounded-full animate-[ping_3s_infinite] opacity-30"></div>
                                            </>
                                        )}

                                        <div className={`relative p-1 rounded-full border-2 transition-all duration-500 ${isCurrentlySpeaking ? 'border-nsp-orange' : 'border-transparent'}`}>
                                            <Avatar
                                                user={speaker.user}
                                                className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-[#052120] relative z-10 shadow-2xl transition-transform duration-300 ${isCurrentlySpeaking ? 'scale-105' : 'group-hover:scale-105'}`}
                                            />
                                        </div>

                                        {/* Role Badge */}
                                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-bold text-[10px] z-20 shadow-xl whitespace-nowrap border
                                            ${speaker.role === 'host' ? 'bg-nsp-orange text-[#052120] border-nsp-orange/20' :
                                                speaker.role === 'co-host' ? 'bg-[#0f1419] text-nsp-teal border-nsp-teal/30' :
                                                    'bg-gray-800 text-gray-300 border-white/5'}
                                        `}>
                                            {speaker.role === 'host' ? 'HOST' : speaker.role === 'co-host' ? 'CO-HOST' : 'SPEAKER'}
                                        </div>

                                        {/* Mute Indicator */}
                                        {speaker.is_muted && (
                                            <div className="absolute top-0 right-0 bg-nsp-red rounded-full p-2 border-2 border-[#052120] z-20 shadow-lg">
                                                <Icon icon="ph:microphone-slash-fill" width="14" height="14" className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center w-full">
                                        <p className="font-bold text-base text-white truncate px-2 mb-0.5 flex items-center justify-center gap-1">
                                            {speaker.user?.name || 'User'}
                                            <VerifiedBadge user={speaker.user} size={14} />
                                            {isMe && <span className="text-nsp-orange ml-1 text-xs font-medium opactiy-80">(You)</span>}
                                        </p>
                                        <p className="text-gray-400 text-xs font-medium tracking-wide">@{speaker.user?.handle}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Listeners Section */}
                    {listeners.length > 0 && (
                        <div className="mt-16 bg-white/5 rounded-3xl p-6 border border-white/5">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Listeners ({listeners.length})</h3>
                                <button
                                    onClick={() => setIsParticipantListOpen(true)}
                                    className="text-nsp-orange font-bold text-xs hover:underline active:opacity-60"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-8">
                                {listeners.slice(0, 12).map((listener) => {
                                    const isMe = listener.user_id === profile?.id;
                                    return (
                                        <div key={listener.id} className="flex flex-col items-center gap-2.5 group">
                                            <Avatar
                                                user={listener.user}
                                                className={`w-14 h-14 rounded-full border-2 transition-all duration-300 ${isMe ? 'border-nsp-orange shadow-[0_0_15px_rgba(240,137,32,0.3)]' : 'border-transparent group-hover:border-white/20'}`}
                                            />
                                            <span className={`text-[10px] font-bold truncate w-full text-center ${isMe ? 'text-nsp-orange' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                                {isMe ? 'YOU' : listener.user?.name?.toUpperCase()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
                <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 p-2.5 bg-[#0f3c3a]/90 backdrop-blur-3xl rounded-2xl border border-white/10 flex gap-4 animate-in fade-in zoom-in-95 pointer-events-auto">
                    {emojiShortcuts.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => {
                                sendReaction(emoji);
                                setShowEmojiPicker(false);
                            }}
                            className="text-3xl hover:scale-125 transition-transform p-2 active:scale-95"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Bottom Controls - Clean Brand Floating Bar */}
            <div className="relative z-10 p-8 pt-0 pb-12">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-6 px-4 bg-[#0f3c3a]/40 backdrop-blur-3xl rounded-[2.5rem] p-4 shadow-2xl border border-white/5">
                    {/* Left Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={raiseHand}
                            className={`p-4 rounded-3xl transition-all active:scale-90 border
                                ${me?.status === 'requested_to_speak' ? 'bg-nsp-orange text-[#052120] border-nsp-orange/20' : 'bg-white/5 text-white hover:bg-white/10 border-white/5'}
                            `}
                            title="Request to speak"
                        >
                            <Icon icon="ph:hand-waving-bold" width="24" height="24" />
                        </button>
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-4 rounded-3xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90 border border-white/5"
                            title="Send reaction"
                        >
                            <Icon icon="ph:smiley-bold" width="24" height="24" />
                        </button>
                    </div>

                    {/* Main Action (Mic) */}
                    <div className="relative">
                        <button
                            onClick={() => (role === 'host' || role === 'speaker' || role === 'co-host') && toggleMute()}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 border-8 border-[#052120] relative z-10 
                            ${(role === 'host' || role === 'speaker' || role === 'co-host')
                                    ? (!isMuted ? 'bg-nsp-orange text-[#052120] shadow-[0_0_30px_rgba(240,137,32,0.4)] scale-110' : 'bg-nsp-red text-white shadow-[0_0_20px_rgba(217,58,38,0.2)]')
                                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'}
                        `}>
                            <Icon
                                icon={(role === 'host' || role === 'speaker' || role === 'co-host')
                                    ? (!isMuted ? "ph:microphone-fill" : "ph:microphone-slash-fill")
                                    : "ph:microphone-slash-fill"}
                                width="36" height="36"
                            />
                        </button>
                        <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 whitespace-nowrap
                            ${!isMuted ? 'text-nsp-orange' : 'text-gray-500'}
                        `}>
                            {(role === 'host' || role === 'speaker' || role === 'co-host')
                                ? (!isMuted ? 'YOU ARE LIVE' : 'MUTED')
                                : 'LISTENING ONLY'}
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsParticipantListOpen(true)}
                            className="p-4 rounded-3xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90 border border-white/5"
                            title="Participants"
                        >
                            <Icon icon="ph:users-bold" width="24" height="24" />
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this Gist? This will end the session for everyone and remove the Gist permanently.')) {
                                    deleteGist(activeGist.id);
                                }
                            }}
                            className="p-4 rounded-3xl bg-nsp-red/10 hover:bg-nsp-red/20 text-nsp-red transition-all active:scale-90 border border-nsp-red/20"
                            title="Delete Gist"
                        >
                            <Icon icon="ph:trash-bold" width="24" height="24" />
                        </button>
                        <button
                            onClick={leaveGist}
                            className="bg-nsp-red/10 hover:bg-nsp-red/20 text-nsp-red px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-nsp-red/20"
                        >
                            {role === 'host' ? 'End Gist' : 'Leave'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlays */}
            <ParticipantList
                isOpen={isParticipantListOpen}
                onClose={() => setIsParticipantListOpen(false)}
            />
        </div>
    );
};

export default GistRoom;
