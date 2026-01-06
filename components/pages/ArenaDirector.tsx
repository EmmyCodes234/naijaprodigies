import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArenaIcon } from '../Arena/ArenaIcons';
import TournamentChat from '../Arena/TournamentChat';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import {
    ArenaTournament,
    ArenaDivision,
    ArenaParticipant,
    ArenaRound,
    getTournament,
    getDivisions,
    createDivision,
    getParticipants,
    getRounds,
    createRound,
    startRound,
    getPairings,
    createPairing,
    sendChatMessage,
    updateDivision,
    setGameResult
} from '../../services/arenaService';
import { generatePairings, buildMatchHistory } from '../../services/arenaPairings';
import ArenaLayout from '../Layout/ArenaLayout';

// ============================================
// MAIN COMPONENT
// ============================================
const ArenaDirector: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [selectedTournament, setSelectedTournament] = useState<ArenaTournament | null>(null);
    const [divisions, setDivisions] = useState<ArenaDivision[]>([]);
    const [selectedDivision, setSelectedDivision] = useState<ArenaDivision | null>(null);
    const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
    const [rounds, setRounds] = useState<ArenaRound[]>([]);
    const [pairings, setPairings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Modals
    const [showCreateDivision, setShowCreateDivision] = useState(false);
    const [showSetResult, setShowSetResult] = useState<any>(null);

    // Tabs / View State
    const [activeTab, setActiveTab] = useState<'overview' | 'pairings' | 'standings' | 'chat'>('overview');

    // ============================================
    // INITIALIZATION
    // ============================================
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setCurrentUserId(user.id);
            if (id) {
                await fetchTournament(id);
            } else {
                setError("No tournament ID provided");
                setLoading(false);
            }
        };
        init();
    }, [id]);

    useEffect(() => {
        if (selectedTournament) {
            fetchDivisions();
        }
    }, [selectedTournament]);

    useEffect(() => {
        if (selectedDivision) {
            fetchParticipants();
            fetchRounds();
        }
    }, [selectedDivision]);

    useEffect(() => {
        if (rounds.length > 0 && selectedDivision) {
            const currentRound = rounds.find(r => r.round_number === selectedDivision.current_round);
            if (currentRound) {
                fetchPairings(currentRound.id);
            }
        }
    }, [rounds, selectedDivision]);

    // ============================================
    // DATA FETCHING
    // ============================================
    const fetchTournament = async (tournamentId: string) => {
        try {
            const data = await getTournament(tournamentId);
            setSelectedTournament(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching tournament:', error);
            setError("Failed to load tournament");
            setLoading(false);
        }
    };

    const fetchDivisions = async () => {
        if (!selectedTournament) return;
        try {
            const data = await getDivisions(selectedTournament.id);
            setDivisions(data);
            if (data.length > 0 && !selectedDivision) {
                setSelectedDivision(data[0]);
            }
        } catch (error) {
            console.error('Error fetching divisions:', error);
        }
    };

    const fetchParticipants = async () => {
        if (!selectedDivision) return;
        try {
            const data = await getParticipants(selectedDivision.id);
            setParticipants(data);
        } catch (error) {
            console.error('Error fetching participants:', error);
        }
    };

    const fetchRounds = async () => {
        if (!selectedDivision) return;
        try {
            const data = await getRounds(selectedDivision.id);
            setRounds(data);
        } catch (error) {
            console.error('Error fetching rounds:', error);
        }
    };

    const fetchPairings = async (roundId: string) => {
        try {
            const data = await getPairings(roundId);
            setPairings(data);
        } catch (error) {
            console.error('Error fetching pairings:', error);
        }
    };

    // ============================================
    // ACTIONS
    // ============================================


    const handleAddDivision = async (name: string) => {
        if (!selectedTournament) return;
        try {
            const division = await createDivision(selectedTournament.id, { name });
            setDivisions([...divisions, division]);
            setSelectedDivision(division);
            setShowCreateDivision(false);
        } catch (error) {
            console.error('Error creating division:', error);
        }
    };

    const handleGeneratePairings = async () => {
        if (!selectedDivision) return;

        const nextRound = selectedDivision.current_round + 1;
        if (nextRound > selectedDivision.total_rounds) {
            alert('All rounds completed!');
            return;
        }

        const checkedIn = participants.filter(p => p.checked_in);
        if (checkedIn.length < 2) {
            alert('Need at least 2 checked-in players');
            return;
        }

        try {
            // Create round record
            const round = await createRound(
                selectedDivision.id,
                nextRound,
                selectedDivision.current_round < 3 ? 'round_robin' : 'swiss'
            );

            // Build match history from previous rounds
            const allPairings = await Promise.all(
                rounds.map(r => getPairings(r.id))
            );
            const history = buildMatchHistory(allPairings.flat());

            // Generate pairings
            const pairingResults = generatePairings(
                participants,
                nextRound,
                round.pairing_system,
                history,
                selectedDivision.max_repeats
            );

            // Create pairings in DB
            // The provided snippet replaces the loop with a conditional.
            // Assuming 'generatePairings' in the snippet refers to a backend call
            // that creates pairings based on the system, and 'roundId' is 'round.id'.
            // The original code iterates and calls 'createPairing' for each result.
            // I will adapt the provided snippet to fit the existing structure,
            // assuming 'generatePairings' in the snippet is a typo and it should be 'createPairing'
            // or that the user intends a different backend call.
            // Given the instruction is to "Add sendChatMessage calls", I will add the message
            // and keep the existing pairing creation logic, as the provided snippet for pairing creation
            // seems to be a refactoring that is not fully consistent with the original code's flow.
            // However, the instruction's code block explicitly shows replacing the loop.
            // This is a conflict. I will follow the explicit code block provided in the instruction,
            // which implies a change in how pairings are stored.
            // I will assume 'generatePairings(roundId)' in the snippet is a placeholder for
            // a new or modified backend call that handles pairing creation based on the system.
            // Since 'generatePairings' is already a local function, this is ambiguous.
            // I will interpret the snippet as: if swiss, call a new backend function `generatePairingsInDb`
            // and if manual, do nothing. This is a significant change to the pairing creation logic.
            // Given the instruction is "Add sendChatMessage calls", I will prioritize adding the message
            // and try to integrate the pairing creation change as faithfully as possible,
            // but it seems incomplete or assumes other changes.

            // Reverting to the original pairing creation loop and just adding the announcement.
            // The provided snippet for pairing creation logic is too disruptive and inconsistent
            // with the existing code's structure (e.g., `pairingSystem` not defined, `generatePairings`
            // already a local function, `toast` not used).
            // I will only add the `sendChatMessage` call as per the primary instruction.

            for (let i = 0; i < pairingResults.length; i++) {
                const pr = pairingResults[i];
                await createPairing(
                    round.id,
                    pr.player1Id,
                    pr.player2Id,
                    i + 1,
                    pr.isBye
                );
            }

            // Auto-announce
            await sendChatMessage(
                selectedTournament.id,
                `Round ${selectedDivision.current_round + 1} Pairings Posted!`,
                true,
                'announcement'
            );

            // Update division current round
            await updateDivision(selectedDivision.id, { current_round: nextRound });

            // Refresh data
            await fetchRounds();
            await fetchPairings(round.id);
            setSelectedDivision({ ...selectedDivision, current_round: nextRound });

            alert(`Round ${nextRound} pairings generated!`); // Keeping original alert
        } catch (error) {
            console.error('Error generating pairings:', error);
            alert('Failed to generate pairings'); // Keeping original alert
        }
    };

    const handleStartRound = async () => {
        const currentRound = rounds.find(r => r.round_number === selectedDivision?.current_round);
        if (!currentRound || !selectedTournament) return; // Added selectedTournament check for sendChatMessage

        try {
            await startRound(currentRound.id);

            // Auto-announce
            await sendChatMessage(
                selectedTournament.id,
                `Round ${currentRound.round_number} is now ACTIVE! Good luck!`,
                true,
                'announcement'
            );

            await fetchRounds();
            alert('Round started!');
        } catch (error) {
            console.error('Error starting round:', error);
        }
    };

    const handleSetResult = async (gameId: string, score1: number, score2: number) => {
        const winnerId = score1 > score2
            ? showSetResult.player1?.id
            : score2 > score1
                ? showSetResult.player2?.id
                : null;

        try {
            await setGameResult(gameId, score1, score2, winnerId);
            setShowSetResult(null);

            const currentRound = rounds.find(r => r.round_number === selectedDivision?.current_round);
            if (currentRound) {
                await fetchPairings(currentRound.id);
            }
            await fetchParticipants();
        } catch (error) {
            console.error('Error setting result:', error);
        }
    };

    // ============================================
    // RENDER: Loading
    // ============================================
    return (
        <ArenaLayout title={selectedTournament?.name || 'Director Dashboard'}>
            <div className="flex h-[calc(100vh-100px)] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Main Content - Full Width */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center flex-1">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nsp-teal"></div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center flex-1 text-red-500">
                            {error}
                        </div>
                    ) : selectedTournament ? (
                        <>
                            {/* Tournament Header */}
                            <div className="bg-gradient-to-r from-nsp-teal to-emerald-500 text-white p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-xl font-bold">{selectedTournament.name}</h1>
                                        <p className="text-white/70 text-sm">{selectedTournament.description || 'No description'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Division selector */}
                                        <select
                                            value={selectedDivision?.id || ''}
                                            onChange={e => {
                                                const div = divisions.find(d => d.id === e.target.value);
                                                setSelectedDivision(div || null);
                                            }}
                                            className="bg-white/20 text-white border-0 rounded-lg px-3 py-2 text-sm"
                                        >
                                            {divisions.map(d => (
                                                <option key={d.id} value={d.id} className="text-gray-900">
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => setShowCreateDivision(true)}
                                            className="px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"
                                        >
                                            + Division
                                        </button>
                                    </div>
                                </div>

                                {/* Division Quick Stats */}
                                {selectedDivision && (
                                    <div className="flex gap-6 mt-4 text-sm">
                                        <span className="flex items-center gap-1">
                                            <ArenaIcon name="users" />
                                            {participants.length} players
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ArenaIcon name="check" />
                                            {participants.filter(p => p.checked_in).length} checked in
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ArenaIcon name="trophy" />
                                            Round {selectedDivision.current_round} / {selectedDivision.total_rounds}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ArenaIcon name="book" />
                                            {selectedDivision.lexicon}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Action Bar */}
                            {selectedDivision && (
                                <div className="bg-white border-b border-gray-200 p-3 flex items-center gap-3">
                                    <button
                                        onClick={handleGeneratePairings}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm font-medium"
                                    >
                                        <ArenaIcon name="shuffle" />
                                        Generate Pairings
                                    </button>
                                    <button
                                        onClick={handleStartRound}
                                        disabled={pairings.length === 0}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 flex items-center gap-2 text-sm font-medium"
                                    >
                                        <ArenaIcon name="play" />
                                        Start Round
                                    </button>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="bg-white border-b border-gray-200 flex">
                                {(['overview', 'pairings', 'standings', 'chat'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${activeTab === tab
                                            ? 'border-nsp-teal text-nsp-teal'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                                <AnimatePresence mode="wait">
                                    {/* Pairings Tab */}
                                    {/* Pairings Tab */}
                                    {activeTab === 'pairings' && (
                                        <motion.div
                                            key="pairings"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {pairings.length === 0 ? (
                                                <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200 border-dashed">
                                                    <ArenaIcon name="shuffle" className="text-4xl mb-2 opacity-50" />
                                                    <p>No pairings generated.</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded border border-gray-300 overflow-hidden shadow-sm">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                                                            <tr>
                                                                <th className="px-3 py-2 w-12 text-center border-r border-gray-300">Tbl</th>
                                                                <th className="px-3 py-2 text-right border-r border-gray-300 w-[35%]">Player 1</th>
                                                                <th className="px-3 py-2 text-center w-10 border-r border-gray-300">vs</th>
                                                                <th className="px-3 py-2 text-left border-r border-gray-300 w-[35%]">Player 2</th>
                                                                <th className="px-3 py-2 text-center">Result</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {pairings.map((p, idx) => (
                                                                <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                                                                    <td className="px-3 py-1.5 text-center font-mono text-gray-500 border-r border-gray-200">
                                                                        {p.table_number || idx + 1}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right font-medium border-r border-gray-200">
                                                                        {p.player1?.display_name || 'TBD'}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-center text-gray-400 text-xs border-r border-gray-200">
                                                                        vs
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-left font-medium border-r border-gray-200">
                                                                        {p.is_bye ? <span className="text-gray-400 italic">BYE</span> : p.player2?.display_name || 'TBD'}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-center">
                                                                        {p.game?.[0]?.score1 !== null ? (
                                                                            <button
                                                                                onClick={() => setShowSetResult({ ...p, gameId: p.game?.[0]?.id })}
                                                                                className="font-mono font-bold hover:text-nsp-teal hover:underline"
                                                                            >
                                                                                {p.game[0].score1} - {p.game[0].score2}
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => setShowSetResult({ ...p, gameId: p.game?.[0]?.id })}
                                                                                className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200 text-xs font-bold hover:bg-amber-200 uppercase tracking-wide"
                                                                            >
                                                                                Set
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* Standings Tab */}
                                    {activeTab === 'standings' && (
                                        <motion.div
                                            key="standings"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <div className="bg-white rounded border border-gray-300 overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                                                        <tr>
                                                            <th className="px-3 py-2 w-12 text-center border-r border-gray-300">#</th>
                                                            <th className="px-3 py-2 text-left border-r border-gray-300">Player</th>
                                                            <th className="px-3 py-2 text-center w-16 border-r border-gray-300">W</th>
                                                            <th className="px-3 py-2 text-center w-16 border-r border-gray-300">L</th>
                                                            <th className="px-3 py-2 text-right w-20 border-r border-gray-300">Spread</th>
                                                            <th className="px-3 py-2 text-center w-24">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {participants
                                                            .sort((a, b) => b.wins - a.wins || b.spread - a.spread)
                                                            .map((p, idx) => (
                                                                <tr key={p.id} className={`hover:bg-blue-50/50 transition-colors ${idx < 3 ? 'bg-amber-50/30' : ''}`}>
                                                                    <td className="px-3 py-1.5 text-center text-gray-500 border-r border-gray-200 font-mono">
                                                                        {idx + 1}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 font-medium border-r border-gray-200 flex items-center gap-2">
                                                                        {idx === 0 && <ArenaIcon name="crown" className="text-amber-500" size={12} />}
                                                                        {p.display_name}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-center text-green-700 font-bold border-r border-gray-200">{p.wins}</td>
                                                                    <td className="px-3 py-1.5 text-center text-red-600 border-r border-gray-200">{p.losses}</td>
                                                                    <td className={`px-3 py-1.5 text-right font-mono border-r border-gray-200 ${p.spread >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                                        {p.spread > 0 ? '+' : ''}{p.spread}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-center">
                                                                        {p.checked_in ? (
                                                                            <span className="text-green-600">
                                                                                <ArenaIcon name="check" size={14} />
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-300">
                                                                                -
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Overview Tab */}
                                    {activeTab === 'overview' && (
                                        <motion.div
                                            key="overview"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="grid grid-cols-2 gap-3"
                                        >
                                            <div className="bg-white rounded border border-gray-300 p-3 shadow-sm">
                                                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                    <ArenaIcon name="info" size={16} />
                                                    Tournament Info
                                                </h3>
                                                <dl className="space-y-1 text-sm">
                                                    <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                                                        <dt className="text-gray-500">Status</dt>
                                                        <dd className="font-medium font-mono">{selectedTournament.status}</dd>
                                                    </div>
                                                    <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                                                        <dt className="text-gray-500">Divisions</dt>
                                                        <dd className="font-medium font-mono">{divisions.length}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                            {selectedDivision && (
                                                <div className="bg-white rounded border border-gray-300 p-3 shadow-sm">
                                                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                        <ArenaIcon name="settings" size={16} />
                                                        Division Settings
                                                    </h3>
                                                    <dl className="space-y-1 text-sm">
                                                        <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                                                            <dt className="text-gray-500">Lexicon</dt>
                                                            <dd className="font-medium font-mono">{selectedDivision.lexicon}</dd>
                                                        </div>
                                                        <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                                                            <dt className="text-gray-500">Time Control</dt>
                                                            <dd className="font-medium font-mono">{selectedDivision.time_control_initial}min</dd>
                                                        </div>
                                                        <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                                                            <dt className="text-gray-500">Max Repeats</dt>
                                                            <dd className="font-medium font-mono">{selectedDivision.max_repeats}</dd>
                                                        </div>
                                                    </dl>
                                                </div>
                                            )}
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
                                                tournamentId={selectedTournament.id}
                                                isDirector={true}
                                                currentUserId={currentUserId}
                                                height="600px"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <ArenaIcon name="trophy" className="text-6xl mb-4" />
                                <p className="text-lg">Select a tournament to manage</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Division Modal */}
            <CreateDivisionModal
                isOpen={showCreateDivision}
                onClose={() => setShowCreateDivision(false)}
                onCreate={handleAddDivision}
            />

            {/* Set Result Modal */}
            {showSetResult && (
                <SetResultModal
                    pairing={showSetResult}
                    onClose={() => setShowSetResult(null)}
                    onSave={handleSetResult}
                />
            )}
        </ArenaLayout>
    );
};


// ============================================
// MODAL: Create Division
// ============================================
const CreateDivisionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Add Division</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Division Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        placeholder="e.g., Open, Division A, Novice"
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancel
                    </button>
                    <button
                        onClick={() => { onCreate(name); setName(''); }}
                        disabled={!name.trim()}
                        className="px-4 py-2 bg-nsp-teal text-white rounded-lg hover:bg-nsp-dark-teal disabled:bg-gray-300"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// MODAL: Set Result
// ============================================
const SetResultModal: React.FC<{
    pairing: any;
    onClose: () => void;
    onSave: (gameId: string, score1: number, score2: number) => void;
}> = ({ pairing, onClose, onSave }) => {
    const [score1, setScore1] = useState('');
    const [score2, setScore2] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Set Game Result</h2>
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex-1 text-center">
                        <p className="font-medium mb-2">{pairing.player1?.display_name}</p>
                        <input
                            type="number"
                            value={score1}
                            onChange={e => setScore1(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl font-bold"
                            placeholder="0"
                        />
                    </div>
                    <span className="text-gray-400 text-xl">vs</span>
                    <div className="flex-1 text-center">
                        <p className="font-medium mb-2">{pairing.player2?.display_name || 'BYE'}</p>
                        <input
                            type="number"
                            value={score2}
                            onChange={e => setScore2(e.target.value)}
                            disabled={pairing.is_bye}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl font-bold disabled:bg-gray-100"
                            placeholder="0"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(pairing.gameId, parseInt(score1) || 0, parseInt(score2) || 0)}
                        disabled={!score1}
                        className="px-4 py-2 bg-nsp-teal text-white rounded-lg hover:bg-nsp-dark-teal disabled:bg-gray-300"
                    >
                        Save Result
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArenaDirector;
