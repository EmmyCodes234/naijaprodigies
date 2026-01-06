import React, { useState, useEffect, useRef } from 'react';
import { ArenaIcon } from '../Arena/ArenaIcons';
import { searchWooglesUsers, WooglesUser } from '../../services/wooglesService';
import { useDebounce } from '../../hooks/useDebounce';

interface WooglesUserSearchProps {
    value: string;
    onChange: (username: string) => void;
    onSelect?: (user: WooglesUser) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

const WooglesUserSearch: React.FC<WooglesUserSearchProps> = ({
    value,
    onChange,
    onSelect,
    className = '',
    placeholder = "Enter Woogles Username...",
    disabled = false
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [debouncedValue] = useDebounce(inputValue, 300);
    const [results, setResults] = useState<WooglesUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync external value
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search effect
    useEffect(() => {
        const search = async () => {
            if (!debouncedValue || debouncedValue.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            const users = await searchWooglesUsers(debouncedValue);
            setResults(users);
            setLoading(false);
            setShowResults(true);
        };

        if (debouncedValue && debouncedValue !== value) {
            // Only search if typing, not if value was just set from parent (e.g. selection)
            // Actually, debouncedValue !== value check is tricky if parent updates slowly.
            // Let's just check if the input is focused effectively via showResults logic logic 
            // but here we just run search.
            search();
        }
    }, [debouncedValue]);

    const handleSelect = (user: WooglesUser) => {
        setInputValue(user.username);
        onChange(user.username);
        onSelect?.(user);
        setShowResults(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val); // Update parent immediately too, though valid only after verification? 
        // Parent usually waits for "Join" click so raw text is fine until validation.
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleChange}
                    onFocus={() => {
                        if (results.length > 0) setShowResults(true);
                    }}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nsp-teal focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {loading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-nsp-teal rounded-full" />
                    ) : (
                        <ArenaIcon name="search" size={16} />
                    )}
                </div>
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map(user => (
                        <button
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-nsp-teal">
                                {user.username}
                            </span>
                            {user.rating && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {user.rating}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {showResults && debouncedValue.length >= 2 && results.length === 0 && !loading && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                    No users found matching "{debouncedValue}"
                </div>
            )}
        </div>
    );
};

export default WooglesUserSearch;
