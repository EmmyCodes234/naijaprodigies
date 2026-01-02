/**
 * Get the avatar URL for a user
 * Falls back to UI Avatars if no avatar is set or if the user is null
 */
export const getAvatarUrl = (user: { avatar?: string | null; name?: string; handle?: string } | null | undefined): string => {
    if (user?.avatar) return user.avatar;

    // Use UI Avatars as fallback
    const name = user?.name || user?.handle || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff&bold=true`;
};
