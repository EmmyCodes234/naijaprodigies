import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGist } from '../../contexts/GistContext';

const GistReactions: React.FC = () => {
    const { reactions } = useGist();

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            <AnimatePresence>
                {reactions.map((reaction) => (
                    <motion.div
                        key={reaction.id}
                        initial={{ y: '100%', opacity: 0, scale: 0.5, x: `${Math.random() * 80 + 10}%` }}
                        animate={{
                            y: ['100%', '20%', '0%'],
                            opacity: [0, 1, 0],
                            scale: [0.5, 1.5, 1],
                            rotate: [0, Math.random() * 40 - 20, 0]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.5, ease: 'easeOut' }}
                        className="absolute text-4xl"
                    >
                        {reaction.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default GistReactions;
