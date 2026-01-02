import React, { useState, useEffect } from 'react';
import { getTrends } from '../../services/postService';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const Explore: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'trending' | 'people' | 'posts'>('trending');


    // Placeholder data for trending topics (replaced with real data)
    const [trendingTopics, setTrendingTopics] = useState<{ tag: string; count: number }[]>([]);

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


    return (
        <SocialLayout>
            {/* Sticky Header */}
            <div className="sticky top-[60px] md:top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="px-4 py-3">
                    <div className="relative">
                        <Icon icon="ph:magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="20" height="20" />
                        <input
                            type="text"
                            placeholder="Search NSP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-nsp-teal/50 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex w-full px-2">
                    <button
                        onClick={() => setActiveTab('trending')}
                        className={`flex-1 py-3 relative font-medium text-sm transition-colors ${activeTab === 'trending' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Trending
                        {activeTab === 'trending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full mx-4"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('people')}
                        className={`flex-1 py-3 relative font-medium text-sm transition-colors ${activeTab === 'people' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        People
                        {activeTab === 'people' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full mx-4"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-3 relative font-medium text-sm transition-colors ${activeTab === 'posts' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Posts
                        {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full mx-4"></div>}
                    </button>
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'trending' && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Trends for you</h3>
                        {trendingTopics.map((topic, i) => (
                            <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-gray-100">
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Trending within NSP</p>
                                    <p className="font-bold text-gray-900">{topic.tag}</p>
                                    <p className="text-gray-500 text-sm">{topic.count} posts</p>
                                </div>
                                <Icon icon="ph:dots-three-bold" className="text-gray-400" />
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'people' && (
                    <div className="text-center py-12">
                        <Icon icon="ph:users-three" className="mx-auto text-gray-300 mb-4" width="64" height="64" />
                        <p className="text-gray-500">Search for players and members to follow.</p>
                    </div>
                )}

                {activeTab === 'posts' && (
                    <div className="text-center py-12">
                        <Icon icon="ph:article" className="mx-auto text-gray-300 mb-4" width="64" height="64" />
                        <p className="text-gray-500">Search for posts, news, and updates.</p>
                    </div>
                )}
            </div>
        </SocialLayout>
    );
};

export default Explore;
