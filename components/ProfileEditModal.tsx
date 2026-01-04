import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { User } from '../types';
import { updateUserProfile } from '../services/userService';
import { uploadImage } from '../services/imageService';
import Avatar from './Shared/Avatar';

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
  const [cover, setCover] = useState(user.cover_url || '');
  const [bio, setBio] = useState(user.bio || '');
  const [rank, setRank] = useState(user.rank || '');
  const [location, setLocation] = useState(user.location || '');
  const [website, setWebsite] = useState(user.website || '');
  const [birthDate, setBirthDate] = useState(user.birth_date || '');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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
      setCover(user.cover_url || '');
      setBio(user.bio || '');
      setRank(user.rank || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
      setBirthDate(user.birth_date || '');

      setAvatarFile(null);
      setAvatarPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
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

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setCoverFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (bio.length > MAX_BIO_LENGTH) {
      setError(`Bio must be ${MAX_BIO_LENGTH} characters or less`);
      return;
    }

    setIsSubmitting(true);

    try {
      let avatarUrl = avatar;
      let coverUrl = cover;

      if (avatarFile) {
        try {
          avatarUrl = await uploadImage(avatarFile, user.id);
        } catch (uploadError) {
          console.error('Failed to upload avatar:', uploadError);
          if (uploadError instanceof Error && uploadError.message.includes('row-level security')) {
            setError('Image upload failing due to RLS. Check bucket setup.');
            setIsSubmitting(false);
            return;
          }
          throw uploadError;
        }
      }

      if (coverFile) {
        try {
          coverUrl = await uploadImage(coverFile, user.id);
        } catch (uploadError) {
          console.error('Failed to upload cover:', uploadError);
          if (uploadError instanceof Error && uploadError.message.includes('row-level security')) {
            setError('Image upload failing due to RLS. Check bucket setup.');
            setIsSubmitting(false);
            return;
          }
          throw uploadError;
        }
      }

      const updates: Partial<User> = {
        avatar: avatarUrl || null,
        cover_url: coverUrl || null,
        bio: bio.trim() || null,
        rank: rank || null,
        location: location.trim() || null,
        website: website.trim() || null,
        birth_date: birthDate || null,
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

          {/* Cover Image Upload */}
          <div className="relative h-32 bg-gray-200 rounded-lg mb-4 overflow-hidden group">
            <div className={`absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10 flex items-center justify-center`}>
              <label htmlFor="cover-upload" className="cursor-pointer p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                <Icon icon="ph:camera-plus" width="24" height="24" />
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
            </div>
            {coverPreview || cover ? (
              <img src={coverPreview || cover} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-nsp-teal to-nsp-dark-teal" />
            )}
            {coverFile && <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full z-20">New</div>}
          </div>

          {/* Avatar */}
          <div className="mb-6 -mt-16 px-4 relative z-20">
            <div className="relative inline-block group">
              <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-gray-100">
                <Avatar
                  user={null} // We are using direct src
                  src={avatarPreview || avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <Icon icon="ph:camera-plus" width="20" height="20" />
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
            </div>
          </div>

          {/* Name (Standard Field) - Optional if we allowed name edit? User object has name. Let's stick to Bio etc. for now unless requested. */}

          {/* Bio */}
          <div className="mb-4">
            <label htmlFor="bio" className="block text-sm font-bold text-gray-900 mb-2">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:border-transparent resize-none text-gray-900"
            />
          </div>

          {/* Location */}
          <div className="mb-4">
            <label htmlFor="location" className="block text-sm font-bold text-gray-900 mb-2">Location</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lagos, Nigeria"
              maxLength={30}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:border-transparent text-gray-900"
            />
          </div>

          {/* Website */}
          <div className="mb-4">
            <label htmlFor="website" className="block text-sm font-bold text-gray-900 mb-2">Website</label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. https://example.com"
              maxLength={100}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:border-transparent text-gray-900"
            />
          </div>

          {/* Birth Date */}
          <div className="mb-6">
            <label htmlFor="birthDate" className="block text-sm font-bold text-gray-900 mb-2">Birth Date</label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:border-transparent text-gray-900"
            />
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nsp-teal focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900"
            >
              <option value="">Select your rank</option>
              {RANK_OPTIONS.map((rankOption) => (
                <option key={rankOption} value={rankOption}>
                  {rankOption}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
