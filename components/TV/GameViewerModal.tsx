import React from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { LiveGame } from '../../services/tvService';

interface GameViewerModalProps {
    game: LiveGame | null;
    isOpen: boolean;
    onClose: () => void;
}

const GameViewerModal: React.FC<GameViewerModalProps> = ({ game, isOpen, onClose }) => {
    if (!game) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog
                    static
                    as={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    open={isOpen}
                    onClose={onClose}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
                >
                    {/* Backdrop */}
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">Watch Live</h3>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                            >
                                <Icon icon="ph:x-bold" width="16" />
                            </button>
                        </div>

                        {/* Main Content Area */}
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto bg-nsp-teal/10 rounded-2xl flex items-center justify-center mb-6 text-nsp-teal">
                                <Icon icon="ph:arrow-square-out-duotone" width="32" />
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                Leaving NSP
                            </h2>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                You are about to watch <strong>{game.player1_name} vs {game.player2_name}</strong> on Woogles.io.
                                The game will open in a new secure tab.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => window.open(game.game_url, '_blank')}
                                    className="w-full bg-nsp-teal hover:bg-nsp-dark-teal text-white py-3 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <span>Continue to Woogles.io</span>
                                    <Icon icon="ph:arrow-right-bold" />
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-lg font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </Dialog>
            )}
        </AnimatePresence>
    );
};

export default GameViewerModal;
