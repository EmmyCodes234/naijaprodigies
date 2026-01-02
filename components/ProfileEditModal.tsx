import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { User } from '../types';
import { updateUserProfile } from '../services/userService';
import { uploadImage } from '../services/imageService';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onProfileUpdated: (updatedUser: User) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onProfileUpdated
}) => {
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [bio, setBio] = useState(user.bio || '');
  const [rank, setRank] = useState(user.rank || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioCharCount, setBioCharCount] = useState(0);

  const MAX_BIO_LENGTH = 160;
  const RANK_OPTIONS = [
    'Grandmaster',
    'Master',
    'Expert',
    'Advanced',
    'Intermediate',
    'Beginner',
    'Apprentice'
  ];

  useEffect(() => {
    if (isOpen) {
      setAvatar(user.avatar || '');
      setBio(user.bio || '');
      setRank(user.rank || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setError(null);
      setBioCharCount((user.bio || '').length);
    }
  }, [isOpen, user]);

  useEffect(() => {
    setBioCharCount(bio.length);
  }, [bio]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setError(null);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate bio length
    if (bio.length > MAX_BIO_LENGTH) {
      setError(`Bio must be ${MAX_BIO_LENGTH} characters or less`);
      return;
    }

    setIsSubmitting(true);

    try {
      let avatarUrl = avatar;

      // Upload new avatar if selected
      if (avatarFile) {
        try {
          avatarUrl = await uploadImage(avatarFile, user.id);
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError);
          // Check if it's an RLS error
          if (uploadError instanceof Error && uploadError.message.includes('row-level security')) {
            setError('Image upload is not configured yet. You can still update your bio and rank. See STORAGE_QUICK_SETUP.md to enable image uploads.');
            setIsSubmitting(false);
            return;
          }
          throw uploadError;
        }
      }

      // Update profile
      const updates: Partial<User> = {
        avatar: avatarUrl,
        bio: bio.trim() || null,
        rank: rank || null
      };

      const updatedUser = await updateUserProfile(user.id, updates);
      onProfileUpdated(updatedUser);
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <Icon icon="ph:x" width="20" height="20" className="text-gray-900" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || bioCharCount > MAX_BIO_LENGTH}
            className="px-4 py-2 bg-nsp-teal text-white rounded-full font-bold hover:bg-nsp-dark-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Icon icon="line-md:loading-twotone-loop" width="20" height="20" />
            ) : (
              'Save'
            )}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <Icon icon="ph:warning-circle" width="20" height="20" className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Cover Image Placeholder */}
          <div className="h-32 bg-gradient-to-r from-nsp-teal to-nsp-dark-teal rounded-lg mb-4"></div>

          {/* Avatar */}
          <div className="mb-6 -mt-16 px-4">
            <div className="relative inline-block">
              <img
                src={avatarPreview || avatar || '/default-avatar.png'}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-white object-cover"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-nsp-teal text-white p-2 rounded-full cursor-pointer hover:bg-nsp-dark-teal transition-colors"
              >
                <Icon icon="ph:camera" width="16" height="16" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label htmlFor="bio" className="block text-sm font-bold text-gray-900 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={MAX_BIO_LENGTH}
              rows={4}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Share your Scrabble journey, achievements, or favorite words
              </p>
              <p className={`text-sm font-medium ${
                bioCharCount > MAX_BIO_LENGTH ? 'text-red-500' : 'text-gray-500'
              }`}>
                {bioCharCount}/{MAX_BIO_LENGTH}
              </p>
            </div>
          </div>

          {/* Rank */}
          <div className="mb-6">
            <label htmlFor="rank" className="block text-sm font-bold text-gray-900 mb-2">
              Rank
            </label>
            <select
              id="rank"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="">Select your rank</option>
              {RANK_OPTIONS.map((rankOption) => (
                <option key={rankOption} value={rankOption}>
                  {rankOption}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Your skill level in Scrabble
            </p>
          </div>

          {/* Storage Warning */}
          {avatarFile && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Icon icon="ph:warning" width="20" height="20" className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-bold mb-1">Storage Setup Required</p>
                  <p>
                    If image upload fails, you need to set up storage policies in Supabase.
                    See <code className="bg-yellow-100 px-1 rounded">STORAGE_QUICK_SETUP.md</code> for instructions.
                    You can still update your bio and rank without uploading an image.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Icon icon="ph:info" width="20" height="20" className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-bold mb-1">Profile Tips</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use a clear profile picture</li>
                  <li>Keep your bio concise and engaging</li>
                  <li>Select your current Scrabble rank</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
