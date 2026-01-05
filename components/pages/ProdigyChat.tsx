import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout'; // Or a new layout if we want full screen, but SocialLayout keeps sidebar
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { chatWithProdigy } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';


interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const ProdigyChat: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const { addToast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatWithProdigy(userMsg.content);

            if (response.isError) {
                addToast('error', response.content);
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.content || "I'm speecless.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error(error);
            addToast('error', 'Failed to get response');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestedPrompts = [
        "Roast my Scrabble skills",
        "Define 'Zyzzyva'",
        "Who is the GOAT of Scrabble?",
        "Tell me a Scrabble joke"
    ];

    return (
        <div className="flex flex-col h-screen bg-[#052120] text-gray-100 font-sans">
            {/* Simple Header for Mobile / Context */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#031514]">
                <div className="flex items-center gap-2">
                    <Icon icon="ph:sparkle-fill" className="text-nsp-yellow" width="24" height="24" />
                    <h1 className="text-xl font-bold tracking-wide">Prodigy AI</h1>
                </div>
                <button onClick={() => setMessages([])} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                    <Icon icon="ph:trash" /> Clear Chat
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-nsp-teal scrollbar-track-transparent">
                <div className="max-w-3xl mx-auto space-y-6">

                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center opacity-0 animate-fadeIn" style={{ opacity: 1 }}>
                            <div className="w-20 h-20 bg-gradient-to-br from-nsp-teal to-nsp-dark-teal rounded-full flex items-center justify-center mb-6 shadow-glow">
                                <Icon icon="ph:brain-fill" className="text-white w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Hello, I'm Prodigy.</h2>
                            <p className="text-gray-400 mb-8">Your sentient, slightly savage Scrabble companion.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                                {suggestedPrompts.map(prompt => (
                                    <button
                                        key={prompt}
                                        onClick={() => { setInput(prompt); handleSend(); }} // Need to set input then send? Or just send. direct call better.
                                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-nsp-teal/50 rounded-xl text-left text-sm transition-all"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-nsp-teal flex-shrink-0 flex items-center justify-center mt-1">
                                    <Icon icon="ph:sparkle-fill" className="text-white w-4 h-4" />
                                </div>
                            )}

                            <div className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl ${msg.role === 'user'
                                ? 'bg-nsp-teal text-white rounded-br-none'
                                : 'bg-white/10 text-gray-100 rounded-bl-none'
                                }`}>
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {msg.content}
                                </div>
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center mt-1 overflow-hidden">
                                    {currentUser?.avatar ? (
                                        <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                                    ) : (
                                        <Icon icon="ph:user-fill" className="text-gray-300 w-4 h-4" />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-4 justify-start">
                            <div className="w-8 h-8 rounded-full bg-nsp-teal flex-shrink-0 flex items-center justify-center mt-1">
                                <Icon icon="ph:sparkle-fill" className="text-white w-4 h-4 animate-pulse" />
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl rounded-bl-none">
                                <Icon icon="line-md:loading-twotone-loop" className="text-gray-400 w-6 h-6" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-[#031514] border-t border-white/10">
                <div className="max-w-3xl mx-auto relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Prodigy anything..."
                        className="w-full bg-[#052120] border border-white/20 rounded-2xl pl-4 pr-12 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-nsp-teal focus:ring-1 focus:ring-nsp-teal resize-none scrollbar-hide min-h-[60px] max-h-[200px]"
                        rows={1}
                        style={{ height: 'auto', minHeight: '60px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-3 bottom-3 p-2 bg-nsp-teal text-white rounded-lg hover:bg-nsp-dark-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Icon icon="ph:paper-plane-right-fill" width="20" height="20" />
                    </button>
                </div>
                <p className="text-center text-xs text-gray-500 mt-2">
                    Prodigy may display inaccurate info, including about people, so double-check its responses.
                </p>
            </div>
        </div>
    );
};

export default ProdigyChat;
