import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { LiveGame, getLiveGames, subscribeToLiveGames } from '../../services/tvService';
import LiveGameCard from '../TV/LiveGameCard';
import GameViewerModal from '../TV/GameViewerModal';
import SocialLayout, { useSocialLayout } from '../Layout/SocialLayout';
import Avatar from '../Shared/Avatar';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const NSPTV: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const { openDrawer } = useSocialLayout();
    const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [lexiconFilter, setLexiconFilter] = useState<'ALL' | 'CSW' | 'NWL'>('ALL');

    useEffect(() => {
        // Initial Fetch
        const fetchGames = async () => {
            try {
                const games = await getLiveGames();
                setLiveGames(games);
            } catch (error) {
                console.error("Failed to load TV games", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGames();

        // Subscribe to Realtime Updates
        const unsubscribe = subscribeToLiveGames(
            (newGame) => {
                setLiveGames(prev => {
                    const exists = prev.find(g => g.id === newGame.id);
                    if (exists) return prev.map(g => g.id === newGame.id ? newGame : g);
                    return [newGame, ...prev];
                });
            },
            (updatedGame) => {
                setLiveGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
            },
            (deletedGameId) => {
                setLiveGames(prev => prev.filter(g => g.id !== deletedGameId));
            }
        );

        // Cleanup
        return () => {
            unsubscribe();
        };
    }, []);

    const handleWatch = (game: LiveGame) => {
        setSelectedGame(game);
        setIsViewerOpen(true);
    };

    // Filter Logic
    const filteredGames = liveGames.filter(game => {
        if (lexiconFilter === 'ALL') return true;
        return game.lexicon?.toUpperCase().includes(lexiconFilter);
    });

    return (
        <SocialLayout showWidgets={false} fullWidth={true}>
            {/* Standard App Header (Mobile & Desktop Unified for coherence) */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-200">
                <div className="px-4 py-3 flex items-center justify-between">
                    {/* Mobile Drawer Trigger (matches SocialFeed) */}
                    <div className="flex items-center gap-4 md:hidden">
                        <button onClick={(e) => { e.stopPropagation(); openDrawer(); }}>
                            <Avatar user={currentUser} alt="Me" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                        </button>
                    </div>

                    <h1 className="text-xl font-bold text-gray-900">NSP TV</h1>

                    {/* Filter Pills */}
                    <div className="flex bg-gray-100 p-0.5 rounded-lg">
                        {(['ALL', 'CSW', 'NWL'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setLexiconFilter(filter)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${lexiconFilter === filter
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50/50 min-h-screen">

                {/* Live Count Indicator */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full border border-red-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Live Now</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">{filteredGames.length} active matches</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-white rounded-xl shadow-sm animate-pulse border border-gray-100" />
                        ))}
                    </div>
                ) : filteredGames.length > 0 ? (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{
                            hidden: { opacity: 0 },
                            show: {
                                opacity: 1,
                                transition: { staggerChildren: 0.05 }
                            }
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    >
                        <AnimatePresence mode='popLayout'>
                            {filteredGames.map(game => (
                                <LiveGameCard
                                    key={game.id}
                                    game={game}
                                    onWatch={handleWatch}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Icon icon="ph:television-simple-slash" width="24" className="text-gray-400" />
                        </div>
                        <h3 className="text-gray-900 font-bold mb-1">No live broadcasts</h3>
                        <p className="text-gray-500 text-sm">Check back later for scheduled games.</p>
                    </div>
                )}
            </div>

            <GameViewerModal
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                game={selectedGame}
            />
        </SocialLayout>
    );
};

export default NSPTV;
