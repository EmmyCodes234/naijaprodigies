import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { User } from '../../types';
import { updateOnboardingProfile } from '../../services/onboardingService';
import { supabase } from '../../services/supabaseClient';
import Avatar from '../Shared/Avatar';

interface ProfileSetupStepProps {
    currentUser: User;
    onNext: () => void;
    onSkip: () => void;
}

const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({ currentUser, onNext, onSkip }) => {
    const [name, setName] = useState(currentUser.name || '');
    const [bio, setBio] = useState(currentUser.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar || null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(data.publicUrl);
        } catch (error) {
            console.error('Failed to upload avatar:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateOnboardingProfile(currentUser.id, {
                name: name.trim() || currentUser.name,
                bio: bio.trim() || undefined,
                avatar: avatarUrl || undefined
            });
            onNext();
        } catch (error) {
            console.error('Failed to save profile:', error);
            // Continue anyway
            onNext();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-full flex flex-col px-6 py-16">
            <div className="max-w-md mx-auto w-full flex-1">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-gray-900 mb-2">
                        Set up your profile
                    </h1>
                    <p className="text-gray-500">
                        Add a photo and tell us about yourself
                    </p>
                </div>

                {/* Avatar upload */}
                <div className="flex justify-center mb-8">
                    <button
                        onClick={handleAvatarClick}
                        className="relative group"
                        disabled={isUploading}
                    >
                        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-100">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-nsp-teal/10">
                                    <Icon icon="ph:user" width="48" height="48" className="text-nsp-teal/50" />
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon icon="ph:camera" width="28" height="28" className="text-white" />
                        </div>
                        {isUploading && (
                            <div className="absolute inset-0 rounded-full bg-white/80 flex items-center justify-center">
                                <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
                            </div>
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Form fields */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your display name"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-nsp-teal focus:ring-2 focus:ring-nsp-teal/20 outline-none transition-all"
                            maxLength={50}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Bio
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="A few words about yourself..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-nsp-teal focus:ring-2 focus:ring-nsp-teal/20 outline-none transition-all resize-none"
                            maxLength={160}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/160</p>
                    </div>
                </div>
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
                    ) : (
                        'Continue'
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

export default ProfileSetupStep;
