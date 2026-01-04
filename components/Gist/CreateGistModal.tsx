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
    const [isRecording, setIsRecording] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAction = async () => {
        if (!title.trim()) return;
        setLoading(true);

        const topicString = selectedTags.join(', ');

        try {
            if (isScheduling) {
                const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
                if (dateTime < new Date()) {
                    alert('You cannot schedule a Gist in the past!');
                    setLoading(false);
                    return;
                }
                await scheduleGist(title, dateTime, topicString);
            } else {
                await startGist(title, topicString);
                if (isRecording) {
                    // TODO: Implement actual recording logic
                    console.log('Starting with recording enabled');
                }
            }
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const isButtonDisabled = !title.trim() || loading || (isScheduling && (!scheduledDate || !scheduledTime));

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

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

                <div className="p-8 pt-6">
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative mb-4">
                            <div className="absolute -inset-6 bg-[#f08920]/20 rounded-full blur-2xl animate-pulse"></div>
                            <div className="w-16 h-16 bg-[#f08920] rounded-[1.5rem] flex items-center justify-center text-[#052120] relative z-10 shadow-[0_0_40px_rgba(240,137,32,0.4)] rotate-3">
                                <Icon icon={isScheduling ? "ph:calendar-check-fill" : "ph:microphone-fill"} width="32" height="32" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white text-center tracking-tight font-luckiest mb-1">
                            {isScheduling ? 'Plan Your Gist' : 'Host a Room'}
                        </h2>
                    </div>

                    <div className="space-y-5">
                        {/* Title Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Topic</label>
                            <input
                                type="text"
                                placeholder="What's the topic today?"
                                className="w-full bg-[#0f3c3a]/30 text-white text-lg font-bold rounded-2xl border border-white/10 focus:border-[#f08920]/50 placeholder:text-gray-600 outline-none px-5 py-4 transition-all"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Topics Selection (Tags) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {['Crypto', 'Tech', 'Music', 'Gaming', 'Chill'].map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                                            ${selectedTags.includes(tag)
                                                ? 'bg-[#f08920] text-[#052120] border-[#f08920]'
                                                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}
                                        `}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Controls Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Record Toggle */}
                            <button
                                onClick={() => setIsRecording(!isRecording)}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isRecording ? 'bg-[#f08920]/10 border-[#f08920]/30' : 'bg-white/5 border-white/5'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${isRecording ? 'bg-[#f08920] text-[#052120]' : 'bg-white/10 text-gray-400'}`}>
                                        <Icon icon="ph:record-fill" width="16" />
                                    </div>
                                    <span className={`text-xs font-bold ${isRecording ? 'text-[#f08920]' : 'text-gray-400'}`}>Record</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${isRecording ? 'bg-[#f08920]' : 'bg-white/10'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isRecording ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                            </button>

                            {/* Schedule Toggle */}
                            <button
                                onClick={() => setIsScheduling(!isScheduling)}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isScheduling ? 'bg-[#f08920]/10 border-[#f08920]/30' : 'bg-white/5 border-white/5'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${isScheduling ? 'bg-[#f08920] text-[#052120]' : 'bg-white/10 text-gray-400'}`}>
                                        <Icon icon="ph:calendar-blank-fill" width="16" />
                                    </div>
                                    <span className={`text-xs font-bold ${isScheduling ? 'text-[#f08920]' : 'text-gray-400'}`}>Schedule</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${isScheduling ? 'bg-[#f08920]' : 'bg-white/10'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isScheduling ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                            </button>
                        </div>

                        {/* Schedule Inputs */}
                        {isScheduling && (
                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[#0f3c3a]/30 text-white rounded-xl p-3 border border-white/5 outline-none focus:border-[#f08920]/40 text-xs font-bold"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-[#0f3c3a]/30 text-white rounded-xl p-3 border border-white/5 outline-none focus:border-[#f08920]/40 text-xs font-bold"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleAction}
                            disabled={isButtonDisabled}
                            className={`w-full py-4 rounded-[1.5rem] font-black text-lg text-[#052120] transition-all transform active:scale-95 shadow-xl mt-4
                                ${isButtonDisabled
                                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5'
                                    : 'bg-[#f08920] hover:bg-[#f08920]/90 shadow-[0_10px_20px_rgba(240,137,32,0.3)]'}
                            `}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Icon icon="ph:spinner-bold" className="animate-spin" width="20" />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <span className="uppercase tracking-tight">
                                    {isScheduling ? 'Schedule Gist' : 'Start Now'}
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
