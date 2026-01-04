import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '@iconify/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!handle || !name) {
          setError('Handle and name are required');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, handle, name);
        if (error) throw error;
        onClose();
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setHandle('');
    setName('');
    setError('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a3a35] rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-6 text-nsp-orange">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Handle</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full px-4 py-2 bg-[#052120] border border-gray-600 rounded-lg focus:outline-none focus:border-nsp-orange"
                  placeholder="@username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#052120] border border-gray-600 rounded-lg focus:outline-none focus:border-nsp-orange"
                  placeholder="Your name"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[#052120] border border-gray-600 rounded-lg focus:outline-none focus:border-nsp-orange"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#052120] border border-gray-600 rounded-lg focus:outline-none focus:border-nsp-orange"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-nsp-orange hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow h-px bg-white/10"></div>
          <span className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">or</span>
          <div className="flex-grow h-px bg-white/10"></div>
        </div>

        <button
          onClick={async () => {
            const { error } = await signInWithGoogle();
            if (!error) onClose();
          }}
          className="w-full bg-white text-gray-900 font-bold py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
        >
          <Icon icon="devicon:google" width="20" />
          <span>Sign in with Google</span>
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={toggleMode}
            className="text-nsp-orange hover:underline text-sm"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div >
  );
};

export default AuthModal;
