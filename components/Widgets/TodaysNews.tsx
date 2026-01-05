import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { fetchNews, getRelativeTime, NewsArticle } from '../../services/newsService';

interface TodaysNewsProps {
    className?: string;
}

const TodaysNews: React.FC<TodaysNewsProps> = ({ className = '' }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        const loadNews = async () => {
            try {
                const news = await fetchNews(['Scrabble', 'Nigeria', 'word games'], 5);
                setArticles(news);
            } catch (error) {
                console.error('Failed to load news:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadNews();
    }, []);

    if (!isExpanded) {
        return null;
    }

    return (
        <div className={`bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 ${className}`}>
            <div className="p-4 py-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-[20px] text-gray-900">Today's News</h3>
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <Icon icon="ph:x" width="18" height="18" className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Icon icon="line-md:loading-twotone-loop" width="28" height="28" className="text-nsp-teal" />
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-gray-500 text-sm py-4 text-center">
                        No news available right now
                    </div>
                ) : (
                    <div className="space-y-0">
                        {articles.map((article, index) => (
                            <a
                                key={index}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:bg-gray-100 -mx-4 px-4 py-3 transition-colors group"
                            >
                                {/* Article Title */}
                                <h4 className="font-bold text-[15px] text-gray-900 leading-tight mb-1.5 group-hover:text-nsp-teal transition-colors line-clamp-2">
                                    {article.title}
                                </h4>

                                {/* Meta info */}
                                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                                    {/* Source avatars (mock with colored circles) */}
                                    <div className="flex -space-x-1">
                                        <div className="w-4 h-4 rounded-full bg-blue-500 border border-white" />
                                        <div className="w-4 h-4 rounded-full bg-green-500 border border-white" />
                                    </div>
                                    <span>{article.publishedAt ? getRelativeTime(article.publishedAt) : ''}</span>
                                    <span>•</span>
                                    <span>{article.source || 'News'}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TodaysNews;
