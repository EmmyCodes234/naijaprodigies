import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { User } from '../../types';
import { completeOnboarding } from '../../services/onboardingService';
import WelcomeStep from './WelcomeStep';
import ProfileSetupStep from './ProfileSetupStep';
import InterestsStep from './InterestsStep';
import SuggestedFollowsStep from './SuggestedFollowsStep';
import NotificationsStep from './NotificationsStep';

interface OnboardingFlowProps {
    currentUser: User;
    onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'profile' | 'interests' | 'follows' | 'notifications';

const STEPS: OnboardingStep[] = ['welcome', 'profile', 'interests', 'follows', 'notifications'];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ currentUser, onComplete }) => {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [isCompleting, setIsCompleting] = useState(false);

    const currentStepIndex = STEPS.indexOf(currentStep);
    const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

    const handleNext = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex]);
        } else {
            handleComplete();
        }
    };

    const handleSkip = () => {
        // Skip to next step
        handleNext();
    };

    const handleComplete = async () => {
        setIsCompleting(true);
        try {
            await completeOnboarding(currentUser.id);
            onComplete();
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
            // Still allow user to continue
            onComplete();
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'welcome':
                return (
                    <WelcomeStep
                        onNext={handleNext}
                    />
                );
            case 'profile':
                return (
                    <ProfileSetupStep
                        currentUser={currentUser}
                        onNext={handleNext}
                        onSkip={handleSkip}
                    />
                );
            case 'interests':
                return (
                    <InterestsStep
                        userId={currentUser.id}
                        selectedInterests={selectedInterests}
                        onInterestsChange={setSelectedInterests}
                        onNext={handleNext}
                        onSkip={handleSkip}
                    />
                );
            case 'follows':
                return (
                    <SuggestedFollowsStep
                        userId={currentUser.id}
                        onNext={handleNext}
                        onSkip={handleSkip}
                    />
                );
            case 'notifications':
                return (
                    <NotificationsStep
                        onNext={handleComplete}
                        onSkip={handleComplete}
                        isCompleting={isCompleting}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Progress bar */}
            {currentStep !== 'welcome' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
                    <div
                        className="h-full bg-nsp-teal transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Back button (not on welcome or first step) */}
            {currentStepIndex > 0 && (
                <button
                    onClick={() => setCurrentStep(STEPS[currentStepIndex - 1])}
                    className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <Icon icon="ph:arrow-left" width="24" height="24" />
                </button>
            )}

            {/* Step indicators */}
            {currentStep !== 'welcome' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {STEPS.slice(1).map((step, index) => (
                        <div
                            key={step}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index < currentStepIndex
                                    ? 'bg-nsp-teal'
                                    : index === currentStepIndex - 1
                                        ? 'bg-nsp-teal w-6'
                                        : 'bg-gray-200'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Step content */}
            <div className="flex-1 overflow-y-auto">
                {renderStep()}
            </div>
        </div>
    );
};

export default OnboardingFlow;
