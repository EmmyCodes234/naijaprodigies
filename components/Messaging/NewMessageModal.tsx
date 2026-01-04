import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { searchUsers } from '../../services/userService';
import { getAvatarUrl } from '../../utils/userUtils';
import VerifiedBadge from '../Shared/VerifiedBadge';

interface NewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
}

const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen, onClose, currentUser }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim()) {
                setIsLoading(true);
                try {
                    const users = await searchUsers(query);
                    // Filter out current user
                    setResults(users.filter(u => u.id !== currentUser?.id));
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, currentUser]);

    if (!isOpen) return null;

    const handleSelectUser = (userId: string) => {
        // Navigate with query param to trigger conversation creation in Messages.tsx
        navigate(`/messages?user=${userId}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-[600px] h-[80vh] md:h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <Icon icon="ph:x" width="20" height="20" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">New Message</h2>
                    </div>
                    {/* Optional: 'Next' button if supporting multi-select later */}
                </div>

                {/* Search Input */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Icon icon="ph:magnifying-glass" className="text-nsp-teal" width="24" height="24" />
                        <input
                            type="text"
                            placeholder="Search people"
                            className="w-full text-lg outline-none placeholder-gray-400 text-black"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <Icon icon="line-md:loading-twotone-loop" className="mx-auto mb-2 text-nsp-teal" width="32" height="32" />
                            Searching...
                        </div>
                    ) : results.length > 0 ? (
                        <div className="py-2">
                            {results.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user.id)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <img src={getAvatarUrl(user)} alt={user.name} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-900">{user.name}</span>
                                            <VerifiedBadge user={user} size={16} />
                                        </div>
                                        <span className="text-gray-500 text-sm">@{user.handle}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : query.trim() ? (
                        <div className="p-8 text-center text-gray-500">
                            No people found
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            Try searching for people to message
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewMessageModal;
