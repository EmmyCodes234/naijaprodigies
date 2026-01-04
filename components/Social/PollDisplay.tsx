import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Poll, getPoll, votePoll } from '../../services/pollService';

interface PollDisplayProps {
    pollId: string;
    currentUserId: string;
}

const PollDisplay: React.FC<PollDisplayProps> = ({ pollId, currentUserId }) => {
    const [poll, setPoll] = useState<Poll | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPoll = async () => {
        try {
            const data = await getPoll(pollId, currentUserId);
            setPoll(data);
        } catch (err) {
            console.error('Failed to load poll:', err);
            setError('Failed to load poll');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPoll();
    }, [pollId, currentUserId]);

    const handleVote = async (optionId: string) => {
        if (!poll || submitting) return;

        setSubmitting(true);
        try {
            await votePoll(pollId, optionId, currentUserId);
            await fetchPoll(); // Refresh to show results
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to vote');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl my-2"></div>;
    if (error || !poll) return <div className="text-red-500 text-sm my-2">Error loading poll</div>;

    const isExpired = new Date(poll.expires_at) < new Date();
    const hasVoted = !!poll.user_vote;
    const showResults = isExpired || hasVoted;

    return (
        <div className="my-3 border border-gray-200 rounded-xl p-4 bg-white">
            <div className="text-sm text-gray-500 mb-2 flex justify-between">
                <span>{isExpired ? 'Poll ended' : 'Poll ends in ' + formatTimeLeft(poll.expires_at)}</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-3">{poll.question}</h3>

            <div className="space-y-2">
                {poll.options.map((option) => {
                    const percentage = poll.total_votes > 0
                        ? Math.round((option.votes / poll.total_votes) * 100)
                        : 0;

                    return (
                        <div key={option.id} className="relative">
                            {showResults ? (
                                <div className="relative h-10 w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                    {/* Progress Bar */}
                                    <div
                                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${poll.user_vote === option.id ? 'bg-nsp-teal/20' : 'bg-gray-200'}`}
                                        style={{ width: `${percentage}%` }}
                                    ></div>

                                    {/* Content */}
                                    <div className="absolute inset-0 flex items-center justify-between px-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900">{option.text}</span>
                                            {poll.user_vote === option.id && (
                                                <Icon icon="ph:check-circle-fill" className="text-nsp-teal" />
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{percentage}%</span>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleVote(option.id)}
                                    disabled={submitting}
                                    className="w-full text-left px-4 py-2 rounded-lg border border-nsp-teal/30 text-nsp-teal font-medium hover:bg-nsp-teal hover:text-white transition-colors text-sm"
                                >
                                    {option.text}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 text-xs text-gray-500">
                {poll.total_votes} votes
            </div>
        </div>
    );
};

function formatTimeLeft(dateString: string) {
    const diff = new Date(dateString).getTime() - new Date().getTime();
    if (diff <= 0) return '0m';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export default PollDisplay;
