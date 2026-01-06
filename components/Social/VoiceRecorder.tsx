import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob, durationMs: number) => void;
    onCancel: () => void;
    maxDurationMs?: number;
    autoStart?: boolean; // Auto-start recording when component mounts
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onRecordingComplete,
    onCancel,
    maxDurationMs = 300000,
    autoStart = false
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [waveformData, setWaveformData] = useState<number[]>([]);

    // Preview playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);
    const mimeTypeRef = useRef<string>('');

    const [error, setError] = useState<string | null>(null);

    // Initial check for browser support and secure context
    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("Microphone access requires HTTPS or localhost. If testing on mobile via IP, please use a secure tunnel (ngrok) or enable 'Insecure origins treated as secure' in chrome://flags.");
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            // Cleanup audio preview URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, []);


    // Auto-start recording if prop is set
    useEffect(() => {
        if (autoStart && !isRecording && !audioBlob) {
            startRecording();
        }
    }, [autoStart]);

    // Auto-play when preview URL is ready
    useEffect(() => {
        if (previewUrl && audioRef.current) {
            console.log("Preview URL ready, attempting auto-play");
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Auto-playback failed:", error);
                    // State will be handled by onPause
                });
            }
        }
    }, [previewUrl]);

    const startRecording = async () => {
        try {
            // Request microphone permission - must be from user gesture
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    // DISABLING processing to prevent Windows "Communications Mode" (low sample rate)
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                }
            });

            // Log actual track settings to debug 'robotic' issues
            const track = stream.getAudioTracks()[0];
            const settings = track.getSettings();
            console.log("Microphone settings:", settings);

            // Audio context moved after recorder init

            // Detect supported mime type for mobile compatibility
            let mimeType = '';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            }
            mimeTypeRef.current = mimeType;

            // Set up MediaRecorder
            const options: MediaRecorderOptions = {
                audioBitsPerSecond: 128000 // Higher quality
            };
            if (mimeType) {
                options.mimeType = mimeType;
            }

            mediaRecorderRef.current = new MediaRecorder(stream, options);

            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                    console.log(`Captured chunk: ${e.data.size} bytes`);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                // Use the actual mime type from the recorder if available, otherwise fallback to requested
                const type = mediaRecorderRef.current?.mimeType || mimeTypeRef.current || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type });
                console.log(`Recording stopped. Total chunks: ${chunksRef.current.length}, Size: ${blob.size}, Type: ${type}`);

                if (blob.size === 0) {
                    console.error("Recording failed: Blob is empty");
                }

                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            // 2. Set up AudioContext for visualization using a CLONED stream
            // This prevents the AudioContext from forcing a sample rate change on the recording stream
            try {
                audioContextRef.current = new AudioContext();
                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }

                // Use a clone for visualization so we don't interfere with the recording stream
                const visStream = stream.clone();
                const source = audioContextRef.current.createMediaStreamSource(visStream);
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                source.connect(analyserRef.current);
            } catch (err) {
                console.warn("Audio visualization failed to start (ignoring):", err);
            }

            mediaRecorderRef.current.start(100); // Collect data every 100ms
            setIsRecording(true);
            setIsPaused(false);
            startTimeRef.current = Date.now();
            accumulatedTimeRef.current = 0;

            // Clear any existing timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            // Start timer
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const sessionTime = now - startTimeRef.current;
                const totalElapsed = accumulatedTimeRef.current + sessionTime;

                setElapsedMs(Math.min(totalElapsed, maxDurationMs));

                // Auto-stop at max duration
                if (totalElapsed >= maxDurationMs) {
                    stopRecording();
                }
            }, 50);

            // Start waveform visualization
            visualize();

        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            setIsRecording(false); // UI state

            // Update accumulated time
            accumulatedTimeRef.current += Date.now() - startTimeRef.current;
        }

        // Always clear timer and animation when pausing
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            setIsRecording(true);
            startTimeRef.current = Date.now();

            // Clear any existing timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            // Resume timer
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const sessionTime = now - startTimeRef.current;
                const totalElapsed = accumulatedTimeRef.current + sessionTime;

                setElapsedMs(Math.min(totalElapsed, maxDurationMs));

                if (totalElapsed >= maxDurationMs) {
                    stopRecording();
                }
            }, 50);

            // Resume waveform visualization
            visualize();
        }
    };


    const stopRecording = () => {
        if (mediaRecorderRef.current && (isRecording || isPaused)) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        }
    };

    const visualize = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const draw = () => {
            if (!isRecording || !analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            // Sample 20 bars from the frequency data
            const bars: number[] = [];
            const step = Math.floor(dataArray.length / 20);
            for (let i = 0; i < 20; i++) {
                bars.push(dataArray[i * step] / 255);
            }
            setWaveformData(bars);

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();
    };

    const handleSend = () => {
        if (audioBlob) {
            onRecordingComplete(audioBlob, elapsedMs);
        }
    };

    const handleDiscard = () => {
        // Stop preview if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        // State will update via handlers
        setIsPlaying(false);
        setPlaybackProgress(0);
        setAudioBlob(null);
        setElapsedMs(0);
        setWaveformData([]);
        onCancel();
    };

    // Audio element handlers
    const handleAudioEnded = () => {
        // State update handled by onPause/onEnded
        setIsPlaying(false);
        setPlaybackProgress(0);
    };

    const handleAudioTimeUpdate = () => {
        if (audioRef.current) {
            const duration = audioRef.current.duration || (elapsedMs / 1000);
            if (duration > 0 && isFinite(duration)) {
                const progress = (audioRef.current.currentTime / duration) * 100;
                setPlaybackProgress(progress);
            }
        }
    };

    const handleAudioPlay = () => setIsPlaying(true);
    const handleAudioPause = () => setIsPlaying(false);

    // Toggle preview playback
    const togglePreview = () => {
        if (!audioBlob) return;

        if (!previewUrl) {
            // Create audio url
            const url = URL.createObjectURL(audioBlob);
            setPreviewUrl(url);
            // useEffect will trigger play
        } else if (audioRef.current) {
            if (audioRef.current.paused) {
                audioRef.current.play().catch(e => console.error("Play failed:", e));
            } else {
                audioRef.current.pause();
            }
        }
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const remaining = Math.floor((ms % 1000) / 100);
        return `${seconds}.${remaining}s`;
    };

    const progress = (elapsedMs / maxDurationMs) * 100;

    return (
        <div className="bg-gradient-to-r from-nsp-teal/10 to-emerald-50 rounded-2xl p-4 border border-nsp-teal/20">
            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                src={previewUrl || undefined}
                onEnded={handleAudioEnded}
                onTimeUpdate={handleAudioTimeUpdate}
                onPlay={handleAudioPlay}
                onPause={handleAudioPause}
                playsInline
                className="hidden"
            />

            {/* Waveform Visualization */}
            <div className="flex items-center justify-center gap-1 h-16 mb-4">
                {isRecording ? (
                    waveformData.map((value, index) => (
                        <div
                            key={index}
                            className="w-1.5 bg-nsp-teal rounded-full transition-all duration-75"
                            style={{
                                height: `${Math.max(8, value * 64)}px`,
                                opacity: 0.5 + value * 0.5
                            }}
                        />
                    ))
                ) : audioBlob ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                        {/* Playback waveform visualization */}
                        <div className="flex items-center justify-center gap-1 w-full px-4">
                            {Array.from({ length: 30 }, (_, i) => {
                                const barProgress = (i / 30) * 100;
                                const isPlayed = barProgress < playbackProgress;
                                return (
                                    <div
                                        key={i}
                                        className={`w-1 rounded-full transition-colors duration-100 ${isPlayed ? 'bg-nsp-teal' : 'bg-gray-300'}`}
                                        style={{ height: `${12 + Math.sin(i * 0.5) * 20 + Math.random() * 10}px` }}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Icon icon={isPlaying ? "ph:speaker-high-fill" : "ph:check-circle-fill"} width="20" height="20" className="text-nsp-teal" />
                            <span className="font-medium">{isPlaying ? 'Playing...' : 'Recording ready'}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400 text-sm">
                        Tap the microphone to start recording
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-200 rounded-full mb-3 overflow-hidden">
                <div
                    className="h-full bg-nsp-teal transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Timer and Max Duration */}
            <div className="flex justify-between text-sm mb-4">
                <span className={`font-mono font-bold ${progress > 80 ? 'text-orange-500' : 'text-gray-700'}`}>
                    {formatTime(elapsedMs)}
                </span>
                <span className="text-gray-400">
                    {formatTime(maxDurationMs)} max
                </span>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 border border-red-100 flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                {!isRecording && !isPaused && !audioBlob && (
                    <button
                        onClick={startRecording}
                        className="w-16 h-16 bg-nsp-teal text-white rounded-full flex items-center justify-center hover:bg-nsp-dark-teal transition-all hover:scale-105 shadow-lg"
                    >
                        <Icon icon="ph:microphone-fill" width="28" height="28" />
                    </button>
                )}

                {(isRecording || isPaused) && (
                    <>
                        <button
                            onClick={stopRecording}
                            className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 transition-all"
                            title="Stop & Save"
                        >
                            <Icon icon="ph:square-fill" width="20" height="20" />
                        </button>

                        <button
                            onClick={isPaused ? resumeRecording : pauseRecording}
                            className={`w-16 h-16 ${isPaused ? 'bg-nsp-teal' : 'bg-red-500'} text-white rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg hover:scale-105`}
                            title={isPaused ? "Resume" : "Pause"}
                        >
                            <Icon icon={isPaused ? "ph:microphone-fill" : "ph:pause-fill"} width="28" height="28" />
                        </button>

                        {/* Spacer to center the main button if needed, or add another action */}
                        <div className="w-12 h-12" />
                    </>
                )}

                {audioBlob && !isRecording && !isPaused && (
                    <>
                        <button
                            onClick={handleDiscard}
                            className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-all"
                        >
                            <Icon icon="ph:trash" width="20" height="20" />
                        </button>

                        {/* Play/Pause Preview Button */}
                        <button
                            onClick={togglePreview}
                            className="w-14 h-14 bg-white border-2 border-nsp-teal text-nsp-teal rounded-full flex items-center justify-center hover:bg-nsp-teal/10 transition-all shadow-md"
                        >
                            <Icon icon={isPlaying ? "ph:pause-fill" : "ph:play-fill"} width="24" height="24" />
                        </button>

                        <button
                            onClick={() => {
                                handleDiscard();
                                // Don't call onCancel, just reset for re-recording
                                setAudioBlob(null);
                                setElapsedMs(0);
                                setWaveformData([]);
                                startRecording();
                            }}
                            className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-all"
                        >
                            <Icon icon="ph:arrow-counter-clockwise" width="20" height="20" />
                        </button>

                        <button
                            onClick={handleSend}
                            className="w-16 h-16 bg-nsp-teal text-white rounded-full flex items-center justify-center hover:bg-nsp-dark-teal transition-all hover:scale-105 shadow-lg"
                        >
                            <Icon icon="ph:paper-plane-tilt-fill" width="28" height="28" />
                        </button>
                    </>
                )}
            </div>

            {/* Cancel button */}
            <button
                onClick={handleDiscard}
                className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
                Cancel
            </button>
        </div>
    );
};

export default VoiceRecorder;
