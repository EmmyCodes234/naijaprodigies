import { supabase } from './supabaseClient'

/**
 * Image Service
 * Handles image upload, deletion, and preview generation for post images
 */

export interface ImageService {
  uploadImage(file: File, userId: string): Promise<string>
  uploadImages(files: File[], userId: string): Promise<string[]>
  deleteImage(imageUrl: string): Promise<void>
  generatePreview(file: File): Promise<string>
}

/**
 * Upload a single image to Supabase Storage
 * @returns The public URL of the uploaded image
 */
export const uploadImage = async (file: File, userId: string): Promise<string> => {
  // Generate unique filename with timestamp and random string
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${timestamp}-${randomString}.${fileExt}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('post-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Upload multiple images to Supabase Storage
 * @returns Array of public URLs for the uploaded images
 */
export const uploadImages = async (
  files: File[],
  userId: string
): Promise<string[]> => {
  // Validate file count (1-4 files)
  if (files.length < 1 || files.length > 4) {
    throw new Error('Must upload between 1 and 4 files')
  }

  // Upload all images in parallel
  const uploadPromises = files.map(file => uploadImage(file, userId))

  try {
    const urls = await Promise.all(uploadPromises)
    return urls
  } catch (error) {
    throw new Error(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete an image from Supabase Storage
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  // Implementation will be added in future tasks
  throw new Error('Not implemented')
}

/**
 * Generate a local preview URL for an image file
 * @returns A blob URL for local preview
 */
export const generatePreview = async (file: File): Promise<string> => {
  // Use createObjectURL for efficient preview of both images and videos
  return URL.createObjectURL(file);
}
