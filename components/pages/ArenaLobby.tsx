import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaIcon } from '../Arena/ArenaIcons';
import { supabase } from '../../services/supabaseClient';
import {
    ArenaTournament,
    getMyTournaments,
    createTournament
} from '../../services/arenaService';
import ArenaLayout from '../Layout/ArenaLayout';

// ============================================
// MAIN COMPONENT
// ============================================
const ArenaLobby: React.FC = () => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<ArenaTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showCreateTournament, setShowCreateTournament] = useState(false);

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
            await fetchTournaments();
            setLoading(false);
        };
        init();
    }, []);

    const fetchTournaments = async () => {
        try {
            const data = await getMyTournaments();
            setTournaments(data);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        }
    };

    const handleCreateTournament = async (name: string, description: string) => {
        if (!currentUserId) return;
        try {
            const tournament = await createTournament({
                name,
                description,
                director_id: currentUserId,
                status: 'draft'
            });
            setTournaments([tournament, ...tournaments]);
            setShowCreateTournament(false);
            // Navigate to the new tournament directly
            navigate(`/director/${tournament.id}`);
        } catch (error) {
            console.error('Error creating tournament:', error);
        }
    };

    if (loading) {
        return (
            <ArenaLayout>
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nsp-teal"></div>
                </div>
            </ArenaLayout>
        );
    }

    return (
        <ArenaLayout title="Director Lobby">
            <div className="max-w-4xl mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Your Tournaments</h1>
                        <p className="text-gray-500">Manage and create tournaments</p>
                    </div>
                    <button
                        onClick={() => setShowCreateTournament(true)}
                        className="px-4 py-2 bg-nsp-teal text-white rounded-lg font-medium hover:bg-nsp-dark-teal transition-colors flex items-center gap-2"
                    >
                        <ArenaIcon name="plus" />
                        New Tournament
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tournaments.map(t => (
                        <div
                            key={t.id}
                            onClick={() => navigate(`/director/${t.id}`)}
                            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-nsp-teal hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-nsp-teal transition-colors truncate">
                                    {t.name}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${t.status === 'active' ? 'bg-green-100 text-green-700' :
                                    t.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                    {t.status}
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2 h-10">
                                {t.description || 'No description provided.'}
                            </p>
                            <div className="flex items-center text-gray-400 text-sm">
                                <ArenaIcon name="calendar" size={14} className="mr-1" />
                                <span>{new Date(t.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}

                    {tournaments.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                            <ArenaIcon name="trophy" className="text-gray-300 text-5xl mb-3 mx-auto" />
                            <h3 className="text-gray-700 font-bold mb-1">No tournaments found</h3>
                            <p className="text-gray-500 mb-4">Get started by creating your first tournament.</p>
                            <button
                                onClick={() => setShowCreateTournament(true)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Create Tournament
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <CreateTournamentModal
                isOpen={showCreateTournament}
                onClose={() => setShowCreateTournament(false)}
                onCreate={handleCreateTournament}
            />
        </ArenaLayout>
    );
};

// ============================================
// MODAL: Create Tournament
// ============================================
const CreateTournamentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Create Tournament</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nsp-teal focus:border-transparent outline-none"
                            placeholder="Tournament name"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nsp-teal focus:border-transparent outline-none"
                            rows={3}
                            placeholder="Optional description"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                            Cancel
                        </button>
                        <button
                            onClick={() => onCreate(name, description)}
                            disabled={!name.trim()}
                            className="px-4 py-2 bg-nsp-teal text-white rounded-lg hover:bg-nsp-dark-teal disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                            Create & Enter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArenaLobby;
