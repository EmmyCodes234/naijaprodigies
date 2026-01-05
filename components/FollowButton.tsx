import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../services/supabaseClient';
import { followUser, unfollowUser, isFollowing } from '../services/followService';
import { RateLimitError } from '../utils/rateLimiter';

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  initialFollowState?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  currentUserId,
  initialFollowState,
  onFollowChange
}) => {
  const [isFollowingState, setIsFollowingState] = useState<boolean>(initialFollowState ?? false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(initialFollowState === undefined);
  const [isHovering, setIsHovering] = useState(false);

  // Load initial follow state if not provided
  useEffect(() => {
    if (initialFollowState === undefined) {
      const loadFollowState = async () => {
        try {
          const following = await isFollowing(currentUserId, targetUserId);
          setIsFollowingState(following);
        } catch (error) {
          console.error('Failed to load follow state:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadFollowState();
    }
  }, [currentUserId, targetUserId, initialFollowState]);

  const handleClick = async () => {
    if (isProcessing) return;

    if (!currentUserId) {
      alert('Please log in to follow users.');
      return;
    }

    // Verify session is active (but uses currentUserId for DB operations)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Session expired. Please log in again.');
      return;
    }

    setIsProcessing(true);
    const previousState = isFollowingState;

    // Optimistic update
    setIsFollowingState(!previousState);

    try {
      if (previousState) {
        await unfollowUser(currentUserId, targetUserId);
      } else {
        await followUser(currentUserId, targetUserId);
      }

      // Notify parent component of the change
      onFollowChange?.(!previousState);
    } catch (error: any) {
      console.error('Failed to toggle follow:', error);

      // AUTO-HEAL: If user profile is missing (Foreign Key Violation) or has permission issues (RLS Violation)
      const isFkError = error?.code === '23503';
      const isRlsError = error?.code === '42501';

      if (isFkError || isRlsError) {
        try {
          console.log('User profile missing or mismatch. Attempting to auto-create...');

          if (user) {
            console.log('User authenticated. Attempting emergency RPC fix...');

            const { error: rpcError } = await supabase.rpc('ensure_user_profile', {
              p_id: currentUserId, // Use the Profile ID we have (which should match user.id or be valid)
              p_name: user.user_metadata?.name || 'User',
              p_handle: user.user_metadata?.handle || `user_${user.id.substring(0, 8)}`,
              p_avatar: user.user_metadata?.avatar_url || null
            });

            if (!rpcError) {
              console.log('Profile repaired via RPC! Retrying follow...');
              // Retry the follow action
              if (previousState) {
                await unfollowUser(currentUserId, targetUserId);
              } else {
                await followUser(currentUserId, targetUserId);
              }
              // If we get here, it succeeded on retry!
              onFollowChange?.(!previousState);
              return; // Success, skip the revert code below
            } else {
              console.error('RPC Fix failed:', rpcError);
            }
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }

      // Revert optimistic update on error if we didn't return above
      setIsFollowingState(previousState);

      // Show better error message
      let errorMessage = 'Failed to update follow status.';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage += ` ${(error as any).message}`;
      }
      if (error && typeof error === 'object' && 'details' in error) {
        errorMessage += ` (${(error as any).details})`;
      }

      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 border border-gray-300 rounded-full font-bold text-gray-400 cursor-not-allowed"
      >
        <Icon icon="line-md:loading-twotone-loop" width="20" height="20" className="inline" />
      </button>
    );
  }


  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={isProcessing}
      className={`px-4 py-1.5 rounded-full font-bold transition-all duration-200 text-sm ${isFollowingState
        ? 'border border-gray-200 text-gray-900 hover:bg-red-50 hover:text-red-600 hover:border-red-200 bg-white min-w-[100px]'
        : 'bg-black text-white hover:bg-gray-800 min-w-[80px]'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isProcessing ? (
        <Icon icon="line-md:loading-twotone-loop" width="20" height="20" className="inline" />
      ) : isFollowingState ? (
        isHovering ? 'Unfollow' : 'Following'
      ) : (
        'Follow'
      )}
    </button>
  );
};

export default FollowButton;
