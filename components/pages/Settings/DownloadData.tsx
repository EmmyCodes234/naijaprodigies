import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../../Layout/SocialLayout';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getUserPosts } from '../../../services/userService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';

const DownloadData: React.FC = () => {
    const { profile: currentUser, loading: userLoading } = useCurrentUser();
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();
    const { addToast } = useToast();

    const handleDownload = async () => {
        if (!currentUser) return;

        try {
            setIsGenerating(true);
            addToast('info', 'Generating data archive...');

            // Fetch all data
            const [posts, likedPosts, mediaPosts] = await Promise.all([
                getUserPosts(currentUser.id, 'posts'),
                getUserPosts(currentUser.id, 'liked'),
                getUserPosts(currentUser.id, 'media')
            ]);

            const exportData = {
                user: currentUser,
                stats: {
                    total_posts: posts.length,
                    total_likes_given: likedPosts.length,
                    total_media_posts: mediaPosts.length
                },
                posts: posts,
                liked_posts: likedPosts,
                media_posts: mediaPosts,
                export_date: new Date().toISOString()
            };

            // Create blob and download link
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nsp-data-${currentUser.handle}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addToast('success', 'Data downloaded successfully');
        } catch (error) {
            console.error('Failed to download data', error);
            addToast('error', 'Failed to generate download');
        } finally {
            setIsGenerating(false);
        }
    };

    if (userLoading) {
        return (
            <SocialLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
                </div>
            </SocialLayout>
        );
    }

    return (
        <SocialLayout>
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Icon icon="ph:arrow-left-bold" width="20" height="20" />
                </button>
                <h2 className="font-bold text-xl text-gray-900">Download your data</h2>
            </div>

            <div className="p-4 max-w-xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-6 mx-auto">
                        <Icon icon="ph:download-simple-fill" className="text-blue-500" width="32" height="32" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                        Get a copy of your data
                    </h3>

                    <p className="text-gray-500 text-center mb-8 text-sm leading-relaxed">
                        You can request a file containing your information, including your profile details, posts, and media.
                        This file will be in machine-readable JSON format.
                    </p>

                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className={`w-full py-3.5 rounded-full font-bold text-white transition-all flex items-center justify-center gap-2
                            ${isGenerating
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-black shadow-md hover:shadow-lg'
                            }
                        `}
                    >
                        {isGenerating ? (
                            <>
                                <Icon icon="line-md:loading-twotone-loop" width="20" height="20" />
                                Generating Archive...
                            </>
                        ) : (
                            <>
                                <Icon icon="ph:file-archive-bold" width="20" height="20" />
                                Request Archive
                            </>
                        )}
                    </button>
                </div>
            </div>
        </SocialLayout>
    );
};

export default DownloadData;
