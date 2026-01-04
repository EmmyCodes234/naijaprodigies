import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useGist } from '../../contexts/GistContext';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';

interface ParticipantListProps {
    isOpen: boolean;
    onClose: () => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ isOpen, onClose }) => {
    const { participants, role, inviteToSpeak, promoteToCoHost } = useGist();
    const [activeTab, setActiveTab] = useState<'speakers' | 'requests' | 'listeners'>('speakers');

    if (!isOpen) return null;

    const speakers = participants.filter(p => p.role === 'host' || p.role === 'co-host' || p.role === 'speaker');
    const requests = participants.filter(p => p.status === 'requested_to_speak');
    const listeners = participants.filter(p => p.role === 'listener' && p.status !== 'requested_to_speak');

    const tabs = [
        { id: 'speakers', label: 'Speakers', count: speakers.length },
        { id: 'requests', label: 'Requests', count: requests.length },
        { id: 'listeners', label: 'Listeners', count: listeners.length },
    ] as const;

    const currentList = activeTab === 'speakers' ? speakers : activeTab === 'requests' ? requests : listeners;

    const canManage = role === 'host' || role === 'co-host';

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-[#052120] w-full max-w-lg rounded-[2.5rem] border border-white/5 flex flex-col max-h-[85vh] shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-20 duration-500 font-sans overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0f3c3a]/20">
                    <h3 className="text-xl font-bold text-white font-luckiest tracking-wide uppercase">Community</h3>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-2xl text-gray-400 transition-all active:scale-95">
                        <Icon icon="ph:x-bold" width="22" height="22" />
                    </button>
                </div>

                {/* Tabs - Modern Clean Design */}
                <div className="flex px-4 pt-4 pb-2 gap-2 bg-[#052120]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden
                                ${activeTab === tab.id ? 'bg-[#f08920] text-[#052120]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                            `}
                        >
                            <span className="relative z-10">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] 
                                    ${activeTab === tab.id ? 'bg-[#052120]/10' : 'bg-[#f08920]/20 text-[#f08920]'}
                                `}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {currentList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                            <Icon icon="ph:users-three-bold" width="60" height="60" className="mb-4 opacity-10" />
                            <p className="font-bold uppercase tracking-widest text-[10px]">No {activeTab} yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {currentList.map((participant) => (
                                <div key={participant.id} className="flex items-center gap-4 p-4 rounded-3xl bg-[#0f3c3a]/10 border border-transparent hover:border-white/5 hover:bg-[#0f3c3a]/20 group transition-all duration-300">
                                    <Avatar user={participant.user} className="w-12 h-12 rounded-2xl shadow-lg border-2 border-transparent group-hover:border-[#f08920]/30 transition-all duration-300" />
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white text-sm truncate">{participant.user?.name}</p>
                                            <VerifiedBadge user={participant.user} size={14} />
                                            {participant.role === 'host' && (
                                                <span className="text-[9px] font-black uppercase tracking-widest bg-[#f08920] text-[#052120] px-2 py-0.5 rounded-lg">Host</span>
                                            )}
                                            {participant.role === 'co-host' && (
                                                <span className="text-[9px] font-black uppercase tracking-widest bg-gray-800 text-nsp-teal px-2 py-0.5 rounded-lg border border-nsp-teal/20">Co-host</span>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs font-medium">@{participant.user?.handle}</p>
                                    </div>

                                    {/* Admin Actions */}
                                    {canManage && participant.user_id !== (participant.user?.auth_id || participant.user_id) && (
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                            {activeTab === 'requests' && (
                                                <button
                                                    onClick={() => inviteToSpeak(participant.user_id)}
                                                    className="bg-[#f08920] text-[#052120] text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:scale-105 transition-transform"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            {activeTab === 'listeners' && (
                                                <button
                                                    onClick={() => inviteToSpeak(participant.user_id)}
                                                    className="bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
                                                >
                                                    Invite
                                                </button>
                                            )}
                                            {participant.role === 'speaker' && (
                                                <button
                                                    onClick={() => promoteToCoHost(participant.user_id)}
                                                    className="bg-nsp-teal/20 border border-nsp-teal/40 text-nsp-teal text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-nsp-teal transition-all"
                                                >
                                                    Co-host
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Subtle Footer */}
                <div className="p-4 bg-[#0f3c3a]/5 flex justify-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">NSP Global Gist Community</p>
                </div>
            </div>
        </div>
    );
};

export default ParticipantList;
