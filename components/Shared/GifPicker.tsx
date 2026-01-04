import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { getTrendingGifs, searchGifs, GifResult } from '../../services/gifService';

interface GifPickerProps {
    onSelect: (gif: GifResult) => void;
    onClose: () => void;
}

const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState<GifResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [nextPos, setNextPos] = useState('');
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const loadGifs = async (isNewQuery: boolean = false, currentQuery: string = query) => {
        setIsLoading(true);
        try {
            const pos = isNewQuery ? '' : nextPos;
            const data = currentQuery.trim()
                ? await searchGifs(currentQuery, 20, pos)
                : await getTrendingGifs(20, pos);

            if (!data.gifs || data.gifs.length === 0) {
                if (isNewQuery) setGifs([]);
            } else {
                setGifs(prev => isNewQuery ? data.gifs : [...prev, ...data.gifs]);
                setNextPos(data.nextPos || '');
            }
        } catch (error) {
            console.error('Failed to load GIFs', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadGifs(true, '');
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            loadGifs(true, val);
        }, 500);
    };

    return (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[320px] h-[400px] flex flex-col overflow-hidden z-50">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                <div className="relative flex-1">
                    <Icon icon="ph:magnifying-glass" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" />
                    <input
                        type="text"
                        value={query}
                        onChange={handleSearch}
                        placeholder="Search GIFs..."
                        className="w-full bg-gray-100 text-black text-sm pl-8 pr-3 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:bg-white transition-all"
                        autoFocus
                    />
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Icon icon="ph:x-bold" width="16" height="16" className="text-gray-500" />
                </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                <div className="columns-2 gap-2 space-y-2">
                    {gifs.map((gif) => (
                        <div
                            key={gif.id}
                            onClick={() => onSelect(gif)}
                            className="cursor-pointer rounded-lg overflow-hidden relative group break-inside-avoid"
                        >
                            <img
                                src={gif.preview}
                                alt={gif.title}
                                className="w-full h-auto object-cover bg-gray-100"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                    ))}
                </div>

                {isLoading && (
                    <div className="py-4 text-center">
                        <Icon icon="line-md:loading-twotone-loop" width="24" height="24" className="text-nsp-teal mx-auto" />
                    </div>
                )}

                {!isLoading && gifs.length > 0 && nextPos && (
                    <button
                        onClick={() => loadGifs(false)}
                        className="w-full py-2 text-sm text-center text-nsp-teal font-bold hover:bg-gray-50 rounded-lg mt-2"
                    >
                        Load More
                    </button>
                )}

                {!isLoading && gifs.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                        No GIFs found
                    </div>
                )}
            </div>

            {/* Footer Attribution */}
            <div className="p-1 bg-gray-50 text-[10px] text-gray-400 text-center uppercase tracking-wider font-bold">
                Powered by Tenor
            </div>
        </div>
    );
};

export default GifPicker;
