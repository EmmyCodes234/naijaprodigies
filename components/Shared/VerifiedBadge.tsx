import React from 'react';
import { Icon } from '@iconify/react';
import { User } from '../../types';

interface VerifiedBadgeProps {
    user?: User;
    className?: string;
    size?: number;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ user, className = "", size = 16 }) => {
    if (!user) return null;

    // Fallback: If verification_type is missing but verified is true, use green.
    const isVerified = user.verified || (user.verification_type && user.verification_type !== 'none');

    if (!isVerified) return null;

    const type = user.verification_type || ('verified' in user && user.verified ? 'green' : 'none');

    let badgeColor = "text-nsp-teal"; // Default Green
    let icon = "ph:seal-check-fill";

    if (type === 'gold') {
        badgeColor = "text-[#fccb56]"; // NSP Gold/Yellow
    } else if (type === 'grey') {
        badgeColor = "text-[#9ca3af]"; // Neutral Grey
    } else if (type === 'green') {
        badgeColor = "text-nsp-teal"; // Individual Green
    }

    return (
        <Icon
            icon={icon}
            className={`${badgeColor} ${className}`}
            width={size}
            height={size}
        />
    );
};

export default VerifiedBadge;
