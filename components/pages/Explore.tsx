import React, { useState, useEffect } from 'react';
import { getTrends, searchPosts, likePost, unlikePost, createReRack, deletePost, createComment } from '../../services/postService';
import { searchUsers, followUser } from '../../services/userService';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Post, User } from '../../types';
import PostCard from '../Social/PostCard';
import { getAvatarUrl } from '../../utils/userUtils';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '../Shared/VerifiedBadge';

const Explore: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'trending' | 'people' | 'posts'>('trending');
    const [isLoading, setIsLoading] = useState(false);

    // Data
    const [trendingTopics, setTrendingTopics] = useState<{ tag: string; count: number }[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const data = await getTrends(20);
                setTrendingTopics(data);
            } catch (error) {
                console.error('Failed to fetch trends', error);
            }
        };
        fetchTrends();
    }, []);

    const performSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsLoading(true);
        try {
            // Always fetch both for now, or depend on tab?
            // To be responsive, let's fetch based on tab, or fetch all?
            // X usually searches everything. Let's fetch both to populate tabs if user switches.

            const [postsResults, usersResults] = await Promise.all([
                searchPosts(query, 20, currentUser?.id),
                searchUsers(query)
            ]);

            setPosts(postsResults);
            setUsers(usersResults);

        } catch (error) {
            console.error('Search failed', error);
            addToast('error', 'Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            performSearch(searchQuery);
            // If on trending, switch to posts or people? Default to Posts usually.
            if (activeTab === 'trending') setActiveTab('posts');
        }
    };

    const handleTrendClick = (tag: string) => {
        setSearchQuery(tag);
        setActiveTab('posts');
        performSearch(tag);
    };

    // --- Post Card Handlers (Copied/Simplified from SocialFeed) ---
    const handleLike = async (postId: string) => {
        if (!currentUser) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const isLiked = post.is_liked_by_current_user;

        // Optimistic
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1, is_liked_by_current_user: !isLiked } : p));

        try {
            if (isLiked) await unlikePost(postId, currentUser.id);
            else await likePost(postId, currentUser.id);
        } catch (error) {
            // Revert
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: isLiked ? p.likes_count : p.likes_count + 1, is_liked_by_current_user: isLiked } : p));
        }
    };

    const handleReply = async (postId: string, content: string) => {
        if (!currentUser) return;
        try {
            await createComment(postId, currentUser.id, content);
            addToast('success', 'Reply sent');
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
        } catch (e) {
            addToast('error', 'Failed to reply');
        }
    };

    // ReRack and Delete skipped for brevity but can be added if needed for full fidelity.
    // Ideally these are part of a shared hook `usePostActions`.

    return (
        <SocialLayout>
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="px-4 py-3">
                    <div className="relative">
                        <Icon icon="ph:magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" />
                        <input
                            type="text"
                            placeholder="Search NSP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-nsp-teal/50 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex w-full px-2">
                    <button onClick={() => setActiveTab('trending')} className={`flex-1 py-3 relative font-medium text-sm transition-colors ${activeTab === 'trending' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Trending
                        {activeTab === 'trending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full mx-4"></div>}
                    </button>
                    <button onClick={() => setActiveTab('people')} className={`flex-1 py-3 relative font-medium text-sm transition-colors ${activeTab === 'people' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        People
                        {activeTab === 'people' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full mx-4"></div>}
                    </button>
                    <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 relative font-medium text-sm transition-colors ${activeTab === 'posts' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Posts
                        {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full mx-4"></div>}
                    </button>
                </div>
            </div>

            <div className="">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal mx-auto" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'trending' && (
                            <div className="space-y-0">
                                <h3 className="font-extrabold text-lg text-gray-900 px-4 py-3 border-b border-gray-100">Trends for you</h3>
                                {trendingTopics.length > 0 ? trendingTopics.map((topic, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handleTrendClick(topic.tag)}
                                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50"
                                    >
                                        <div>
                                            <p className="text-gray-500 text-xs mb-0.5 flex items-center gap-1">
                                                Trending <span className="w-0.5 h-0.5 bg-gray-400 rounded-full"></span> Nigerian Politics
                                            </p>
                                            <p className="font-bold text-gray-900 text-base">{topic.tag}</p>
                                            <p className="text-gray-500 text-xs mt-0.5">{topic.count} posts</p>
                                        </div>
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 hover:text-nsp-teal transition-colors text-gray-400">
                                            <Icon icon="ph:dots-three-bold" />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-gray-500">No trends right now</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'people' && (
                            <div>
                                {users.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {users.map(user => (
                                            <div key={user.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/profile/${user.id}`)}>
                                                <img src={getAvatarUrl(user)} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1">
                                                        <h4 className="font-bold text-gray-900 hover:underline">{user.name}</h4>
                                                        <VerifiedBadge user={user} size={16} />
                                                    </div>
                                                    <p className="text-gray-500 text-sm">@{user.handle}</p>
                                                    {user.bio && <p className="text-gray-800 text-sm mt-1 line-clamp-2">{user.bio}</p>}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); followUser(currentUser?.id || '', user.id); }}
                                                    className="bg-black hover:bg-gray-800 text-white text-sm font-bold py-1.5 px-4 rounded-full transition-colors"
                                                >
                                                    Follow
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Icon icon="ph:users-three" className="mx-auto text-gray-300 mb-4" width="64" height="64" />
                                        <p className="text-gray-900 font-bold mb-1">Search for people</p>
                                        <p className="text-gray-500 text-sm max-w-xs mx-auto">Find researchers, professors, and friends on NSP.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'posts' && (
                            <div>
                                {posts.length > 0 ? (
                                    <div>
                                        {posts.map(post => (
                                            <PostCard
                                                key={post.id}
                                                post={post}
                                                currentUser={currentUser}
                                                onLike={handleLike}
                                                onReply={handleReply}
                                                onReRack={() => { }} // Placeholder
                                                onDelete={() => { }} // Placeholder
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Icon icon="ph:article" className="mx-auto text-gray-300 mb-4" width="64" height="64" />
                                        <p className="text-gray-900 font-bold mb-1">No results for "{searchQuery}"</p>
                                        <p className="text-gray-500 text-sm max-w-xs mx-auto">Try searching for something else, or check your spelling.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </SocialLayout>
    );
};

export default Explore;
