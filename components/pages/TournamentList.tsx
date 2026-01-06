import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../services/supabaseClient';
import SocialLayout from '../Layout/SocialLayout';

interface Tournament {
    id: string;
    name: string;
    lexicon: string;
    round_count: number;
    current_round: number;
    status: string;
    created_at: string;
    users?: { display_name: string };
    participant_count?: number;
}

const TournamentList: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        // Fetch tournaments without the join (created_by references auth.users, not public.users)
        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch tournaments:', error);
            setLoading(false);
            return;
        }

        if (data) {
            // Fetch participant counts and director names
            const enhanced = await Promise.all(data.map(async (t) => {
                const { count } = await supabase
                    .from('tournament_participants')
                    .select('*', { count: 'exact', head: true })
                    .eq('tournament_id', t.id);

                // Fetch director name from users table
                const { data: directorProfile } = await supabase
                    .from('users')
                    .select('display_name')
                    .eq('id', t.created_by)
                    .single();

                return {
                    ...t,
                    participant_count: count || 0,
                    users: directorProfile || { display_name: 'Unknown' }
                };
            }));
            setTournaments(enhanced);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <SocialLayout>
                <div className="flex items-center justify-center h-64">
                    <Icon icon="ph:spinner" className="w-8 h-8 animate-spin text-nsp-teal" />
                </div>
            </SocialLayout>
        );
    }

    return (
        <SocialLayout>
            <div className="max-w-2xl mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Tournaments</h1>

                {tournaments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Icon icon="ph:trophy" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No tournaments available</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tournaments.map(tournament => (
                            <Link
                                key={tournament.id}
                                to={`/tournament/${tournament.id}`}
                                className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="font-semibold text-gray-900">{tournament.name}</h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            by {tournament.users?.display_name || 'Unknown'}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tournament.status === 'active' ? 'bg-green-100 text-green-700' :
                                        tournament.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {tournament.status}
                                    </span>
                                </div>
                                <div className="flex gap-4 mt-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Icon icon="ph:users" />
                                        {tournament.participant_count} players
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Icon icon="ph:trophy" />
                                        Round {tournament.current_round || 0}/{tournament.round_count}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Icon icon="ph:book-open" />
                                        {tournament.lexicon}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </SocialLayout>
    );
};

export default TournamentList;
