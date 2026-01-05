import { useAuth } from '../contexts/AuthContext';
import { getCurrentUser } from '../services/userService';
import { useQuery } from '@tanstack/react-query';

export const useCurrentUser = () => {
  const { user: authUser, loading: authLoading } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['currentUser', authUser?.id],
    queryFn: getCurrentUser,
    enabled: !!authUser,
    staleTime: 1000 * 60 * 30, // 30 minutes
    // Use initial data if we wanted, but caching is enough
  });

  // Combine loading states: 
  // If auth is loading, we are loading.
  // If auth is done but no user, we are not loading (profile null).
  // If auth is done and user exists, we wait for query.
  const loading = authLoading || (!!authUser && isLoading);

  return {
    profile: profile || null,
    loading,
    error: error as Error | null
  };
};
