import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QueryProvider } from './providers/QueryProvider';
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
// DISABLED: TV, Director, Tournaments features
// import NSPTV from './components/pages/NSPTV';
// import TournamentDirector from './components/pages/TournamentDirector';
// import TournamentHub from './components/pages/TournamentHub';
// import ArenaBrowser from './components/pages/ArenaBrowser';
// import ArenaDirector from './components/pages/ArenaDirector';
// import ArenaLobby from './components/pages/ArenaLobby';
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
import AuthModal from './components/Auth/AuthModal';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Footer from './components/Footer';
import { GistProvider } from './contexts/GistContext';
import GistDock from './components/Gist/GistDock';
import GistRoom from './components/Gist/GistRoom';
import GistJoinHandler from './components/Gist/GistJoinHandler';
import { MembersProvider } from './contexts/MembersContext';
import ProdigyChat from './components/pages/ProdigyChat';
const ScrollRestoration = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    // Check if this is a back/forward navigation
    const isBackForward = window.performance?.navigation?.type === 2;

    if (!isBackForward) {
      // Only scroll to top on new navigation (not back/forward)
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

const AppContent: React.FC = () => {
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
  const shouldShowFooter = !['/feed', '/messages', '/post', '/profile', '/notifications', '/explore', '/bookmarks', '/settings', '/prodigy'].some(path => location.pathname.startsWith(path));

  return (
    <div className="bg-[#052120] min-h-screen text-white font-sans selection:bg-nsp-orange selection:text-white flex flex-col">
      {shouldShowFooter && (
        <Navbar
          onWizardClick={() => { /* No-op or removed */ }}
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
          <Route path="/prodigy" element={
            <ProtectedRoute>
              <ProdigyChat />
            </ProtectedRoute>
          } />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/story" element={<OurStory />} />
          <Route path="/members" element={<Members />} />
          {/* Dynamic route for user handles (e.g. /username) - Must be last */}
          <Route path="/:userId" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          {/* DISABLED: TV, Director, Tournaments features
          <Route path="/tv" element={
            <ProtectedRoute>
              <NSPTV />
            </ProtectedRoute>
          } />
          <Route path="/director" element={
            <ProtectedRoute>
              <TournamentDirector />
            </ProtectedRoute>
          } />
          <Route path="/tournament/:tournamentId" element={
            <ProtectedRoute>
              <TournamentHub />
            </ProtectedRoute>
          } />
          <Route path="/tournaments" element={
            <ProtectedRoute>
              <ArenaBrowser />
            </ProtectedRoute>
          } />
          <Route path="/arena" element={
            <ProtectedRoute>
              <ArenaLobby />
            </ProtectedRoute>
          } />
          <Route path="/director/:id" element={
            <ProtectedRoute>
              <ArenaDirector />
            </ProtectedRoute>
          } />
          */}
        </Routes>
      </main>

      {shouldShowFooter && <Footer />}

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
          <MembersProvider>
            <ToastProvider>
              <NotificationProvider>
                <GistProvider>
                  <ScrollRestoration />
                  <AppContent />
                </GistProvider>
              </NotificationProvider>
            </ToastProvider>
          </MembersProvider>
        </QueryProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;