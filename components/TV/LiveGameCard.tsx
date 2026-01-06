import React from 'react';
import { LiveGame, formatRating, getRatingColor } from '../../services/tvService';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface LiveGameCardProps {
    game: LiveGame;
    onWatch: (game: LiveGame) => void;
}

const LiveGameCard = React.forwardRef<HTMLDivElement, LiveGameCardProps>(({ game, onWatch }, ref) => {
    const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

    // Color logic for ratings (lighter/pastel versions for light mode if needed, or stick to standard)
    const getRatingBadgeColor = (rating: number | null) => {
        if (!rating) return 'bg-gray-100 text-gray-500';
        if (rating >= 2000) return 'bg-purple-50 text-purple-700'; // Grandmaster
        if (rating >= 1800) return 'bg-blue-50 text-blue-700';     // Expert
        if (rating >= 1500) return 'bg-green-50 text-green-700';   // Intermediate
        return 'bg-gray-50 text-gray-600';
    };

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 }
            }}
            layout
            className={`group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${game.is_high_profile ? 'ring-2 ring-red-500/10' : ''}`}
        >
            {/* High Profile Banner */}
            {game.is_high_profile && (
                <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wide">
                        <Icon icon="ph:fire-fill" width="12" />
                        Featured Match
                    </span>
                    <span className="text-[10px] font-medium text-red-500/80">Woogles Live</span>
                </div>
            )}

            {/* Main Content */}
            <div className="p-5">
                <div className="flex items-center justify-between gap-4">

                    {/* Player 1 */}
                    <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-gray-700 bg-gray-100 border border-gray-200`}>
                            {getInitials(game.player1_name)}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{game.player1_name}</h3>
                            <div className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${getRatingBadgeColor(game.player1_rating)}`}>
                                {formatRating(game.player1_rating)}
                            </div>
                        </div>
                    </div>

                    {/* VS Badge */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-300 italic">VS</span>
                    </div>

                    {/* Player 2 */}
                    <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-gray-700 bg-gray-100 border border-gray-200`}>
                            {getInitials(game.player2_name)}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{game.player2_name}</h3>
                            <div className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${getRatingBadgeColor(game.player2_rating)}`}>
                                {formatRating(game.player2_rating)}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer Meta & Action */}
            <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-500 bg-white border border-gray-200 uppercase">
                        {game.lexicon || 'CSW'}
                    </span>
                    {game.time_control && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-gray-500 bg-white border border-gray-200 uppercase">
                            <Icon icon="ph:clock" width="10" />
                            {game.time_control}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => onWatch(game)}
                    className="text-nsp-teal hover:text-nsp-dark-teal text-xs font-bold hover:underline decoration-2 underline-offset-2 flex items-center gap-1 transition-colors"
                >
                    Watch
                    <Icon icon="ph:arrow-right-bold" />
                </button>
            </div>

        </motion.div>
    );
});

export default LiveGameCard;
