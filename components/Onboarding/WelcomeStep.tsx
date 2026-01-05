import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface WelcomeStepProps {
    onNext: () => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
    const [showContent, setShowContent] = useState(false);
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        // Staggered animations
        const timer1 = setTimeout(() => setShowContent(true), 300);
        const timer2 = setTimeout(() => setShowButton(true), 800);
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <div className="min-h-full flex flex-col items-center justify-center px-8 py-12 bg-gradient-to-br from-nsp-teal/5 via-white to-nsp-teal/10">
            {/* Logo animation */}
            <div className={`mb-8 transition-all duration-700 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                <img
                    src="/nsp_feed_logo.png"
                    alt="NSP Feed"
                    className="w-24 h-24 object-contain"
                />
            </div>

            {/* Welcome text */}
            <div className={`text-center mb-12 transition-all duration-700 delay-100 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h1 className="text-3xl font-black text-gray-900 mb-3">
                    Welcome to NSP Feed
                </h1>
                <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                    The home for Nigeria's Scrabble community. Connect with players, join conversations, and stay updated.
                </p>
            </div>

            {/* Feature highlights */}
            <div className={`grid grid-cols-1 gap-4 mb-12 w-full max-w-sm transition-all duration-700 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-nsp-teal/10 rounded-full flex items-center justify-center">
                        <Icon icon="ph:chat-circle-dots" width="20" height="20" className="text-nsp-teal" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">Join the conversation</p>
                        <p className="text-sm text-gray-500">Post, reply, and engage</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-nsp-teal/10 rounded-full flex items-center justify-center">
                        <Icon icon="ph:users" width="20" height="20" className="text-nsp-teal" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">Follow players</p>
                        <p className="text-sm text-gray-500">Connect with the community</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-nsp-teal/10 rounded-full flex items-center justify-center">
                        <Icon icon="ph:trophy" width="20" height="20" className="text-nsp-teal" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">Stay updated</p>
                        <p className="text-sm text-gray-500">Tournaments & results</p>
                    </div>
                </div>
            </div>

            {/* CTA Button */}
            <div className={`w-full max-w-sm transition-all duration-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <button
                    onClick={onNext}
                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                    Let's get started
                </button>
            </div>
        </div>
    );
};

export default WelcomeStep;
