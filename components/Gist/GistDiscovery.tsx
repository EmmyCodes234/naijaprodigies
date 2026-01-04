import React from 'react';
import { Icon } from '@iconify/react';
import { useGist } from '../../contexts/GistContext';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';
import { format } from 'date-fns';

const GistDiscovery: React.FC = () => {
    const {
        liveGists,
        scheduledGists,
        joinGist,
        activeGist,
        deleteGist,
        isDiscoveryCollapsed,
        toggleDiscoveryCollapse
    } = useGist();
    const { profile } = useCurrentUser();

    if (liveGists.length === 0 && scheduledGists.length === 0) return null;

    const handleDelete = (e: React.MouseEvent, gistId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this Gist? This action cannot be undone.')) {
            deleteGist(gistId);
        }
    };

    return (
        <div className="bg-[#0f1419] rounded-2xl border border-white/5 overflow-hidden shadow-xl mb-4 font-sans">
            <div
                className="p-4 border-b border-white/5 bg-[#0f3c3a]/10 flex items-center justify-between cursor-pointer hover:bg-[#0f3c3a]/20 transition-all"
                onClick={toggleDiscoveryCollapse}
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#f08920] rounded-full animate-pulse shadow-[0_0_8px_#f08920]"></div>
                    <h3 className="font-extrabold text-xs uppercase tracking-[0.2em] text-[#f08920]">Live on NSP</h3>
                </div>
                <Icon
                    icon="ph:caret-down-bold"
                    className={`text-gray-500 transition-transform duration-300 ${isDiscoveryCollapsed ? 'rotate-0' : '-rotate-180'}`}
                />
            </div>

            {!isDiscoveryCollapsed && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <div className="divide-y divide-white/5">
                        {/* Live Gists */}
                        {liveGists.map((gist) => {
                            const isHost = profile?.id === gist.host_id;
                            return (
                                <div
                                    key={gist.id}
                                    className={`p-4 hover:bg-white/5 transition-all cursor-pointer group relative ${activeGist?.id === gist.id ? 'bg-[#0f3c3a]/20' : ''}`}
                                    onClick={() => joinGist(gist.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            <Avatar
                                                user={gist.host}
                                                className="w-10 h-10 rounded-xl border border-white/10"
                                            />
                                            <div className="absolute -bottom-1 -right-1 bg-[#f08920] rounded-md p-0.5 border-2 border-[#0f1419]">
                                                <Icon icon="ph:microphone-fill" width="10" className="text-[#052120]" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-8">
                                            <p className="font-bold text-sm text-white truncate group-hover:text-[#f08920] transition-colors">
                                                {gist.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-400 font-medium">with</span>
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <span className="text-[10px] font-bold text-nsp-teal truncate">
                                                        {gist.host?.name}
                                                    </span>
                                                    <VerifiedBadge user={gist.host} size={10} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        {isHost && (
                                            <button
                                                onClick={(e) => handleDelete(e, gist.id)}
                                                className="p-1.5 rounded-lg text-gray-500 hover:text-nsp-red hover:bg-nsp-red/10 transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Gist"
                                            >
                                                <Icon icon="ph:trash-bold" width="14" />
                                            </button>
                                        )}
                                        <div className="flex items-center gap-1 bg-nsp-red/10 px-2 py-0.5 rounded-full border border-nsp-red/20">
                                            <span className="text-[8px] font-black text-nsp-red uppercase tracking-wider">Join</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Scheduled Gists */}
                        {scheduledGists.length > 0 && (
                            <div className="p-4 bg-white/[0.02]">
                                <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Upcoming</h4>
                                <div className="space-y-3">
                                    {scheduledGists.map((gist) => {
                                        const isHost = profile?.id === gist.host_id;
                                        return (
                                            <div key={gist.id} className="flex items-center gap-3 group cursor-default">
                                                <Avatar
                                                    user={gist.host}
                                                    className="w-8 h-8 rounded-lg opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                                />
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="font-bold text-xs text-gray-400 truncate group-hover:text-white transition-colors">
                                                        {gist.title}
                                                    </p>
                                                    <p className="text-[9px] text-[#f08920] font-black uppercase tracking-tight mt-0.5">
                                                        {gist.scheduled_for ? format(new Date(gist.scheduled_for), 'MMM d, h:mm a') : 'Coming Soon'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isHost && (
                                                        <button
                                                            onClick={(e) => handleDelete(e, gist.id)}
                                                            className="p-2 rounded-lg text-gray-500 hover:text-nsp-red hover:bg-nsp-red/10 transition-all"
                                                            title="Delete"
                                                        >
                                                            <Icon icon="ph:trash-bold" width="14" />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-[#f08920]/20 hover:text-[#f08920] text-gray-500 transition-all"
                                                        title="Remind me"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // TODO: Notification/Reminder logic
                                                        }}
                                                    >
                                                        <Icon icon="ph:bell-bold" width="14" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className="w-full p-3 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                        onClick={() => { /* Navigate to Explore/Rooms */ }}
                    >
                        View all Gists
                    </button>
                </div>
            )}
        </div>
    );
};

export default GistDiscovery;
