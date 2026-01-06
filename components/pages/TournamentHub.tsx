import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import {
    getTournament,
    getDivisions,
    getParticipants,
    getRounds,
    getPairings,
    registerParticipant,
    checkInParticipant,
    subscribeToStandings,
    subscribeToGames,
    ArenaTournament,
    ArenaDivision,
    ArenaParticipant,
    ArenaRound,
    ArenaPairing
} from '../../services/arenaService';
import TournamentChat from '../Arena/TournamentChat';
import { ArenaIcon } from '../Arena/ArenaIcons';
// import SocialLayout from '../Layout/SocialLayout';
import ArenaLayout from '../Layout/ArenaLayout';
import WooglesUserSearch from '../Registration/WooglesUserSearch';

const TournamentHub: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const navigate = useNavigate();

    // State
    const [tournament, setTournament] = useState<ArenaTournament | null>(null);
    const [divisions, setDivisions] = useState<ArenaDivision[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'standings' | 'pairings' | 'chat'>('standings');
    const [selectedDivision, setSelectedDivision] = useState<ArenaDivision | null>(null);
    const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
    const [rounds, setRounds] = useState<ArenaRound[]>([]);
    const [pairings, setPairings] = useState<any[]>([]); // Using any for join result
    const [myParticipant, setMyParticipant] = useState<ArenaParticipant | null>(null);


    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [wooglesUsername, setWooglesUsername] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    // ============================================
    // INITIALIZATION
    // ============================================
    useEffect(() => {
        const init = async () => {
            if (!tournamentId) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            try {
                // Fetch tournament
                const t = await getTournament(tournamentId);
                setTournament(t);

                // Fetch divisions
                const divs = await getDivisions(tournamentId);
                setDivisions(divs);

                if (divs.length > 0) {
                    const defaultDiv = divs[0];
                    setSelectedDivision(defaultDiv);
                }
            } catch (error) {
                console.error('Error fetching tournament:', error);
                setError('Failed to load tournament');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [tournamentId]);

    // ============================================
    // DIVISION DATA FETCHING
    // ============================================
    useEffect(() => {
        if (!selectedDivision) return;

        const fetchData = async () => {
            try {
                // Fetch participants
                const parts = await getParticipants(selectedDivision.id);
                setParticipants(parts);

                // Find me
                if (currentUserId) {
                    const me = parts.find(p => p.user_id === currentUserId);
                    setMyParticipant(me || null);
                    if (me && me.woogles_username) {
                        setWooglesUsername(me.woogles_username);
                    }
                }

                // Fetch rounds
                const r = await getRounds(selectedDivision.id);
                setRounds(r);

                // Fetch current round pairings if active
                if (selectedDivision.current_round > 0) {
                    const currentRound = r.find(rd => rd.round_number === selectedDivision.current_round);
                    if (currentRound) {
                        const p = await getPairings(currentRound.id);
                        setPairings(p);
                    }
                }
            } catch (error) {
                console.error('Error fetching division data:', error);
            }
        };

        fetchData();

        // Subscriptions
        const unsubStandings = subscribeToStandings(selectedDivision.id, (updated) => {
            setParticipants(updated);
        });

        return () => {
            unsubStandings();
        };
    }, [selectedDivision, currentUserId]);

    // ============================================
    // ACTIONS
    // ============================================
    const handleRegister = async () => {
        if (!selectedDivision || !currentUserId || !wooglesUsername.trim()) return;

        setIsRegistering(true);
        try {
            // Get user profile for display name
            const { data: profile } = await supabase
                .from('users')
                .select('display_name')
                .eq('id', currentUserId)
                .single();

            await registerParticipant(
                selectedDivision.id,
                currentUserId,
                profile?.display_name || 'Unknown Player',
                wooglesUsername
            );

            // Refresh
            const parts = await getParticipants(selectedDivision.id);
            setParticipants(parts);
            const me = parts.find(p => p.user_id === currentUserId);
            setMyParticipant(me || null);
            alert('registered!');
        } catch (error: any) {
            alert(error.message || 'Failed to register');
        } finally {
            setIsRegistering(false);
        }
    };

    const handleCheckIn = async () => {
        if (!selectedDivision || !currentUserId) return;

        try {
            await checkInParticipant(selectedDivision.id, currentUserId);

            // Refresh
            const parts = await getParticipants(selectedDivision.id);
            setParticipants(parts);
            const me = parts.find(p => p.user_id === currentUserId);
            setMyParticipant(me || null);
        } catch (error) {
            console.error('Error checking in:', error);
        }
    };

    // ============================================
    // RENDER: Loading
    // ============================================
    if (loading) {
        return (
            <ArenaLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nsp-teal"></div>
                </div>
            </ArenaLayout>
        );
    }

    if (error || !tournament) {
        return (
            <ArenaLayout>
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <p className="text-red-500 mb-4">{error || 'Tournament not found'}</p>
                    <button onClick={() => navigate('/')} className="text-nsp-teal hover:underline">
                        Return Home
                    </button>
                </div>
            </ArenaLayout>
        );
    }

    // ============================================
    // RENDER: Main
    // ============================================
    return (
        <ArenaLayout
            title={tournament.name}
            showBackButton={true}
            actions={
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${tournament.status === 'active' ? 'bg-green-100 text-green-700' :
                        tournament.status === 'registration' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {tournament.status}
                    </span>
                </div>
            }
        >
            {/* Header Content moved inside Layout body or just kept as page header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[calc(100vh-120px)]">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${tournament.status === 'active' ? 'bg-green-500' :
                                    tournament.status === 'registration' ? 'bg-blue-500' : 'bg-gray-600'
                                    }`}>
                                    {tournament.status}
                                </span>
                                <span className="text-white/60 text-sm">Hosted by NSP Arena</span>
                            </div>
                            <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
                            <p className="text-white/70 max-w-2xl">{tournament.description}</p>
                        </div>

                        {/* Registration Card */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 w-full md:w-80 border border-white/20">
                            {!myParticipant ? (
                                <div className="space-y-3">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <ArenaIcon name="user-plus" />
                                        Register Now
                                    </h3>
                                    {tournament.status === 'registration' || tournament.status === 'active' ? (
                                        <>
                                            {tournament.platform === 'woogles' ? (
                                                <WooglesUserSearch
                                                    value={wooglesUsername}
                                                    onChange={setWooglesUsername}
                                                    placeholder="Search Woogles Username..."
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={wooglesUsername}
                                                    onChange={e => setWooglesUsername(e.target.value)}
                                                    placeholder="Username/Handle"
                                                    className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-nsp-teal"
                                                />
                                            )}
                                            {divisions.length > 1 && (
                                                <select
                                                    className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-nsp-teal"
                                                    onChange={e => {
                                                        const d = divisions.find(div => div.id === e.target.value);
                                                        if (d) setSelectedDivision(d);
                                                    }}
                                                    value={selectedDivision?.id}
                                                >
                                                    {divisions.map(d => (
                                                        <option key={d.id} value={d.id} className="text-gray-900">{d.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                            <button
                                                onClick={handleRegister}
                                                disabled={!wooglesUsername.trim() || isRegistering}
                                                className="w-full py-2 bg-nsp-teal hover:bg-nsp-dark-teal rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isRegistering ? 'Joining...' : 'Join Tournament'}
                                            </button>
                                        </>
                                    ) : (
                                        <p className="text-sm text-white/60">Registration is currently closed.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-nsp-teal flex items-center justify-center font-bold text-lg">
                                            {myParticipant.display_name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold">{myParticipant.display_name}</div>
                                            <div className="text-xs text-white/60">@{myParticipant.woogles_username}</div>
                                        </div>
                                    </div>

                                    {!myParticipant.checked_in && tournament.status === 'active' && (
                                        <button
                                            onClick={handleCheckIn}
                                            className="w-full py-2 bg-green-500 hover:bg-green-600 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ArenaIcon name="check" />
                                            Check In
                                        </button>
                                    )}

                                    {myParticipant.checked_in && (
                                        <div className="w-full py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 font-bold text-center flex items-center justify-center gap-2">
                                            <ArenaIcon name="check" />
                                            Checked In
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Division Tabs via simple links if multiple */}
                    {divisions.length > 1 && (
                        <div className="flex gap-2 mt-8 overflow-x-auto pb-2">
                            {divisions.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setSelectedDivision(d)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedDivision?.id === d.id
                                        ? 'bg-white text-gray-900'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {d.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-6xl mx-auto p-4 md:p-6">
                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    {(['overview', 'pairings', 'standings', 'chat'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-medium text-sm capitalize border-b-2 -mb-px transition-colors ${activeTab === tab
                                ? 'border-nsp-teal text-nsp-teal'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid md:grid-cols-2 gap-6"
                            >
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <ArenaIcon name="info" className="text-xl" />
                                            Tournament Details
                                        </h3>
                                        <dl className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <dt className="text-gray-500">Status</dt>
                                                <dd className="font-medium capitalize">{tournament.status}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500">Divisions</dt>
                                                <dd className="font-medium">{divisions.length}</dd>
                                            </div>
                                            {selectedDivision && (
                                                <>
                                                    <div>
                                                        <dt className="text-gray-500">Format</dt>
                                                        <dd className="font-medium">
                                                            {selectedDivision.total_rounds} rounds
                                                            ({selectedDivision.lexicon})
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-gray-500">Time Control</dt>
                                                        <dd className="font-medium">
                                                            {selectedDivision.time_control_initial} + {selectedDivision.time_control_increment}
                                                        </dd>
                                                    </div>
                                                </>
                                            )}
                                        </dl>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <ArenaIcon name="users" className="text-xl" />
                                            Top Players
                                        </h3>
                                        {participants.length > 0 ? (
                                            <div className="space-y-3">
                                                {participants.slice(0, 5).map((p, idx) => (
                                                    <div key={p.id} className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                                idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-500'
                                                                }`}>
                                                                {idx + 1}
                                                            </span>
                                                            <span className="font-medium">{p.display_name}</span>
                                                        </div>
                                                        <div className="font-mono text-gray-500">
                                                            {p.wins}W / {p.spread > 0 ? '+' : ''}{p.spread}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">No participants yet.</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STANDINGS TAB */}
                        {activeTab === 'standings' && (
                            <motion.div
                                key="standings"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-left text-sm text-gray-500 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 w-12">#</th>
                                                <th className="px-6 py-4">Player</th>
                                                <th className="px-6 py-4 text-center">Wins</th>
                                                <th className="px-6 py-4 text-center">Losses</th>
                                                <th className="px-6 py-4 text-right">Spread</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {participants.map((p, idx) => (
                                                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.user_id === currentUserId ? 'bg-amber-50' : ''
                                                    }`}>
                                                    <td className="px-6 py-4 text-gray-500 font-medium">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{p.display_name}</div>
                                                        <div className="text-xs text-gray-500">@{p.woogles_username}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-green-600">
                                                        {p.wins}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-red-500">
                                                        {p.losses}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-mono font-medium ${p.spread >= 0 ? 'text-green-600' : 'text-red-500'
                                                        }`}>
                                                        {p.spread > 0 ? '+' : ''}{p.spread}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {p.checked_in ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                Checked In
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {participants.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                        No participants yet. Be the first to join!
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* PAIRINGS TAB */}
                        {activeTab === 'pairings' && (
                            <motion.div
                                key="pairings"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold">Round {selectedDivision?.current_round} Pairings</h3>
                                        <span className="text-sm text-gray-500">
                                            Auto-refreshes every 30s
                                        </span>
                                    </div>

                                    {pairings.length > 0 ? (
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {pairings.map((p, idx) => (
                                                <div
                                                    key={p.id}
                                                    className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between ${p.player1_id === myParticipant?.id || p.player2_id === myParticipant?.id
                                                        ? 'ring-2 ring-nsp-teal border-transparent'
                                                        : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-mono text-sm text-gray-500 font-bold">
                                                            {p.table_number || idx + 1}
                                                        </div>
                                                        <div>
                                                            <div className={`font-medium ${p.game?.[0]?.winner_id === p.player1?.id ? 'text-green-600 font-bold' : ''}`}>
                                                                {p.player1?.display_name || 'TBD'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {p.game?.[0]?.score1 !== null ? p.game[0].score1 : '-'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-center px-4">
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">VS</span>
                                                        {p.game?.[0]?.status === 'completed' && (
                                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 mt-1">Final</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3 text-right">
                                                        <div>
                                                            <div className={`font-medium ${p.game?.[0]?.winner_id === p.player2?.id ? 'text-green-600 font-bold' : ''}`}>
                                                                {p.is_bye ? 'BYE' : p.player2?.display_name || 'TBD'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {p.game?.[0]?.score2 !== null ? p.game[0].score2 : '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-xl p-12 text-center text-gray-500 border border-dashed border-gray-300">
                                            <ArenaIcon name="hourglass" className="text-4xl mb-3 block mx-auto opacity-50" />
                                            <p className="font-medium">Waiting for pairings...</p>
                                            <p className="text-sm">Round {selectedDivision?.current_round} pairings haven't been posted yet.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* CHAT TAB */}
                        {activeTab === 'chat' && (
                            <motion.div
                                key="chat"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <TournamentChat
                                    tournamentId={tournament.id}
                                    isDirector={tournament.director_id === currentUserId}
                                    currentUserId={currentUserId}
                                    height="600px"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </ArenaLayout>
    );
};

export default TournamentHub;
