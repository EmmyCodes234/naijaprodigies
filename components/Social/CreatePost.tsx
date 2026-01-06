import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { User, Post } from '../../types';
import { createPost, createPostWithAudio } from '../../services/postService';
import { createPoll } from '../../services/pollService';
import { uploadImages, generatePreview } from '../../services/imageService';
import { getTrendingGifs, searchGifs, GifResult } from '../../services/gifService';
import { searchUsers } from '../../services/userService';
import { RateLimitError } from '../../utils/rateLimiter';
import { getAvatarUrl } from '../../utils/userUtils';
import ImageEditorModal from './ImageEditorModal';
import GifPicker from '../Shared/GifPicker';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';
import VoiceRecorder from './VoiceRecorder';

interface CreatePostProps {
  currentUser: User;
  onPost?: (post: Post) => void;
  variant?: 'default' | 'modal';
  onClose?: () => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ currentUser, onPost, variant = 'default', onClose }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media State
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif'>('image');
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  // New Features State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');

  // Mentions State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<User[]>([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Poll State
  const [isPollMode, setIsPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState(24); // Hours

  // Editor State
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [imageAltTexts, setImageAltTexts] = useState<Record<number, string>>({});

  // Voice Recording State
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = content.length;
  const charLimit = 280;
  const isOverLimit = charCount > charLimit;

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate image count (1-4 images)
    const newImages = Array.from(files);
    const totalImages = selectedImages.length + newImages.length;

    if (totalImages > 4) {
      setError('You can only attach up to 4 images per post');
      return;
    }

    try {
      const hasVideo = newImages.some((f: File) => f.type.startsWith('video/'));
      const hasImage = newImages.some((f: File) => f.type.startsWith('image/'));

      if (hasVideo && hasImage) {
        setError("Cannot mix photos and videos in the same post.");
        return;
      }

      if (hasVideo) {
        if (newImages.length > 1 || selectedImages.length > 0) {
          setError("Only 1 video allowed per post.");
          return;
        }
        setMediaType('video');
      } else {
        setMediaType('image');
      }

      // Generate previews
      const newPreviews = await Promise.all(
        newImages.map((file: File) => generatePreview(file))
      );

      setSelectedImages(prev => [...prev, ...newImages]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load media previews';
      setError(errorMessage);
      console.error('Error generating previews:', err);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const newPreviews = prev.filter((url, i) => {
        if (i === index) URL.revokeObjectURL(url);
        return i !== index;
      });
      return newPreviews;
    });
    setImageAltTexts(prev => {
      const newAltTexts = { ...prev };
      delete newAltTexts[index];
      return newAltTexts;
    });
    setError(null);
  };

  const handleEditClick = (index: number) => {
    setEditingImageIndex(index);
  };

  const handleSaveEdit = async (croppedImageBlob: Blob, altText: string) => {
    if (editingImageIndex === null) return;

    // Create new File from Blob
    const originalFile = selectedImages[editingImageIndex];
    const newFile = new File([croppedImageBlob], originalFile.name, {
      type: originalFile.type,
      lastModified: Date.now(),
    });

    // Update Selected Images
    const newSelectedImages = [...selectedImages];
    newSelectedImages[editingImageIndex] = newFile;
    setSelectedImages(newSelectedImages);

    // Update Previews
    const newPreviewUrl = URL.createObjectURL(newFile);
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[editingImageIndex]); // Cleanup old
      newPreviews[editingImageIndex] = newPreviewUrl;
      return newPreviews;
    });

    // Update Alt Text
    setImageAltTexts(prev => ({
      ...prev,
      [editingImageIndex]: altText
    }));

    setEditingImageIndex(null);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + emojiData.emoji + content.substring(end);
      setContent(newContent);

      // Needs timeout to set selection after render
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emojiData.emoji.length;
          textareaRef.current.focus();
        }
      }, 0);
    } else {
      setContent(prev => prev + emojiData.emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gif: GifResult) => {
    setGifUrl(gif.url);
    setImagePreviews([gif.url]); // Use GIF url as preview
    setMediaType('gif');
    setShowGifPicker(false);
    setSelectedImages([]); // Clear other images
    setIsPollMode(false);
  };

  // Mentions Logic
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setError(null);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.value ? `${e.target.scrollHeight}px` : 'auto';

    // Mention Detection
    const cursorPosition = e.target.selectionEnd;
    const textToCursor = newContent.slice(0, cursorPosition);
    // Regex: Match @ followed by words, allowing spaces if needed (but usually handles don't have spaces)
    // We want the LAST occurrence of @word...
    const match = textToCursor.match(/@([\w.]*)$/);

    if (match) {
      const query = match[1];
      setMentionQuery(query);
      setIsSearchingMentions(true);
      setMentionIndex(0);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchUsers(query);
          setMentionResults(results);
        } catch (err) {
          console.error("Mention search error:", err);
        } finally {
          setIsSearchingMentions(false);
        }
      }, 300);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
      setIsSearchingMentions(false);
    }
  };

  const selectMention = (user: User) => {
    if (!textareaRef.current || mentionQuery === null) return;

    const cursorPosition = textareaRef.current.selectionEnd;
    const textToCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);

    // Replace the last @query with @handle
    const lastAtPos = textToCursor.lastIndexOf('@');
    const newTextBefore = textToCursor.substring(0, lastAtPos) + `@${user.handle} `;

    const newContent = newTextBefore + textAfterCursor;

    setContent(newContent);
    setMentionQuery(null);
    setMentionResults([]);

    // Reset Focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newTextBefore.length;
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention Navigation
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + mentionResults.length) % mentionResults.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMention(mentionResults[mentionIndex]);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content - also allow audio-only posts
    if (!content.trim() && !isPollMode && !gifUrl && selectedImages.length === 0 && !audioBlob) return;

    // Check character limit
    if (isOverLimit) {
      setError('Post exceeds 280 character limit');
      return;
    }

    if (isPollMode) {
      if (!pollQuestion.trim()) {
        setError('Poll question cannot be empty');
        return;
      }
      if (pollOptions.some(opt => !opt.trim())) {
        setError('All poll options must be filled');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrls: string[] = [];
      let finalPollId: string | undefined = undefined;
      const scheduledFor = scheduledDate ? new Date(scheduledDate) : undefined;

      // check if scheduled date is valid (must be in future)
      if (scheduledFor && scheduledFor <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      // 1. Create Poll if active
      if (isPollMode) {
        // Calculate expiration date
        const durationHours = pollDuration || 24;
        const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

        // Create poll using the pollService
        finalPollId = await createPoll(pollQuestion, pollOptions.filter(o => o.trim()), expiresAt, currentUser.id);
      }

      // 2. Upload images if any
      if (selectedImages.length > 0) {
        setIsUploadingImages(true);
        try {
          imageUrls = await uploadImages(selectedImages, currentUser.id);
        } catch (uploadError) {
          throw new Error(
            uploadError instanceof Error
              ? uploadError.message
              : 'Failed to upload images'
          );
        } finally {
          setIsUploadingImages(false);
        }
      }

      // 3. Create post (with audio or regular)
      let newPost: Post;

      if (audioBlob && audioDurationMs > 0) {
        // Create post with voice note
        newPost = await createPostWithAudio(
          currentUser.id,
          content,
          audioBlob,
          audioDurationMs
        );
      } else {
        // Determine media type
        let finalMediaType: 'image' | 'video' | 'gif' = mediaType;
        if (gifUrl) finalMediaType = 'gif';

        newPost = await createPost(
          currentUser.id,
          content,
          imageUrls,
          scheduledFor,
          finalPollId,
          finalMediaType
        );
      }

      // Call the onPost callback if provided (only if not scheduled)
      if (onPost && !scheduledFor) {
        onPost(newPost);
      }

      // Clear the form
      setContent('');
      setSelectedImages([]);
      setImagePreviews([]);
      setGifUrl(null);
      setIsPollMode(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setScheduledDate('');
      setShowSchedulePicker(false);
      setImageAltTexts({}); // Clear alt texts
      setAudioBlob(null);  // Clear audio
      setAudioDurationMs(0);
      setShowVoiceRecorder(false);

      if (scheduledFor) {
        alert('Post scheduled successfully!');
      }

      if (variant === 'modal' && onClose) {
        onClose();
      }

    } catch (err) {
      if (err instanceof RateLimitError) {
        setError(err.message);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
        setError(errorMessage);
      }
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${variant === 'modal' ? 'p-0' : 'flex gap-3'}`}>

      {/* Mobile Header for Modal Mode - X Style */}
      {variant === 'modal' && (
        <div className="flex sm:hidden items-center justify-between px-4 py-3 border-b border-gray-100 mb-2 sticky top-0 bg-white/80 backdrop-blur-md z-30">
          <button
            type="button"
            onClick={onClose}
            className="text-base text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && selectedImages.length === 0) || isSubmitting}
            className="bg-nsp-teal hover:bg-nsp-dark-teal disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-1.5 px-4 rounded-full shadow-sm transition-all"
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        </div>
      )}

      <div className={`flex gap-3 ${variant === 'modal' ? 'px-4' : ''}`}>
        <div className="flex-shrink-0 pt-1">
          <Avatar
            user={currentUser}
            alt={currentUser?.name || 'User'}
            className={`${variant === 'modal' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover hover:opacity-90 cursor-pointer`}
          />
        </div>
        <form onSubmit={handleSubmit} className="flex-1 relative pb-16 sm:pb-0">
          {/* pb-16 to prevent bottom tools overlap on mobile */}

          <div className="border-b border-gray-100 pb-2 border-none relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="What is happening?!"
              className={`w-full bg-transparent border-none focus:ring-0 placeholder-gray-500 text-black resize-none overflow-hidden min-h-[120px] sm:min-h-[48px] ${variant === 'modal' ? 'text-lg' : 'text-xl'} ${isOverLimit ? 'text-red-500' : ''}`}
              rows={1}
              disabled={isSubmitting}
            />

            {/* Mention Popover */}
            {mentionQuery !== null && (
              <div className="absolute top-full left-0 z-50 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden mt-1 max-h-60 overflow-y-auto">
                {isSearchingMentions && mentionResults.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">Searching...</div>
                ) : mentionResults.length > 0 ? (
                  <ul>
                    {mentionResults.map((user, index) => (
                      <li
                        key={user.id}
                        className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${index === mentionIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                        onClick={() => selectMention(user)}
                        onMouseEnter={() => setMentionIndex(index)}
                      >
                        <Avatar user={user} className="w-8 h-8 rounded-full" />
                        <div className="flex flex-col overflow-hidden">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm truncate">{user.name}</span>
                            <VerifiedBadge user={user} size={14} />
                          </div>
                          <span className="text-gray-500 text-xs truncate">@{user.handle}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 text-center text-gray-500 text-sm">No users found</div>
                )}
              </div>
            )}

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className={`mt-3 grid gap-2 ${imagePreviews.length === 1 ? 'grid-cols-1' :
                imagePreviews.length === 2 ? 'grid-cols-2' :
                  imagePreviews.length === 3 ? 'grid-cols-3' :
                    'grid-cols-2'
                }`}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {mediaType === 'video' ? (
                      <video
                        src={preview}
                        controls
                        className="w-full h-auto max-h-[700px] rounded-2xl bg-black"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className={`w-full rounded-2xl border border-gray-200 ${imagePreviews.length === 1
                          ? 'h-auto max-h-[700px] object-contain bg-gray-50'
                          : 'h-48 object-cover'
                          }`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (mediaType === 'gif') {
                          setGifUrl(null);
                          setImagePreviews([]);
                          setMediaType('image');
                        } else {
                          handleRemoveImage(index);
                        }
                      }}
                      className="absolute top-2 right-2 bg-black/75 hover:bg-black/90 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                      disabled={isSubmitting}
                    >
                      <Icon icon="ph:x-bold" width="14" height="14" />
                    </button>
                    {/* Edit Button */}
                    {mediaType === 'image' && (
                      <button
                        type="button"
                        className="absolute bottom-4 right-4 bg-black/75 hover:bg-black/90 text-white rounded-full px-4 py-1.5 text-sm font-bold backdrop-blur-sm transition-all"
                        onClick={() => handleEditClick(index)}
                        disabled={isSubmitting}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Poll Creator */}
          {isPollMode && (
            <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-nsp-teal focus:border-transparent text-gray-900"
                disabled={isSubmitting}
              />
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-nsp-teal focus:border-transparent text-gray-900"
                      disabled={isSubmitting}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                        className="text-gray-400 hover:text-red-500"
                        disabled={isSubmitting}
                      >
                        <Icon icon="ph:x" width="20" height="20" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="mt-2 text-nsp-teal text-sm font-medium hover:underline flex items-center gap-1"
                  disabled={isSubmitting}
                >
                  <Icon icon="ph:plus" /> Add Option
                </button>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 border-t border-gray-200 pt-2">
                <span>Poll duration:</span>
                <select
                  value={pollDuration}
                  onChange={(e) => setPollDuration(Number(e.target.value))}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900"
                  disabled={isSubmitting}
                >
                  <option value={1}>1 Hour</option>
                  <option value={6}>6 Hours</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>1 Day</option>
                  <option value={72}>3 Days</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setIsPollMode(false)}
                className="mt-2 text-red-500 text-xs hover:underline w-full text-center"
              >
                Remove Poll
              </button>
            </div>
          )}

          {error && (
            <div className="mt-2 text-red-500 text-sm">
              {error}
            </div>
          )}

          {showSchedulePicker && (
            <div className="mt-3 bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
              <Icon icon="ph:calendar-clock" className="text-blue-500" width="24" height="24" />
              <div className="flex-1">
                <label className="block text-xs font-bold text-blue-800 mb-1">Schedule Post</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-white border border-blue-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setScheduledDate('');
                  setShowSchedulePicker(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="ph:x" width="20" height="20" />
              </button>
            </div>
          )}

          {/* Voice Recorder UI */}
          {showVoiceRecorder && (
            <div className="mt-3">
              <VoiceRecorder
                autoStart={true}
                onRecordingComplete={(blob, durationMs) => {
                  setAudioBlob(blob);
                  setAudioDurationMs(durationMs);
                  setShowVoiceRecorder(false);
                }}
                onCancel={() => {
                  setShowVoiceRecorder(false);
                  setAudioBlob(null);
                  setAudioDurationMs(0);
                }}
                maxDurationMs={15000}
              />
            </div>
          )}

          {/* Audio Preview */}
          {audioBlob && !showVoiceRecorder && (
            <div className="mt-3 bg-gradient-to-r from-nsp-teal/10 to-emerald-50 rounded-xl p-3 border border-nsp-teal/20 flex items-center gap-3">
              <div className="w-10 h-10 bg-nsp-teal rounded-full flex items-center justify-center text-white">
                <Icon icon="ph:microphone-fill" width="20" height="20" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Voice Note Ready</p>
                <p className="text-xs text-gray-500">{(audioDurationMs / 1000).toFixed(1)}s recorded</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAudioBlob(null);
                  setAudioDurationMs(0);
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Icon icon="ph:trash" width="18" height="18" />
              </button>
            </div>
          )}

          <div className={`flex justify-between items-center mt-3 ${variant === 'modal' ? 'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 sm:static sm:bg-transparent sm:border-none sm:p-0' : 'relative'}`}>
            {/* Tools - scrollable on mobile */}
            <div className="flex gap-1 items-center z-20 overflow-x-auto hide-scrollbar">
              <div className="flex gap-0.5 items-center text-nsp-teal flex-shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleImageSelect}
                />
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click()
                  }}
                  className="p-2.5 text-nsp-teal hover:bg-nsp-teal/10 rounded-full transition-colors relative group"
                  disabled={isSubmitting || (mediaType !== 'image' && mediaType !== 'video')}
                >
                  <Icon icon="ph:image-square" width="22" height="22" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">
                    Media
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGifPicker(!showGifPicker);
                    setShowEmojiPicker(false);
                    setShowSchedulePicker(false);
                  }}
                  className={`p-2.5 rounded-full hover:bg-nsp-teal/10 transition-colors ${showGifPicker ? 'text-nsp-teal bg-nsp-teal/10' : ''}`}
                  title="GIF"
                  disabled={isSubmitting || !!selectedImages.length || isPollMode}
                >
                  <Icon icon="ph:gif" width="22" height="22" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPollMode(!isPollMode);
                    if (!isPollMode) {
                      setSelectedImages([]);
                      setGifUrl(null);
                      setShowGifPicker(false);
                      setShowEmojiPicker(false);
                    }
                  }}
                  className={`p-2.5 rounded-full hover:bg-nsp-teal/10 transition-colors ${isPollMode ? 'text-nsp-teal bg-nsp-teal/10' : ''}`}
                  title="Poll"
                  disabled={isSubmitting || !!selectedImages.length || !!gifUrl}
                >
                  <Icon icon="ph:list-dashes" width="22" height="22" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowGifPicker(false);
                    setShowSchedulePicker(false);
                  }}
                  className={`p-2.5 rounded-full hover:bg-nsp-teal/10 transition-colors ${showEmojiPicker ? 'text-nsp-teal bg-nsp-teal/10' : ''}`}
                  title="Emoji"
                  disabled={isSubmitting}
                >
                  <Icon icon="ph:smiley" width="22" height="22" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSchedulePicker(!showSchedulePicker);
                    setShowEmojiPicker(false);
                    setShowGifPicker(false);
                  }}
                  className={`p-2.5 rounded-full hover:bg-nsp-teal/10 transition-colors ${showSchedulePicker ? 'text-nsp-teal bg-nsp-teal/10' : ''}`}
                  title="Schedule"
                  disabled={isSubmitting}
                >
                  <Icon icon="ph:calendar-plus" width="22" height="22" />
                </button>
                {/* Voice Note Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowVoiceRecorder(!showVoiceRecorder);
                    setShowEmojiPicker(false);
                    setShowGifPicker(false);
                    setShowSchedulePicker(false);
                  }}
                  className={`p-2.5 rounded-full hover:bg-nsp-teal/10 transition-colors relative group ${showVoiceRecorder || audioBlob ? 'text-nsp-teal bg-nsp-teal/10' : ''}`}
                  title="Voice Note"
                  disabled={isSubmitting || !!selectedImages.length || !!gifUrl || isPollMode}
                >
                  <Icon icon="ph:microphone" width="22" height="22" />
                  {audioBlob && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-nsp-teal rounded-full animate-pulse" />
                  )}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">
                    Voice
                  </span>
                </button>
              </div>
            </div>

            {/* Desktop Post Button (Hidden on Mobile Modal) */}
            <div className={`flex items-center gap-3 ${variant === 'modal' ? 'hidden sm:flex' : 'flex'}`}>
              {content.length > 0 && (
                <div className="flex items-center">
                  <div className={`w-[1px] h-6 bg-gray-200 mx-1 mr-3`} />
                  <span className={`text-[13px] ${isOverLimit ? 'text-red-500 font-bold' :
                    charCount > charLimit - 20 ? 'text-yellow-600' :
                      'text-gray-400'
                    }`}>
                    {charLimit - charCount}
                  </span>
                </div>
              )}
              <button
                type="submit"
                disabled={!content.trim() || isOverLimit || isSubmitting}
                className="bg-nsp-teal hover:bg-nsp-dark-teal disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[15px] py-2 px-6 rounded-full transition-all shadow-sm"
              >
                {isUploadingImages ? 'Uploading...' : isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>

            {/* Popover Logic */}
            {showEmojiPicker && (
              <div className="absolute top-12 left-0 z-50 shadow-2xl rounded-2xl">
                {/* Overlay to close on click outside? Or just use z-index */}
                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                <div className="relative z-50">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.LIGHT}
                    searchPlaceHolder="Search emojis..."
                    width={320}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              </div>
            )}

            {showGifPicker && (
              <div className="absolute top-12 left-0 z-50">
                <div className="fixed inset-0 z-40" onClick={() => setShowGifPicker(false)} />
                <div className="relative z-50">
                  <GifPicker
                    onSelect={handleGifSelect}
                    onClose={() => setShowGifPicker(false)}
                  />
                </div>
              </div>
            )}

          </div>
        </form>
      </div>

      {editingImageIndex !== null && (
        <ImageEditorModal
          isOpen={true}
          onClose={() => setEditingImageIndex(null)}
          imageSrc={imagePreviews[editingImageIndex]}
          onSave={handleSaveEdit}
          initialAltText={imageAltTexts[editingImageIndex] || ''}
        />
      )}
    </div>
  );
};

export default CreatePost;