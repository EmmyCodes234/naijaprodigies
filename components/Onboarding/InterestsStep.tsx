import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getInterestTopics, saveUserInterests, InterestTopic } from '../../services/onboardingService';

interface InterestsStepProps {
    userId: string;
    selectedInterests: string[];
    onInterestsChange: (interests: string[]) => void;
    onNext: () => void;
    onSkip: () => void;
}

const InterestsStep: React.FC<InterestsStepProps> = ({
    userId,
    selectedInterests,
    onInterestsChange,
    onNext,
    onSkip
}) => {
    const [topics, setTopics] = useState<InterestTopic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadTopics = async () => {
            try {
                const data = await getInterestTopics();
                setTopics(data);
            } catch (error) {
                console.error('Failed to load topics:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadTopics();
    }, []);

    const toggleTopic = (topicId: string) => {
        if (selectedInterests.includes(topicId)) {
            onInterestsChange(selectedInterests.filter(id => id !== topicId));
        } else {
            onInterestsChange([...selectedInterests, topicId]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveUserInterests(userId, selectedInterests);
            onNext();
        } catch (error) {
            console.error('Failed to save interests:', error);
            onNext(); // Continue anyway
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-full flex flex-col px-6 py-16">
            <div className="max-w-lg mx-auto w-full flex-1">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-gray-900 mb-2">
                        What are you interested in?
                    </h1>
                    <p className="text-gray-500">
                        Select topics to personalize your feed
                    </p>
                </div>

                {/* Topics grid */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Icon icon="line-md:loading-twotone-loop" width="40" height="40" className="text-nsp-teal" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {topics.map((topic) => {
                            const isSelected = selectedInterests.includes(topic.id);
                            return (
                                <button
                                    key={topic.id}
                                    onClick={() => toggleTopic(topic.id)}
                                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${isSelected
                                            ? 'border-nsp-teal bg-nsp-teal/5'
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                        }`}
                                >
                                    {/* Selection indicator */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2">
                                            <Icon icon="ph:check-circle-fill" width="20" height="20" className="text-nsp-teal" />
                                        </div>
                                    )}

                                    {/* Icon */}
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                                        style={{ backgroundColor: `${topic.color}15` }}
                                    >
                                        <Icon
                                            icon={topic.icon}
                                            width="22"
                                            height="22"
                                            style={{ color: topic.color }}
                                        />
                                    </div>

                                    {/* Name */}
                                    <p className={`font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {topic.name}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Selection count */}
                {selectedInterests.length > 0 && (
                    <p className="text-center text-sm text-gray-500 mt-6">
                        {selectedInterests.length} topic{selectedInterests.length !== 1 ? 's' : ''} selected
                    </p>
                )}
            </div>

            {/* Bottom buttons */}
            <div className="max-w-md mx-auto w-full pt-6 space-y-3">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <Icon icon="line-md:loading-twotone-loop" width="20" height="20" />
                            Saving...
                        </>
                    ) : selectedInterests.length > 0 ? (
                        'Continue'
                    ) : (
                        'Continue without selecting'
                    )}
                </button>
                <button
                    onClick={onSkip}
                    className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
};

export default InterestsStep;
