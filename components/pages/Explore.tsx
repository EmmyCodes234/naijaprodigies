import React, { useState, useEffect } from 'react';
import { getTrends, searchPosts, likePost, unlikePost, createComment } from '../../services/postService';
import { searchUsers, followUser } from '../../services/userService';
import { fetchNews, getRelativeTime, NewsArticle } from '../../services/newsService';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Post, User } from '../../types';
import PostCard from '../Social/PostCard';
import { getAvatarUrl } from '../../utils/userUtils';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '../Shared/VerifiedBadge';
import ExploreSettings from '../Onboarding/ExploreSettings';

type ExploreTab = 'for-you' | 'trending' | 'news' | 'sports' | 'entertainment';

const Explore: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<ExploreTab>('for-you');
    const [isLoading, setIsLoading] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Data
    const [trendingTopics, setTrendingTopics] = useState<{ tag: string; count: number; category?: string }[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
    const [isLoadingNews, setIsLoadingNews] = useState(true);

    // Fetch trends on mount
    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const data = await getTrends(20);
                // Add mock categories for display
                const categories = ['Sports · Trending', 'Trending in Nigeria', 'Entertainment · Trending', 'Politics · Trending', 'Sports · Trending'];
                const enrichedData = data.map((item, i) => ({
                    ...item,
                    category: categories[i % categories.length]
                }));
                setTrendingTopics(enrichedData);
            } catch (error) {
                console.error('Failed to fetch trends', error);
            }
        };
        fetchTrends();
    }, []);

    // Fetch news on mount
    useEffect(() => {
        const loadNews = async () => {
            try {
                const topics = activeTab === 'sports'
                    ? ['sports', 'football', 'AFCON']
                    : activeTab === 'entertainment'
                        ? ['entertainment', 'music', 'movies']
                        : activeTab === 'news'
                            ? ['Nigeria', 'Africa', 'breaking news']
                            : ['Scrabble', 'Nigeria', 'word games'];

                const news = await fetchNews(topics, 5);
                setNewsArticles(news);
            } catch (error) {
                console.error('Failed to load news:', error);
            } finally {
                setIsLoadingNews(false);
            }
        };
        setIsLoadingNews(true);
        loadNews();
    }, [activeTab]);

    const performSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsLoading(true);
        try {
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
        }
    };

    const handleTrendClick = (tag: string) => {
        setSearchQuery(tag);
        performSearch(tag);
    };

    // Post Card Handlers
    const handleLike = async (postId: string) => {
        if (!currentUser) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const isLiked = post.is_liked_by_current_user;

        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1, is_liked_by_current_user: !isLiked } : p));

        try {
            if (isLiked) await unlikePost(postId, currentUser.id);
            else await likePost(postId, currentUser.id);
        } catch (error) {
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

    const tabs: { id: ExploreTab; label: string }[] = [
        { id: 'for-you', label: 'For You' },
        { id: 'trending', label: 'Trending' },
        { id: 'news', label: 'News' },
        { id: 'sports', label: 'Sports' },
        { id: 'entertainment', label: 'Entertainment' },
    ];

    return (
        <SocialLayout>
            <ExploreSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                {/* Search Bar */}
                <div className="px-4 py-2 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Icon icon="ph:magnifying-glass" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-gray-100 border-none rounded-full py-2.5 pl-11 pr-4 focus:ring-2 focus:ring-nsp-teal/50 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-500 text-[15px]"
                        />
                    </div>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Icon icon="ph:gear" width="20" height="20" className="text-gray-700" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 px-6 py-3 relative font-medium text-[15px] transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'text-gray-900 font-bold'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-nsp-teal rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {isLoading ? (
                    <div className="p-8 text-center">
                        <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal mx-auto" />
                    </div>
                ) : (
                    <>
                        {/* Today's News / Category News Section */}
                        {activeTab !== 'trending' && (
                            <div className="border-b border-gray-100">
                                <h3 className="font-extrabold text-[20px] text-gray-900 px-4 pt-4 pb-2">
                                    {activeTab === 'for-you' ? "Today's News" :
                                        activeTab === 'news' ? "Latest News" :
                                            activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                </h3>

                                {isLoadingNews ? (
                                    <div className="px-4 pb-4">
                                        <div className="animate-pulse space-y-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-16 bg-gray-100 rounded-lg" />
                                            ))}
                                        </div>
                                    </div>
                                ) : newsArticles.length > 0 ? (
                                    <div className="space-y-0">
                                        {newsArticles.slice(0, 4).map((article, index) => (
                                            <a
                                                key={index}
                                                href={article.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                                            >
                                                <h4 className="font-bold text-[15px] text-gray-900 leading-tight mb-1.5 line-clamp-2 hover:text-nsp-teal transition-colors">
                                                    {article.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                                                    <div className="flex -space-x-1">
                                                        <div className="w-4 h-4 rounded-full bg-blue-500 border border-white" />
                                                        <div className="w-4 h-4 rounded-full bg-green-500 border border-white" />
                                                    </div>
                                                    <span>{article.publishedAt ? getRelativeTime(article.publishedAt) : ''}</span>
                                                    <span>•</span>
                                                    <span>{article.source || 'News'}</span>
                                                    <span>•</span>
                                                    <span>{Math.floor(Math.random() * 50) + 1}K posts</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 pb-4 text-gray-500 text-sm">No news available</div>
                                )}
                            </div>
                        )}

                        {/* Trending Topics */}
                        {(activeTab === 'for-you' || activeTab === 'trending') && (
                            <div>
                                {trendingTopics.length > 0 ? (
                                    trendingTopics.map((topic, i) => (
                                        <div
                                            key={i}
                                            onClick={() => handleTrendClick(topic.tag)}
                                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50"
                                        >
                                            <div>
                                                <p className="text-gray-500 text-[13px] mb-0.5">
                                                    {topic.category || 'Trending'}
                                                </p>
                                                <p className="font-bold text-gray-900 text-[15px]">{topic.tag}</p>
                                                <p className="text-gray-500 text-[13px] mt-0.5">
                                                    {topic.count >= 1000
                                                        ? `${(topic.count / 1000).toFixed(0)}K posts`
                                                        : `${topic.count} posts`
                                                    }
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 hover:text-nsp-teal transition-colors text-gray-400"
                                            >
                                                <Icon icon="ph:dots-three-bold" width="18" height="18" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500">No trends right now</div>
                                )}
                            </div>
                        )}

                        {/* Search Results - Posts */}
                        {posts.length > 0 && (
                            <div className="border-t border-gray-100">
                                <h3 className="font-bold text-lg text-gray-900 px-4 py-3 border-b border-gray-100">
                                    Posts for "{searchQuery}"
                                </h3>
                                {posts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        currentUser={currentUser}
                                        onLike={handleLike}
                                        onReply={handleReply}
                                        onReRack={() => { }}
                                        onDelete={() => { }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Search Results - People */}
                        {users.length > 0 && (
                            <div className="border-t border-gray-100">
                                <h3 className="font-bold text-lg text-gray-900 px-4 py-3 border-b border-gray-100">
                                    People
                                </h3>
                                <div className="divide-y divide-gray-100">
                                    {users.map(user => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/profile/${user.id}`)}
                                        >
                                            <img src={getAvatarUrl(user)} alt={user.name || 'User'} className="w-12 h-12 rounded-full object-cover" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1">
                                                    <h4 className="font-bold text-gray-900 hover:underline">{user.name || 'Unknown User'}</h4>
                                                    <VerifiedBadge user={user} size={16} />
                                                </div>
                                                <p className="text-gray-500 text-sm">@{user.handle}</p>
                                                {user.bio && <p className="text-gray-800 text-sm mt-1 line-clamp-2">{user.bio}</p>}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); followUser(currentUser?.id || '', user.id); }}
                                                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold py-1.5 px-4 rounded-full transition-colors"
                                            >
                                                Follow
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </SocialLayout>
    );
};

export default Explore;
