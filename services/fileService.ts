import { supabase } from './supabaseClient'

/**
 * File Service
 * Handles generic file uploads for messages and other features
 */

export interface UploadResult {
    url: string;
    type: 'image' | 'video' | 'audio' | 'document' | 'other';
    name: string;
}

/**
 * Determine file type category from MIME type
 */
export const getFileType = (mimeType: string): UploadResult['type'] => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf' ||
        mimeType.includes('word') ||
        mimeType.includes('document') ||
        mimeType.includes('text') ||
        mimeType.includes('presentation') ||
        mimeType.includes('spreadsheet')) return 'document';
    return 'other';
}

/**
 * Upload a single file to Supabase Storage
 */
export const uploadFile = async (
    file: File,
    bucket: string = 'message-attachments',
    userId: string
): Promise<UploadResult> => {

    // 50MB Limit
    if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size exceeds 50MB limit');
    }

    // Generate unique path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    // Sanitize filename
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${timestamp}-${randomString}-${cleanName}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return {
        url: publicUrl,
        type: getFileType(file.type),
        name: file.name
    };
}
