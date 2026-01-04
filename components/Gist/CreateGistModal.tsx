import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useGist } from '../../contexts/GistContext';

interface CreateGistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateGistModal: React.FC<CreateGistModalProps> = ({ isOpen, onClose }) => {
    const { startGist, scheduleGist } = useGist();
    const [title, setTitle] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAction = async () => {
        if (!title.trim()) return;
        setLoading(true);

        if (isScheduling) {
            const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
            await scheduleGist(title, dateTime);
        } else {
            await startGist(title);
        }

        setLoading(false);
        onClose();
    };

    const isButtonDisabled = !title.trim() || loading || (isScheduling && (!scheduledDate || !scheduledTime));

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-[#052120] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/5 animate-in slide-in-from-bottom-20 duration-500 font-sans">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0f3c3a]/20">
                    <button onClick={onClose} className="p-2 transition-all hover:bg-white/5 rounded-xl active:scale-90">
                        <Icon icon="ph:x-bold" width="24" height="24" className="text-gray-400" />
                    </button>
                    <h3 className="font-extrabold text-[#f08920] text-sm uppercase tracking-[0.2em]">
                        {isScheduling ? 'Schedule Gist' : 'Start New Gist'}
                    </h3>
                    <div className="w-10"></div>
                </div>

                <div className="p-8 pt-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-6">
                            <div className="absolute -inset-6 bg-[#f08920]/20 rounded-full blur-2xl animate-pulse"></div>
                            <div className="w-20 h-20 bg-[#f08920] rounded-[1.8rem] flex items-center justify-center text-[#052120] relative z-10 shadow-[0_0_40px_rgba(240,137,32,0.4)] rotate-3">
                                <Icon icon={isScheduling ? "ph:calendar-check-fill" : "ph:microphone-fill"} width="40" height="40" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-white text-center tracking-tight font-luckiest mb-2">
                            {isScheduling ? 'Plan Your Gist' : 'Host a Room'}
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {/* Title Input */}
                        <div className="group relative">
                            <input
                                type="text"
                                placeholder="What's the topic today?"
                                className="w-full bg-[#0f3c3a]/30 text-white text-lg font-bold rounded-[1.5rem] border-2 border-white/5 focus:border-[#f08920]/50 placeholder:text-gray-600 outline-none px-6 py-5 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Scheduling Toggle */}
                        <button
                            onClick={() => setIsScheduling(!isScheduling)}
                            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors px-2"
                        >
                            <div className={`w-10 h-6 rounded-full relative transition-colors ${isScheduling ? 'bg-[#f08920]' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isScheduling ? 'left-5' : 'left-1'}`} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">Schedule for later</span>
                        </button>

                        {/* Schedule Inputs */}
                        {isScheduling && (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#f08920] uppercase tracking-widest ml-2">Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[#0f3c3a]/30 text-white rounded-xl p-3 border border-white/5 outline-none focus:border-[#f08920]/40"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#f08920] uppercase tracking-widest ml-2">Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-[#0f3c3a]/30 text-white rounded-xl p-3 border border-white/5 outline-none focus:border-[#f08920]/40"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleAction}
                            disabled={isButtonDisabled}
                            className={`w-full py-5 rounded-[2rem] font-black text-xl text-[#052120] transition-all transform active:scale-95 shadow-2xl
                                ${isButtonDisabled
                                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5'
                                    : 'bg-[#f08920] hover:bg-[#f08920]/90 shadow-[0_15px_30px_rgba(240,137,32,0.4)]'}
                            `}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <Icon icon="ph:spinner-bold" className="animate-spin" width="24" />
                                    <span className="font-luckiest tracking-wide">Processing...</span>
                                </div>
                            ) : (
                                <span className="font-luckiest tracking-tight uppercase">
                                    {isScheduling ? 'Schedule Gist' : 'Launch Gist'}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-8">
                        <div className="flex items-center gap-2.5 text-gray-500">
                            <Icon icon="ph:calendar-bold" width="16" className="text-[#f08920]/50" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Plan Ahead</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-gray-500">
                            <Icon icon="ph:share-network-bold" width="16" className="text-[#f08920]/50" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Share Link</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateGistModal;
