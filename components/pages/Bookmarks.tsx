import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getSavedPosts } from '../../services/postService';
import { Post } from '../../types';
import PostCard from '../Social/PostCard';
import { Link } from 'react-router-dom';

const Bookmarks: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSavedPosts = async () => {
            if (!currentUser) return;

            try {
                setIsLoading(true);
                const posts = await getSavedPosts(currentUser.id);
                setSavedPosts(posts);
            } catch (error) {
                console.error('Error fetching saved posts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSavedPosts();
    }, [currentUser]);

    const removePostFromList = (postId: string) => {
        setSavedPosts(prev => prev.filter(p => p.id !== postId));
    };

    return (
        <SocialLayout>
            {/* Sticky Header */}
            <div className="sticky top-[60px] md:top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/feed" className="md:hidden">
                        <Icon icon="ph:arrow-left-bold" className="text-gray-700" width="20" height="20" />
                    </Link>
                    <div>
                        <h2 className="font-bold text-xl text-gray-900">Bookmarks</h2>
                        <p className="text-xs text-gray-500">@{currentUser?.handle}</p>
                    </div>
                </div>
            </div>

            <div className="pb-20">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Icon icon="line-md:loading-twotone-loop" width="48" height="48" className="text-nsp-teal" />
                    </div>
                ) : savedPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Icon icon="ph:bookmark-simple" width="32" height="32" className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Save posts for later</h3>
                        <p className="text-gray-500 max-w-sm mb-6">
                            Bookmark posts to easily find them again in the future. No one else can see your bookmarks.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {savedPosts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                currentUserId={currentUser?.id || ''}
                                onPostUpdated={() => { }} // Optional: refresh list if post changes
                            />
                        ))}
                    </div>
                )}
            </div>
        </SocialLayout>
    );
};

export default Bookmarks;
