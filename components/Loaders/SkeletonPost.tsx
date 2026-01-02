import React from 'react';

const SkeletonPost = () => {
    return (
        <div className="border-b border-gray-100 p-4 w-full animate-pulse">
            <div className="flex gap-3">
                {/* Avatar Skeleton */}
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/6" />
                    </div>

                    {/* Text Body */}
                    <div className="space-y-2 mb-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>

                    {/* Image Placeholder (Optional - show sometimes?) */}
                    {/* <div className="h-48 bg-gray-200 rounded-2xl mb-3" /> */}

                    {/* Actions Bar */}
                    <div className="flex justify-between max-w-[425px] mt-2">
                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonPost;
