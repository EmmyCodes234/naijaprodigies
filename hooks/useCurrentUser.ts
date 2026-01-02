import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentUser } from '../services/userService';
import type { User } from '../types';

export const useCurrentUser = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userProfile = await getCurrentUser();
        setProfile(userProfile);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authUser]);

  return { profile, loading, error };
};
