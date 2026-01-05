import React from 'react';
import { User } from '../../types';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';

interface MentionListProps {
    users: User[];
    onSelect: (user: User) => void;
    activeIndex: number;
}

const MentionList: React.FC<MentionListProps> = ({ users, onSelect, activeIndex }) => {
    if (users.length === 0) return null;

    return (
        <div className="absolute left-0 bottom-full mb-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="max-h-60 overflow-y-auto">
                {users.map((user, index) => (
                    <div
                        key={user.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${index === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent closing
                            onSelect(user);
                        }}
                        onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from textarea
                    >
                        <Avatar user={user} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-gray-900 text-[15px] truncate">{user.name}</span>
                                <VerifiedBadge user={user} size={16} />
                            </div>
                            <div className="text-gray-500 text-[14px] truncate">@{user.handle}</div>
                        </div>
                        {/* Optional: Add "Prodigy" label if it's the bot */}
                        {user.handle.toLowerCase() === 'prodigy' && (
                            <span className="bg-nsp-teal/10 text-nsp-teal text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">AI</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MentionList;
