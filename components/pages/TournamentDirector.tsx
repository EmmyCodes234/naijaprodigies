import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import {
    createTournament,
    generatePairings,
    startMatch,
    toggleRegistration,
    toggleCheckin,
    addLatePlayer,
    Tournament,
    PairingSystem
} from '../../services/tournamentService';
import SocialLayout from '../Layout/SocialLayout';

// Types
interface Participant {
    id: string;
    user_id: string;
    woogles_username: string;
    wins: number;
    losses: number;
    spread: number;
    status: string;
    checked_in: boolean;
    checked_in_at: string | null;
    joined_round: number;
    users?: { display_name: string; avatar_url: string };
}

interface Match {
    id: string;
    round_number: number;
    player1_id: string;
    player2_id: string | null;
    score1: number | null;
    score2: number | null;
    status: string;
    is_bye: boolean;
    woogles_game_url: string | null;
}

const TournamentDirector: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'pairings' | 'standings'>('overview');

    // Fetch director's tournaments
    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTournaments(data);
            if (data.length > 0 && !selectedTournament) {
                setSelectedTournament(data[0]);
            }
        }
        setLoading(false);
    };

    // Fetch tournament data when selection changes
    useEffect(() => {
        if (selectedTournament) {
            fetchParticipants();
            fetchMatches();
        }
    }, [selectedTournament]);

    const fetchParticipants = async () => {
        if (!selectedTournament) return;
        const { data, error } = await supabase
            .from('tournament_participants')
            .select('*')
            .eq('tournament_id', selectedTournament.id)
            .order('wins', { ascending: false });
        if (error) console.error('Fetch participants error:', error);
        if (data) setParticipants(data);
    };

    const fetchMatches = async () => {
        if (!selectedTournament) return;
        const { data } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', selectedTournament.id)
            .order('round_number', { ascending: false });
        if (data) setMatches(data);
    };

    // Director Actions
    const handleGeneratePairings = async () => {
        if (!selectedTournament) return;
        try {
            const round = (selectedTournament.current_round || 0) + 1;
            const pairings = await generatePairings(
                selectedTournament.id,
                round,
                selectedTournament.pairing_system
            );

            // Insert matches into database
            const matchesToInsert = pairings.map(p => ({
                tournament_id: selectedTournament.id,
                round_number: round,
                player1_id: p.player1_id,
                player2_id: p.player2_id,
                is_bye: p.is_bye || false,
                status: 'pending',
            }));

            await supabase.from('tournament_matches').insert(matchesToInsert);

            // Update tournament round
            await supabase
                .from('tournaments')
                .update({ current_round: round })
                .eq('id', selectedTournament.id);

            fetchMatches();
            setSelectedTournament({ ...selectedTournament, current_round: round });
        } catch (error) {
            console.error('Failed to generate pairings:', error);
        }
    };

    const handleStartRound = async () => {
        if (!selectedTournament) return;
        const pendingMatches = matches.filter(
            m => m.round_number === selectedTournament.current_round && m.status === 'pending' && !m.is_bye
        );

        for (const match of pendingMatches) {
            try {
                await startMatch(match.id, selectedTournament.id);
            } catch (error) {
                console.error(`Failed to start match ${match.id}:`, error);
            }
        }
        fetchMatches();
    };

    const handleWithdrawPlayer = async (participantId: string) => {
        await supabase
            .from('tournament_participants')
            .update({ status: 'withdrawn' })
            .eq('id', participantId);
        fetchParticipants();
    };

    const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

    const handleAddPlayer = async (userId: string, wooglesUsername: string) => {
        if (!selectedTournament || !wooglesUsername.trim()) return;

        const { error } = await supabase
            .from('tournament_participants')
            .insert([{
                tournament_id: selectedTournament.id,
                user_id: userId,
                woogles_username: wooglesUsername.trim(),
                wins: 0,
                spread: 0,
                status: 'active'
            }]);

        if (error) {
            console.error('Failed to add player:', error);
            alert('Failed to add player. They may already be registered.');
        } else {
            fetchParticipants();
            setShowAddPlayerModal(false);
        }
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
        <SocialLayout showWidgets={false} fullWidth>
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tournament Director</h1>
                        <p className="text-gray-500 text-sm">Manage your tournaments</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-nsp-teal hover:bg-nsp-dark-teal text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Icon icon="ph:plus-bold" />
                        New Tournament
                    </button>
                </div>

                {/* Tournament Selector */}
                {tournaments.length > 0 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {tournaments.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTournament(t)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedTournament?.id === t.id
                                    ? 'bg-nsp-teal text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                )}

                {selectedTournament ? (
                    <>
                        {/* Tournament Info Card */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedTournament.name}</h2>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Icon icon="ph:users" />
                                            {participants.length} players
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Icon icon="ph:trophy" />
                                            Round {selectedTournament.current_round || 0} / {selectedTournament.round_count}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Icon icon="ph:book-open" />
                                            {selectedTournament.lexicon}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedTournament.status === 'active' ? 'bg-green-100 text-green-700' :
                                            selectedTournament.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {selectedTournament.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowAddPlayerModal(true)}
                                        disabled={selectedTournament.status !== 'setup'}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Icon icon="ph:user-plus" />
                                        Add Player
                                    </button>
                                    <button
                                        onClick={handleGeneratePairings}
                                        disabled={selectedTournament.status === 'completed' || participants.filter(p => p.checked_in).length < 2}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Icon icon="ph:shuffle" />
                                        Generate Pairings
                                    </button>
                                    <button
                                        onClick={handleStartRound}
                                        disabled={!matches.some(m => m.status === 'pending')}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Icon icon="ph:play-fill" />
                                        Start Round
                                    </button>
                                </div>
                            </div>

                            {/* Registration/Check-in Controls */}
                            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">Registration:</span>
                                    <button
                                        onClick={async () => {
                                            await toggleRegistration(selectedTournament.id, !selectedTournament.registration_open);
                                            fetchTournaments();
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTournament.registration_open
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {selectedTournament.registration_open ? 'Open' : 'Closed'}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">Check-in:</span>
                                    <button
                                        onClick={async () => {
                                            await toggleCheckin(selectedTournament.id, !selectedTournament.checkin_open);
                                            fetchTournaments();
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTournament.checkin_open
                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {selectedTournament.checkin_open ? 'Open' : 'Closed'}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-sm ml-auto">
                                    <Icon icon="ph:check-circle" className="text-green-500" />
                                    <span className="font-medium text-gray-700">
                                        {participants.filter(p => p.checked_in).length} / {participants.length}
                                    </span>
                                    <span className="text-gray-400">checked in</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-4 border-b border-gray-100">
                            {(['overview', 'pairings', 'standings'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab
                                        ? 'border-nsp-teal text-nsp-teal'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            {activeTab === 'pairings' && (
                                <motion.div
                                    key="pairings"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    {[...new Set(matches.map(m => m.round_number))].map(round => (
                                        <div key={round} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-medium">
                                                Round {round}
                                            </div>
                                            <div className="divide-y divide-gray-50">
                                                {matches.filter(m => m.round_number === round).map(match => (
                                                    <MatchRow key={match.id} match={match} participants={participants} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'standings' && (
                                <motion.div
                                    key="standings"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                                >
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-left text-sm text-gray-500">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">#</th>
                                                <th className="px-4 py-3 font-medium">Player</th>
                                                <th className="px-4 py-3 font-medium text-center">W</th>
                                                <th className="px-4 py-3 font-medium text-center">L</th>
                                                <th className="px-4 py-3 font-medium text-right">Spread</th>
                                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {participants
                                                .filter(p => p.status === 'active')
                                                .sort((a, b) => b.wins - a.wins || b.spread - a.spread)
                                                .map((p, idx) => (
                                                    <tr key={p.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-medium">{p.users?.display_name || 'Unknown'}</td>
                                                        <td className="px-4 py-3 text-center text-green-600">{p.wins}</td>
                                                        <td className="px-4 py-3 text-center text-red-500">
                                                            {(selectedTournament.current_round || 0) - p.wins}
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-mono ${p.spread >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {p.spread > 0 ? '+' : ''}{p.spread}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => handleWithdrawPlayer(p.id)}
                                                                className="text-xs text-red-500 hover:text-red-700"
                                                            >
                                                                Withdraw
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </motion.div>
                            )}

                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="grid grid-cols-3 gap-4"
                                >
                                    <StatCard icon="ph:users" label="Total Players" value={participants.length} />
                                    <StatCard icon="ph:game-controller" label="Games Played" value={matches.filter(m => m.status === 'finished').length} />
                                    <StatCard icon="ph:hourglass" label="Games in Progress" value={matches.filter(m => m.status === 'live').length} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <Icon icon="ph:trophy" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No tournaments yet. Create your first one!</p>
                    </div>
                )}

                {/* Create Tournament Modal */}
                <CreateTournamentModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={async (data) => {
                        await createTournament(data);
                        setShowCreateModal(false);
                        fetchTournaments();
                    }}
                />

                {/* Add Player Modal */}
                <AddPlayerModal
                    isOpen={showAddPlayerModal}
                    onClose={() => setShowAddPlayerModal(false)}
                    onAdd={handleAddPlayer}
                    existingParticipantIds={participants.map(p => p.user_id)}
                />
            </div>
        </SocialLayout>
    );
};

// Sub-components
const MatchRow: React.FC<{ match: Match; participants: Participant[] }> = ({ match, participants }) => {
    const p1 = participants.find(p => p.user_id === match.player1_id);
    const p2 = participants.find(p => p.user_id === match.player2_id);

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
                <span className="font-medium">{p1?.users?.display_name || 'TBD'}</span>
                <span className="text-gray-400">vs</span>
                <span className="font-medium">{match.is_bye ? 'BYE' : (p2?.users?.display_name || 'TBD')}</span>
            </div>
            <div className="flex items-center gap-4">
                {match.score1 !== null && (
                    <span className="font-mono text-sm">
                        {match.score1} - {match.score2 || 0}
                    </span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${match.status === 'finished' ? 'bg-green-100 text-green-700' :
                    match.status === 'live' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                    }`}>
                    {match.status}
                </span>
                {match.woogles_game_url && (
                    <a
                        href={match.woogles_game_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nsp-teal hover:underline text-sm"
                    >
                        View Game
                    </a>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: string; label: string; value: number }> = ({ icon, label, value }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
        <Icon icon={icon} className="w-8 h-8 text-nsp-teal mb-2" />
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
    </div>
);

const CreateTournamentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: Partial<Tournament>) => Promise<void>;
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [lexicon, setLexicon] = useState<'CSW21' | 'NWL23'>('CSW21');
    const [roundCount, setRoundCount] = useState(8);
    const [pairingSystem, setPairingSystem] = useState<PairingSystem>('swiss');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            await onCreate({
                name,
                lexicon,
                round_count: roundCount,
                pairing_system: pairingSystem,
                created_by: user.id,
                status: 'setup',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
                <h2 className="text-xl font-bold mb-4">Create Tournament</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nsp-teal focus:border-transparent"
                            placeholder="e.g. NSP Weekly #42"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lexicon</label>
                            <select
                                value={lexicon}
                                onChange={e => setLexicon(e.target.value as 'CSW21' | 'NWL23')}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            >
                                <option value="CSW21">CSW21</option>
                                <option value="NWL23">NWL23</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rounds</label>
                            <input
                                type="number"
                                value={roundCount}
                                onChange={e => setRoundCount(parseInt(e.target.value))}
                                min={1}
                                max={20}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pairing System</label>
                        <select
                            value={pairingSystem}
                            onChange={e => setPairingSystem(e.target.value as PairingSystem)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        >
                            <option value="swiss">Swiss</option>
                            <option value="round_robin">Round Robin</option>
                            <option value="koth">King of the Hill</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="flex-1 px-4 py-2 bg-nsp-teal text-white rounded-lg font-medium hover:bg-nsp-dark-teal disabled:bg-gray-300"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Add Player Modal with User Search + Manual Entry
const AddPlayerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (userId: string, manualName?: string) => void;
    existingParticipantIds: string[];
}> = ({ isOpen, onClose, onAdd, existingParticipantIds }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{ id: string; display_name: string; avatar_url: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualName, setManualName] = useState('');

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .ilike('display_name', `%${searchQuery}%`)
            .limit(10);

        if (!error && data) {
            // Filter out already registered users
            const filtered = data.filter(u => !existingParticipantIds.includes(u.id));
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const debounce = setTimeout(handleSearch, 300);
            return () => clearTimeout(debounce);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add Player</h2>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setShowManualEntry(false)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!showManualEntry ? 'bg-nsp-teal text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        Search NSP Users
                    </button>
                    <button
                        onClick={() => setShowManualEntry(true)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${showManualEntry ? 'bg-nsp-teal text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        Manual Entry
                    </button>
                </div>

                {!showManualEntry ? (
                    <>
                        {/* Search Mode */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search registered NSP users..."
                                className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nsp-teal focus:border-transparent text-gray-900"
                            />
                            <Icon icon="ph:magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {loading && (
                                <div className="text-center py-4 text-gray-500">
                                    <Icon icon="ph:spinner" className="animate-spin inline mr-2" />
                                    Searching...
                                </div>
                            )}

                            {!loading && searchResults.length === 0 && searchQuery.length >= 2 && (
                                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                                    <Icon icon="ph:magnifying-glass" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No NSP users found for "{searchQuery}"</p>
                                    <button
                                        onClick={() => {
                                            setShowManualEntry(true);
                                            setManualName(searchQuery);
                                        }}
                                        className="mt-2 text-nsp-teal text-sm hover:underline"
                                    >
                                        Add as external player →
                                    </button>
                                </div>
                            )}

                            {searchQuery.length < 2 && !loading && (
                                <div className="text-center py-4 text-gray-400">
                                    Type at least 2 characters to search
                                </div>
                            )}

                            {searchResults.map(user => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={user.avatar_url || '/default-avatar.png'}
                                            alt={user.display_name}
                                            className="w-10 h-10 rounded-full object-cover bg-gray-200"
                                        />
                                        <span className="font-medium text-gray-900">{user.display_name}</span>
                                    </div>
                                    <button
                                        onClick={() => onAdd(user.id)}
                                        className="px-3 py-1 bg-nsp-teal text-white text-sm rounded-lg hover:bg-nsp-dark-teal"
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Manual Entry Mode */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={e => setManualName(e.target.value)}
                                    placeholder="Enter player name..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nsp-teal text-gray-900"
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                External players won't have NSP profiles. Their scores will be tracked in this tournament only.
                            </p>
                            <button
                                onClick={() => {
                                    if (manualName.trim()) {
                                        // Generate a placeholder UUID for external players
                                        const externalId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                        onAdd(externalId, manualName.trim());
                                        setManualName('');
                                    }
                                }}
                                disabled={!manualName.trim()}
                                className="w-full py-2 bg-nsp-teal text-white rounded-lg font-medium hover:bg-nsp-dark-teal disabled:bg-gray-300"
                            >
                                Add External Player
                            </button>
                        </div>
                    </>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-4 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                    Close
                </button>
            </motion.div>
        </div>
    );
};

export default TournamentDirector;
