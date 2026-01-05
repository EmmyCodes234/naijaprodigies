import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { User } from '../../types';
import { getSuggestedFollows } from '../../services/onboardingService';
import { followUser, unfollowUser } from '../../services/userService';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';

interface SuggestedFollowsStepProps {
    userId: string;
    onNext: () => void;
    onSkip: () => void;
}

const SuggestedFollowsStep: React.FC<SuggestedFollowsStepProps> = ({ userId, onNext, onSkip }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const data = await getSuggestedFollows(userId, 10);
                setUsers(data);
            } catch (error) {
                console.error('Failed to load suggestions:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSuggestions();
    }, [userId]);

    const handleFollow = async (targetUserId: string) => {
        setLoadingUsers(prev => new Set(prev).add(targetUserId));
        try {
            if (followedIds.has(targetUserId)) {
                await unfollowUser(userId, targetUserId);
                setFollowedIds(prev => {
                    const next = new Set(prev);
                    next.delete(targetUserId);
                    return next;
                });
            } else {
                await followUser(userId, targetUserId);
                setFollowedIds(prev => new Set(prev).add(targetUserId));
            }
        } catch (error) {
            console.error('Failed to follow/unfollow:', error);
        } finally {
            setLoadingUsers(prev => {
                const next = new Set(prev);
                next.delete(targetUserId);
                return next;
            });
        }
    };

    const handleFollowAll = async () => {
        const unfollowedUsers = users.filter(u => !followedIds.has(u.id));
        for (const user of unfollowedUsers) {
            setLoadingUsers(prev => new Set(prev).add(user.id));
            try {
                await followUser(userId, user.id);
                setFollowedIds(prev => new Set(prev).add(user.id));
            } catch (error) {
                console.error(`Failed to follow ${user.handle}:`, error);
            } finally {
                setLoadingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(user.id);
                    return next;
                });
            }
        }
    };

    return (
        <div className="min-h-full flex flex-col px-6 py-16">
            <div className="max-w-lg mx-auto w-full flex-1">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-black text-gray-900 mb-2">
                        Follow some accounts
                    </h1>
                    <p className="text-gray-500">
                        Stay connected with the community
                    </p>
                </div>

                {/* Follow all button */}
                {users.length > 0 && followedIds.size < users.length && (
                    <button
                        onClick={handleFollowAll}
                        className="w-full mb-6 py-2.5 px-4 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Follow all
                    </button>
                )}

                {/* Users list */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Icon icon="line-md:loading-twotone-loop" width="40" height="40" className="text-nsp-teal" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Icon icon="ph:users" width="48" height="48" className="mx-auto mb-4 opacity-50" />
                        <p>No suggestions available yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {users.map((user) => {
                            const isFollowed = followedIds.has(user.id);
                            const isLoadingThis = loadingUsers.has(user.id);

                            return (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
                                >
                                    <Avatar user={user} className="w-12 h-12 rounded-full" />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                                            {user.verified && (
                                                <VerifiedBadge type={user.verification_type || 'green'} size="sm" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">@{user.handle}</p>
                                    </div>

                                    <button
                                        onClick={() => handleFollow(user.id)}
                                        disabled={isLoadingThis}
                                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${isFollowed
                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                : 'bg-gray-900 text-white hover:bg-gray-800'
                                            } disabled:opacity-50`}
                                    >
                                        {isLoadingThis ? (
                                            <Icon icon="line-md:loading-twotone-loop" width="16" height="16" />
                                        ) : isFollowed ? (
                                            'Following'
                                        ) : (
                                            'Follow'
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom buttons */}
            <div className="max-w-md mx-auto w-full pt-6 space-y-3">
                <button
                    onClick={onNext}
                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                    {followedIds.size > 0 ? 'Continue' : 'Continue without following'}
                </button>
                <button
                    onClick={onSkip}
                    className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
};

export default SuggestedFollowsStep;
