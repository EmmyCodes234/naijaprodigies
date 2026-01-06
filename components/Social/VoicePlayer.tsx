import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface VoicePlayerProps {
    audioUrl: string;
    durationMs: number;
    transcript?: string;
    compact?: boolean;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
    audioUrl,
    durationMs,
    transcript,
    compact = false
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showTranscript, setShowTranscript] = useState(false);
    const [waveformBars, setWaveformBars] = useState<number[]>([]);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);

    // Generate static waveform visualization (simulated)
    useEffect(() => {
        const bars = Array.from({ length: compact ? 20 : 40 }, () =>
            0.3 + Math.random() * 0.7
        );
        setWaveformBars(bars);
    }, [compact]);

    useEffect(() => {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.playbackRate = playbackRate;

        audioRef.current.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [audioUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        } else {
            audioRef.current.play();
            progressInterval.current = setInterval(() => {
                if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime * 1000);
                }
            }, 50);
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const newTime = (durationMs / 1000) * percent;

        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime * 1000);
    };

    const cycleSpeed = () => {
        const speeds = [1, 1.5, 2];
        const currentIndex = speeds.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        setPlaybackRate(speeds[nextIndex]);
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = (currentTime / durationMs) * 100;

    if (compact) {
        return (
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2 max-w-xs">
                <button
                    onClick={togglePlay}
                    className="w-8 h-8 bg-nsp-teal text-white rounded-full flex items-center justify-center hover:bg-nsp-dark-teal transition-all flex-shrink-0"
                >
                    <Icon
                        icon={isPlaying ? "ph:pause-fill" : "ph:play-fill"}
                        width="16"
                        height="16"
                    />
                </button>

                {/* Mini waveform */}
                <div
                    className="flex items-center gap-0.5 h-6 flex-1 cursor-pointer"
                    onClick={handleSeek}
                >
                    {waveformBars.map((height, index) => {
                        const barProgress = (index / waveformBars.length) * 100;
                        const isPlayed = barProgress < progress;
                        return (
                            <div
                                key={index}
                                className={`w-1 rounded-full transition-colors ${isPlayed ? 'bg-nsp-teal' : 'bg-gray-300'
                                    }`}
                                style={{ height: `${height * 24}px` }}
                            />
                        );
                    })}
                </div>

                <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                    {formatTime(currentTime)}/{formatTime(durationMs)}
                </span>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-nsp-teal/5 to-emerald-50 rounded-2xl p-4 border border-nsp-teal/10">
            <div className="flex items-center gap-4">
                {/* Play button */}
                <button
                    onClick={togglePlay}
                    className="w-12 h-12 bg-nsp-teal text-white rounded-full flex items-center justify-center hover:bg-nsp-dark-teal transition-all hover:scale-105 shadow-md flex-shrink-0"
                >
                    <Icon
                        icon={isPlaying ? "ph:pause-fill" : "ph:play-fill"}
                        width="24"
                        height="24"
                    />
                </button>

                {/* Waveform and progress */}
                <div className="flex-1">
                    <div
                        className="flex items-center gap-0.5 h-10 cursor-pointer"
                        onClick={handleSeek}
                    >
                        {waveformBars.map((height, index) => {
                            const barProgress = (index / waveformBars.length) * 100;
                            const isPlayed = barProgress < progress;
                            return (
                                <div
                                    key={index}
                                    className={`w-1 rounded-full transition-colors ${isPlayed ? 'bg-nsp-teal' : 'bg-gray-300'
                                        }`}
                                    style={{ height: `${height * 40}px` }}
                                />
                            );
                        })}
                    </div>

                    {/* Time display */}
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500 font-mono">
                            {formatTime(currentTime)}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                            {formatTime(durationMs)}
                        </span>
                    </div>
                </div>

                {/* Speed control */}
                <button
                    onClick={cycleSpeed}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-300 transition-colors"
                >
                    {playbackRate}x
                </button>
            </div>

            {/* Transcript toggle */}
            {transcript && (
                <div className="mt-3">
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <Icon icon="ph:closed-captioning" width="14" height="14" />
                        <span>{showTranscript ? 'Hide' : 'Show'} transcript</span>
                    </button>

                    {showTranscript && (
                        <p className="mt-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2 italic">
                            "{transcript}"
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default VoicePlayer;
