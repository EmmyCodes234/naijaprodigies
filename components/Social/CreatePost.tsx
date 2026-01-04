import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { User, Post } from '../../types';
import { createPost } from '../../services/postService';
import { createPoll } from '../../services/pollService';
import { uploadImages, generatePreview } from '../../services/imageService';
import { getTrendingGifs, searchGifs, GifResult } from '../../services/gifService';
import { RateLimitError } from '../../utils/rateLimiter';
import { getAvatarUrl } from '../../utils/userUtils';
import ImageEditorModal from './ImageEditorModal';
import GifPicker from '../Shared/GifPicker';
import Avatar from '../Shared/Avatar';

interface CreatePostProps {
  currentUser: User;
  onPost?: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ currentUser, onPost }) => {
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

  // Poll State
  const [isPollMode, setIsPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState(24); // Hours

  // Editor State
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [imageAltTexts, setImageAltTexts] = useState<Record<number, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = content.length;
  const charLimit = 280;
  const isOverLimit = charCount > charLimit;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content
    if (!content.trim() && !isPollMode && !gifUrl && selectedImages.length === 0) return;

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
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + pollDuration);
        finalPollId = await createPoll(pollQuestion, pollOptions, expiresAt, currentUser.id);
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

      // 3. Create post
      // Determine media type
      let finalMediaType: 'image' | 'video' | 'gif' = mediaType;
      if (gifUrl) finalMediaType = 'gif';

      const newPost = await createPost(
        currentUser.id,
        content,
        imageUrls,
        scheduledFor,
        finalPollId,
        finalMediaType
      );

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

      if (scheduledFor) {
        alert('Post scheduled successfully!');
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
    <div className="flex gap-3">
      <div className="flex-shrink-0 pt-1">
        <Avatar
          user={currentUser}
          alt={currentUser.name}
          className="w-10 h-10 rounded-full object-cover hover:opacity-90 cursor-pointer"
        />
      </div>
      <form onSubmit={handleSubmit} className="flex-1 relative">
        <div className="border-b border-gray-100 pb-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null); // Clear error on input change
              e.target.style.height = 'auto';
              e.target.style.height = e.target.value ? `${e.target.scrollHeight}px` : 'auto';
            }}
            placeholder="What is happening?!"
            className={`w-full bg-white border-none focus:ring-0 text-xl placeholder-gray-500 text-black resize-none overflow-hidden min-h-[48px] ${isOverLimit ? 'text-red-500' : ''
              }`}
            rows={1}
            disabled={isSubmitting}
          />

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
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-nsp-teal focus:border-transparent"
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
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-nsp-teal focus:border-transparent"
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
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs"
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
                className="w-full bg-white border border-blue-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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

        <div className="flex justify-between items-center mt-3 relative">
          <div className="flex gap-1 items-center z-20">
            <div className="flex gap-0.5 items-center text-nsp-teal">
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
            </div>
          </div>

          <div className="flex items-center gap-3">
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