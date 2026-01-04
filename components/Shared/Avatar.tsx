import React, { useState, useEffect } from 'react';

interface AvatarProps {
    user?: { avatar?: string | null; name?: string; handle?: string } | null;
    src?: string | null; // Allow direct src override
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    alt?: string;
}

const Avatar: React.FC<AvatarProps> = ({ user, src: directSrc, className = "", onClick, alt }) => {
    const [imgError, setImgError] = useState(false);

    // Reset error state if user changes
    useEffect(() => {
        setImgError(false);
    }, [user?.avatar, directSrc]);

    const getFallbackUrl = (name?: string) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D9488&color=fff&bold=true`;
    };

    // Logic: 
    // 1. Try directSrc if provided
    // 2. Try user.avatar
    // 3. Fallback
    // If any fail (onError), go to fallback.

    let imageSource = directSrc || user?.avatar;

    if (!imageSource || imgError) {
        imageSource = getFallbackUrl(user?.name || user?.handle);
    }

    return (
        <img
            src={imageSource}
            alt={alt || user?.name || 'User'}
            className={className}
            onClick={onClick}
            onError={() => setImgError(true)}
        />
    );
};

export default Avatar;
