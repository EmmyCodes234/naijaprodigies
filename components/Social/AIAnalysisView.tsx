
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { analyzePost } from '../../services/aiService';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface AIAnalysisViewProps {
    postContent: string;
    initialPrompt?: string;
    onClose: () => void;
}

const AIAnalysisView: React.FC<AIAnalysisViewProps> = ({ postContent, initialPrompt, onClose }) => {
    const [prompt, setPrompt] = useState(initialPrompt || '');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { profile } = useCurrentUser();
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-search if initialPrompt is provided
    useEffect(() => {
        if (initialPrompt) {
            handleAnalysis(initialPrompt);
        } else {
            inputRef.current?.focus();
        }
    }, []);

    const handleAnalysis = async (query: string) => {
        if (!query.trim()) return;
        setIsLoading(true);
        setResponse(''); // Clear previous

        // Simulating "Streaming" feel by just showing loading
        const result = await analyzePost(postContent, query);
        setResponse(result.content);
        setIsLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-nsp-teal/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-nsp-teal/10 to-transparent px-4 py-2 flex items-center justify-between border-b border-nsp-teal/10">
                <div className="flex items-center gap-2">
                    <Icon icon="ph:sparkle-fill" className="text-nsp-teal" />
                    <span className="font-bold text-sm text-nsp-dark-teal">Prodigy AI</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <Icon icon="ph:x" />
                </button>
            </div>

            {/* Content Area */}
            <div className="p-4">
                {response ? (
                    <div className="mb-4">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-nsp-teal flex items-center justify-center text-white flex-shrink-0">
                                <Icon icon="ph:robot-bold" />
                            </div>
                            <div className="flex-1">
                                <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                                    {response}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => navigator.clipboard.writeText(response)}
                                        className="text-xs text-gray-500 font-bold hover:text-nsp-teal flex items-center gap-1"
                                    >
                                        <Icon icon="ph:copy" /> Copy
                                    </button>
                                    <button
                                        className="text-xs text-gray-500 font-bold hover:text-nsp-teal flex items-center gap-1"
                                    >
                                        <Icon icon="ph:arrow-u-up-left" /> Reply with this
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-4 text-center py-6">
                        {!isLoading && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button onClick={() => { setPrompt("Summarize this"); handleAnalysis("Summarize this"); }} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors">Summarize</button>
                                <button onClick={() => { setPrompt("Explain like I'm 5"); handleAnalysis("Explain like I'm 5"); }} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors">Explain</button>
                                <button onClick={() => { setPrompt("Roast this post savagely"); handleAnalysis("Roast this post savagely"); }} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors">Roast 🔥</button>
                                <button onClick={() => { setPrompt("Is this true?"); handleAnalysis("Is this true?"); }} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors">Fact Check</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Input Area */}
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalysis(prompt)}
                        placeholder="Ask Prodigy anything..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-4 pr-10 text-sm text-gray-900 focus:ring-2 focus:ring-nsp-teal/50 outline-none transition-all"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleAnalysis(prompt)}
                        disabled={isLoading || !prompt.trim()}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-nsp-teal text-white rounded-full hover:bg-nsp-dark-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? <Icon icon="line-md:loading-twotone-loop" /> : <Icon icon="ph:arrow-up-bold" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIAnalysisView;
