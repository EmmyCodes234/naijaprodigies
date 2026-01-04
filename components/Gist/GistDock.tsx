import React from 'react';
import { Icon } from '@iconify/react';
import { useGist } from '../../contexts/GistContext';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import Avatar from '../Shared/Avatar';

const GistDock: React.FC = () => {
    const {
        activeGist,
        isMinimized,
        leaveGist,
        toggleMinimize,
        participants,
        toggleMute
    } = useGist();
    const { profile } = useCurrentUser();

    if (!activeGist || !isMinimized) return null;

    const me = participants.find(p => p.user_id === profile?.id);
    const host = participants.find(p => p.role === 'host')?.user;
    const isMuted = me?.is_muted ?? true;

    return (
        <div
            className="fixed bottom-[80px] md:bottom-6 left-4 right-4 md:left-[300px] md:right-6 lg:left-[350px] lg:right-10 bg-[#052120]/95 backdrop-blur-2xl text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 px-5 flex items-center justify-between cursor-default z-[100] border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-500 font-sans"
        >
            <div
                className="flex items-center gap-4 overflow-hidden flex-1 cursor-pointer group"
                onClick={toggleMinimize}
            >
                <div className="relative">
                    {/* Pulsing ring if unmuted */}
                    {!isMuted && (
                        <div className="absolute -inset-1.5 bg-[#f08920]/40 rounded-full animate-pulse blur-sm"></div>
                    )}
                    {host ? (
                        <Avatar user={host} className="w-10 h-10 rounded-2xl border-2 border-[#0f3c3a] relative z-10 shadow-lg object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-2xl bg-[#0f3c3a] flex items-center justify-center relative z-10 shadow-lg border border-white/5">
                            <Icon icon="ph:microphone-fill" className="text-[#f08920]" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col overflow-hidden">
                    <span className="font-extrabold text-sm truncate max-w-[120px] md:max-w-none group-hover:text-[#f08920] transition-colors">
                        {activeGist.title}
                    </span>
                    <div className="flex items-center gap-1.5 ">
                        <div className="w-1.5 h-1.5 bg-[#f08920] rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#f08920]/80">Live Now</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Quick Mic Toggle */}
                {(me?.role === 'host' || me?.role === 'speaker' || me?.role === 'co-host') && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMute();
                        }}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 border shadow-lg
                            ${!isMuted ? 'bg-[#f08920] text-[#052120] border-[#f08920]/20' : 'bg-gray-800 text-gray-400 border-white/5'}
                        `}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <Icon icon={!isMuted ? "ph:microphone-fill" : "ph:microphone-slash-fill"} width="22" height="22" />
                    </button>
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        leaveGist();
                    }}
                    className="bg-nsp-red/10 hover:bg-nsp-red/20 text-nsp-red px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-nsp-red/10"
                >
                    Leave
                </button>

                <button
                    onClick={toggleMinimize}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-300 transition-all active:scale-90 border border-white/5"
                >
                    <Icon icon="ph:arrows-out-simple-bold" width="20" height="20" />
                </button>
            </div>
        </div>
    );
};

export default GistDock;
