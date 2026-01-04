import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { User } from '../types';
import { getFollowers, getFollowing } from '../services/userService';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import FollowButton from './FollowButton';
import VerifiedBadge from './Shared/VerifiedBadge';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  userName: string;
}

const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  userId,
  type,
  userName
}) => {
  const navigate = useNavigate();
  const { profile: currentUser } = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = type === 'followers'
          ? await getFollowers(userId)
          : await getFollowing(userId);

        setUsers(data);
      } catch (err) {
        console.error(`Failed to load ${type}:`, err);
        setError(`Failed to load ${type}`);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, userId, type]);

  const handleUserClick = (clickedUserId: string) => {
    navigate(`/profile/${clickedUserId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {type === 'followers' ? `${userName}'s Followers` : `Following`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Icon icon="ph:x" width="20" height="20" className="text-gray-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4">
              <Icon icon="ph:warning-circle" width="48" height="48" className="text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Icon icon="ph:users" width="48" height="48" className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="cursor-pointer"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>

                    {/* User Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900 truncate">
                          {user.name}
                        </span>
                        <VerifiedBadge user={user} size={16} />
                      </div>
                      <p className="text-gray-500 text-sm truncate">@{user.handle}</p>
                      {user.bio && (
                        <p className="text-gray-700 text-sm mt-1 line-clamp-2">{user.bio}</p>
                      )}
                    </div>

                    {/* Follow Button or Rank Badge */}
                    <div className="flex-shrink-0">
                      {currentUser && currentUser.id !== user.id ? (
                        <FollowButton
                          targetUserId={user.id}
                          currentUserId={currentUser.id}
                        />
                      ) : user.rank ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-nsp-orange/10 text-nsp-orange rounded-full text-xs font-bold">
                          <Icon icon="ph:trophy" width="12" height="12" />
                          {user.rank}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
