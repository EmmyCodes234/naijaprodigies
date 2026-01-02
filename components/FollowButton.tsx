import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
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
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // Revert optimistic update on error
      setIsFollowingState(previousState);
      
      // Show error message
      if (error instanceof RateLimitError) {
        alert(error.message);
      } else if (error instanceof Error && error.message === 'Cannot follow yourself') {
        alert('You cannot follow yourself');
      } else {
        alert('Failed to update follow status. Please try again.');
      }
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
      disabled={isProcessing}
      className={`px-4 py-2 rounded-full font-bold transition-colors ${
        isFollowingState
          ? 'border border-gray-300 text-gray-900 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          : 'bg-nsp-teal text-white hover:bg-nsp-dark-teal'
      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isProcessing ? (
        <Icon icon="line-md:loading-twotone-loop" width="20" height="20" className="inline" />
      ) : isFollowingState ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  );
};

export default FollowButton;
