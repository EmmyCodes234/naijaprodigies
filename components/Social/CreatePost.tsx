import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { User, Post } from '../../types';
import { createPost } from '../../services/postService';
import { uploadImages, generatePreview } from '../../services/imageService';
import { RateLimitError } from '../../utils/rateLimiter';
import { getAvatarUrl } from '../../utils/userUtils';

interface CreatePostProps {
  currentUser: User;
  onPost?: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ currentUser, onPost }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Generate previews for all new images
      const newPreviews = await Promise.all(
        newImages.map((file: File) => generatePreview(file))
      );

      setSelectedImages(prev => [...prev, ...newImages]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image previews';
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
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content
    if (!content.trim()) return;

    // Check character limit
    if (isOverLimit) {
      setError('Post exceeds 280 character limit');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrls: string[] = [];

      // Upload images if any are selected
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

      // Create post with image URLs
      const newPost = await createPost(currentUser.id, content, imageUrls);

      // Call the onPost callback if provided
      if (onPost) {
        onPost(newPost);
      }

      // Clear the form
      setContent('');
      setSelectedImages([]);
      setImagePreviews([]);
    } catch (err) {
      // Handle rate limit errors with specific messaging
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
    <div className="flex gap-4">
      <div className="flex-shrink-0 pt-1">
        <img
          src={getAvatarUrl(currentUser)}
          alt={currentUser.name}
          className="w-10 h-10 rounded-full object-cover hover:opacity-90 cursor-pointer"
        />
      </div>
      <form onSubmit={handleSubmit} className="flex-1">
        <div className="border-b border-gray-100 pb-2">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null); // Clear error on input change
              e.target.style.height = 'auto';
              e.target.style.height = e.target.value ? `${e.target.scrollHeight}px` : 'auto';
            }}
            placeholder="What is happening?!"
            className={`w-full bg-transparent border-none focus:ring-0 text-xl placeholder-gray-500 text-gray-900 resize-none overflow-hidden min-h-[48px] ${isOverLimit ? 'text-red-500' : ''
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
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-48 object-cover rounded-2xl"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-gray-900/80 hover:bg-gray-900 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <Icon icon="ph:x" width="16" height="16" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2 text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-1 items-center">
            <div className="flex gap-1 text-nsp-teal">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                disabled={isSubmitting || selectedImages.length >= 4}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-nsp-teal/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Media"
                disabled={isSubmitting || selectedImages.length >= 4}
              >
                <Icon icon="ph:image-square" width="20" height="20" />
              </button>
              <button type="button" className="p-2 rounded-full hover:bg-nsp-teal/10 transition-colors" title="GIF">
                <Icon icon="ph:gif" width="20" height="20" />
              </button>
              <button type="button" className="p-2 rounded-full hover:bg-nsp-teal/10 transition-colors" title="Poll">
                <Icon icon="ph:list-dashes" width="20" height="20" />
              </button>
              <button type="button" className="p-2 rounded-full hover:bg-nsp-teal/10 transition-colors" title="Emoji">
                <Icon icon="ph:smiley" width="20" height="20" />
              </button>
              <button type="button" className="p-2 rounded-full hover:bg-nsp-teal/10 transition-colors" title="Schedule">
                <Icon icon="ph:calendar-plus" width="20" height="20" />
              </button>
            </div>

            {content.length > 0 && (
              <span className={`text-sm ml-2 ${isOverLimit ? 'text-red-500 font-semibold' :
                charCount > charLimit - 20 ? 'text-yellow-600' :
                  'text-gray-500'
                }`}>
                {charCount}/{charLimit}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!content.trim() || isOverLimit || isSubmitting}
            className="bg-nsp-teal hover:bg-nsp-dark-teal disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-1.5 px-5 rounded-full transition-all shadow-sm"
          >
            {isUploadingImages ? 'Uploading...' : isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;