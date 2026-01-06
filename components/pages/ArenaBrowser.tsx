import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import SocialLayout from '../Layout/SocialLayout';
import { ArenaTournament } from '../../services/arenaService';
import { format } from 'date-fns';

const ArenaBrowser: React.FC = () => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<ArenaTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            const { data, error } = await supabase
                .from('arena_tournaments')
                .select('*')
                .eq('is_public', true)
                .order('start_date', { ascending: true });

            if (error) throw error;
            setTournaments(data || []);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500 text-white';
            case 'registration': return 'bg-blue-500 text-white';
            case 'completed': return 'bg-gray-100 text-gray-600';
            case 'cancelled': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const filteredTournaments = tournaments.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' ||
            (filter === 'upcoming' && (t.status === 'draft' || t.status === 'registration')) ||
            t.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <SocialLayout showWidgets={false} fullWidth>
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                            <span className="iconify text-nsp-teal" data-icon="ph:trophy-fill" />
                            NSP Arena
                        </h1>
                        <p className="text-xl text-white/70 max-w-xl">
                            Join competitive Scrabble tournaments, climb the leaderboards, and battle for glory in real-time.
                        </p>
                    </div>
                    {/* Stats or CTA */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/arena')}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold backdrop-blur-sm border border-white/20 transition-all"
                        >
                            Director Dashboard
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                        {(['all', 'upcoming', 'active', 'completed'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-colors ${filter === f
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-auto min-w-[300px]">
                        <span className="iconify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" data-icon="ph:magnifying-glass" />
                        <input
                            type="text"
                            placeholder="Search tournaments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-nsp-teal transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Tournament Grid */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nsp-teal"></div>
                    </div>
                ) : filteredTournaments.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTournaments.map((t) => (
                            <Link
                                key={t.id}
                                to={`/tournament/${t.id}`}
                                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 block"
                            >
                                <div className="h-32 bg-gradient-to-br from-gray-800 to-gray-700 relative p-6 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(t.status)}`}>
                                            {t.status}
                                        </span>
                                        {t.is_public && (
                                            <span className="iconify text-white/40" data-icon="ph:globe" />
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-nsp-teal transition-colors line-clamp-1">
                                        {t.name}
                                    </h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <span className="iconify text-lg" data-icon="ph:calendar-blank" />
                                            {t.start_date ? format(new Date(t.start_date), 'MMM d, yyyy') : 'TBA'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="iconify text-lg" data-icon="ph:users" />
                                            {t.max_players ? `Max ${t.max_players}` : 'Open'}
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                                        {t.description || "No description provided."}
                                    </p>

                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-400">
                                                    ?
                                                </div>
                                            ))}
                                            <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500">
                                                +
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-nsp-teal group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                            View Arena
                                            <span className="iconify" data-icon="ph:arrow-right-bold" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <span className="iconify text-4xl text-gray-300 mb-4 block mx-auto" data-icon="ph:trophy-slash" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No tournaments found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            {searchTerm || filter !== 'all'
                                ? "Try adjusting your filters or search terms."
                                : "Check back later for upcoming tournaments!"}
                        </p>
                    </div>
                )}
            </div>
        </SocialLayout>
    );
};

export default ArenaBrowser;
