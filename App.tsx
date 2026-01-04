import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QueryProvider } from './src/providers/QueryProvider';
import { supabase } from './services/supabaseClient';
import Navbar from './components/Navbar';
import Home from './components/pages/Home';
import OurStory from './components/pages/OurStory';
import Members from './components/pages/Members';
import SocialFeed from './components/pages/SocialFeed';
import Notifications from './components/pages/Notifications';
import PostDetail from './components/pages/PostDetail';
import UserProfile from './components/pages/UserProfile';
import Messages from './components/pages/Messages';
import Explore from './components/pages/Explore';
import Bookmarks from './components/pages/Bookmarks';
import Settings from './components/pages/Settings';
import AccountInformation from './components/pages/Settings/AccountInformation';
import SecuritySettings from './components/pages/Settings/SecuritySettings';
import ConnectedAccounts from './components/pages/Settings/ConnectedAccounts';
import DownloadData from './components/pages/Settings/DownloadData';
import TermsOfService from './components/pages/Legal/TermsOfService';
import PrivacyPolicy from './components/pages/Legal/PrivacyPolicy';
import CookiePolicy from './components/pages/Legal/CookiePolicy';
import WordWizardModal from './components/WordWizardModal';
import AuthModal from './components/Auth/AuthModal';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Footer from './components/Footer';
import { GistProvider } from './contexts/GistContext';
import GistDock from './components/Gist/GistDock';
import GistRoom from './components/Gist/GistRoom';
import GistJoinHandler from './components/Gist/GistJoinHandler';

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
  const shouldShowFooter = !['/feed', '/messages', '/post', '/profile', '/notifications', '/explore', '/bookmarks', '/settings'].some(path => location.pathname.startsWith(path));

  return (
    <div className="bg-[#052120] min-h-screen text-white font-sans selection:bg-nsp-orange selection:text-white flex flex-col">
      {shouldShowFooter && (
        <Navbar
          onWizardClick={() => setIsWizardOpen(true)}
          onAuthClick={() => setIsAuthOpen(true)}
        />
      )}

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
          <Route path="/settings/account" element={
            <ProtectedRoute>
              <AccountInformation />
            </ProtectedRoute>
          } />
          <Route path="/settings/security" element={
            <ProtectedRoute>
              <SecuritySettings />
            </ProtectedRoute>
          } />
          <Route path="/settings/connected-accounts" element={
            <ProtectedRoute>
              <ConnectedAccounts />
            </ProtectedRoute>
          } />
          <Route path="/settings/download-data" element={
            <ProtectedRoute>
              <DownloadData />
            </ProtectedRoute>
          } />
          <Route path="/gist/:gistId" element={
            <ProtectedRoute>
              <GistJoinHandler />
            </ProtectedRoute>
          } />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/story" element={<OurStory />} />
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

      <GistDock />
      <GistRoom />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <QueryProvider>
          <ToastProvider>
            <NotificationProvider>
              <GistProvider>
                <ScrollToTop />
                <AppContent />
              </GistProvider>
            </NotificationProvider>
          </ToastProvider>
        </QueryProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;