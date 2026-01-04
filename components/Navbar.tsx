import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';
import { NavLink } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  onWizardClick: () => void;
  onAuthClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onWizardClick, onAuthClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const links: NavLink[] = [
    { label: 'Feed', href: '/feed' },
    { label: 'Story', href: '/story' },
    { label: 'Members', href: '/members' },
  ];

  const isHome = location.pathname === '/';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${scrolled || mobileMenuOpen || !isHome ? 'bg-nsp-dark-teal/95 backdrop-blur-md py-4 shadow-lg' : 'bg-transparent py-6'
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative z-[1000]">
        {/* Logo */}
        <div className="flex flex-col">
          <Link to="/">
            <img src="/nsp_logo_white.png?v=2" alt="NSP" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 lg:gap-10">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={`text-sm font-bold transition-all uppercase tracking-wide relative group ${location.pathname === link.href ? 'text-white opacity-100' : 'text-gray-200 opacity-80 hover:text-white hover:opacity-100'
                }`}
            >
              {link.label}
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-nsp-orange transition-all duration-300 group-hover:w-full ${location.pathname === link.href ? 'w-full' : ''}`}></span>
            </Link>
          ))}
        </div>

        {/* Desktop CTA Button */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onWizardClick}
            className="relative group font-bold text-white transition-transform transform hover:-translate-y-1 active:translate-y-0"
          >
            <img
              src="https://endspeciesism.org/_next/static/media/cta.99be8170.svg"
              className="absolute inset-0 w-full h-full object-fill drop-shadow-lg group-hover:drop-shadow-xl transition-all"
              alt=""
            />
            <span className="relative z-10 flex items-center gap-2 px-8 py-3 filter drop-shadow-sm">
              <span>Word Wizard</span>
              <Icon icon="ph:sparkle-fill" width="16" height="16" />
            </span>
          </button>

          {user ? (
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm font-bold text-white hover:text-nsp-orange transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={onAuthClick}
              className="px-6 py-2 bg-nsp-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-white p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <Icon icon="ph:x-bold" width="28" height="28" />
          ) : (
            <Icon icon="ph:list-bold" width="28" height="28" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-nsp-dark-teal/95 backdrop-blur-xl border-t border-white/10 shadow-2xl transition-all duration-300 ease-in-out origin-top ${mobileMenuOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto visible'
          : 'opacity-0 -translate-y-4 pointer-events-none invisible'
          }`}
      >
        <div className="flex flex-col items-center gap-6 py-10 px-6">
          {links.map((link, idx) => (
            <Link
              key={link.label}
              to={link.href}
              className={`text-xl font-bold text-white hover:text-nsp-orange transition-colors tracking-wide transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
              style={{ transitionDelay: `${idx * 50}ms` }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <div
            className={`w-full max-w-xs mt-4 transform transition-all duration-500 delay-200 ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          >
            <button
              onClick={() => {
                onWizardClick();
                setMobileMenuOpen(false);
              }}
              className="relative w-full group font-bold text-white text-lg transition-transform active:scale-95"
            >
              <img
                src="https://endspeciesism.org/_next/static/media/cta.99be8170.svg"
                className="absolute inset-0 w-full h-full object-fill drop-shadow-md"
                alt=""
              />
              <span className="relative z-10 flex justify-center items-center gap-2 py-4">
                Ask the Wizard
                <Icon icon="ph:sparkle-fill" width="20" height="20" />
              </span>
            </button>

            {user ? (
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-4 px-6 py-3 text-white hover:text-nsp-orange font-bold transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => {
                  onAuthClick();
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-4 px-6 py-3 bg-nsp-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;