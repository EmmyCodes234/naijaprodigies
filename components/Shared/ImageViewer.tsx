import React, { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, onClose }) => {
    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50 backdrop-blur-sm"
            >
                <Icon icon="ph:x-bold" width="24" height="24" />
            </button>

            <div
                className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={alt || 'Full view'}
                    className="w-full h-full object-contain max-h-[90vh] rounded-lg shadow-2xl"
                />
            </div>
        </div>,
        document.body
    );
};

export default ImageViewer;
