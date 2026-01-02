import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { supabase } from './services/supabaseClient';
import Navbar from './components/Navbar';
import Home from './components/pages/Home';
import OurStory from './components/pages/OurStory';
import Tournaments from './components/pages/Tournaments';
import Blog from './components/pages/Blog';
import Members from './components/pages/Members';
import SocialFeed from './components/pages/SocialFeed';
import Notifications from './components/pages/Notifications';
import PostDetail from './components/pages/PostDetail';
import UserProfile from './components/pages/UserProfile';
import Messages from './components/pages/Messages';
import Explore from './components/pages/Explore';
import Bookmarks from './components/pages/Bookmarks';
import Settings from './components/pages/Settings';
import WordWizardModal from './components/WordWizardModal';
import AuthModal from './components/Auth/AuthModal';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Footer from './components/Footer';

// Wrapper to ensure scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppContent: React.FC = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const location = useLocation();

  // Add periodic session refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await supabase.auth.refreshSession();
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(interval);
  }, []);

  // Determine if footer should be shown
  const shouldShowFooter = !['/feed', '/messages', '/post', '/profile', '/notifications'].some(path => location.pathname.startsWith(path));

  return (
    <div className="bg-[#052120] min-h-screen text-white font-sans selection:bg-nsp-orange selection:text-white flex flex-col">
      <Navbar
        onWizardClick={() => setIsWizardOpen(true)}
        onAuthClick={() => setIsAuthOpen(true)}
      />

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={
            <ProtectedRoute>
              <SocialFeed />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          <Route path="/post/:postId" element={
            <ProtectedRoute>
              <PostDetail />
            </ProtectedRoute>
          } />
          <Route path="/profile/:userId" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          <Route path="/explore" element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          } />
          <Route path="/bookmarks" element={
            <ProtectedRoute>
              <Bookmarks />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/story" element={<OurStory />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/members" element={<Members />} />
        </Routes>
      </main>

      {shouldShowFooter && <Footer />}

      <WordWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <ScrollToTop />
            <AppContent />
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;