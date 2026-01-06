import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaIcon } from '../Arena/ArenaIcons';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface ArenaLayoutProps {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
    showBackButton?: boolean;
}

interface Profile {
    display_name?: string;
    woogles_username?: string;
}

const ArenaLayout: React.FC<ArenaLayoutProps> = ({
    children,
    title = 'Tournament Director',
    actions,
    showBackButton = true
}) => {
    const navigate = useNavigate();
    const { profile: userProfile } = useCurrentUser();
    const profile = userProfile as Profile | null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Navigation Bar - Distraction Free */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    {showBackButton && (
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors group"
                            title="Back to NSP Feed"
                        >
                            <ArenaIcon name="arrow-left" className="group-hover:text-gray-900" />
                        </button>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-nsp-teal rounded-lg flex items-center justify-center text-white font-bold">
                            <ArenaIcon name="trophy" size={18} />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 leading-none">{title}</h1>
                            <span className="text-xs text-gray-500 font-medium">NSP Arena</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {actions}

                    <div className="h-6 w-px bg-gray-200 mx-2" />

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-gray-900">{profile?.display_name || 'Director'}</div>
                            <div className="text-xs text-gray-500">@{profile?.woogles_username || 'user'}</div>
                        </div>
                        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                            {(profile?.display_name?.[0] || 'D').toUpperCase()}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6">
                {children}
            </main>
        </div>
    );
};

export default ArenaLayout;
