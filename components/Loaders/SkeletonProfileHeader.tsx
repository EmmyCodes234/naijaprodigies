import React from 'react';

const SkeletonProfileHeader = () => {
    return (
        <div className="max-w-2xl mx-auto animate-pulse">
            {/* Cover Image */}
            <div className="h-48 bg-gray-200 w-full" />

            <div className="px-4 pb-4">
                {/* Avatar */}
                <div className="relative -mt-16 mb-4">
                    <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-300" />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mb-4">
                    <div className="h-10 w-24 bg-gray-200 rounded-full" />
                    <div className="h-10 w-24 bg-gray-200 rounded-full" />
                </div>

                {/* User Info */}
                <div className="mb-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>

                {/* Bio */}
                <div className="space-y-2 mb-4">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>

                {/* Rank Badge */}
                <div className="h-6 w-24 bg-gray-200 rounded-full mb-4" />

                {/* Stats */}
                <div className="flex gap-4">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mt-4 flex">
                <div className="flex-1 py-4 flex justify-center"><div className="h-4 w-12 bg-gray-200 rounded" /></div>
                <div className="flex-1 py-4 flex justify-center"><div className="h-4 w-12 bg-gray-200 rounded" /></div>
                <div className="flex-1 py-4 flex justify-center"><div className="h-4 w-12 bg-gray-200 rounded" /></div>
            </div>
        </div>
    );
};

export default SkeletonProfileHeader;
