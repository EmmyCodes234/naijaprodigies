import React from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#031514] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Top Border Gradient */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-nsp-teal via-nsp-orange to-nsp-red"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

          {/* Brand Column (Span 4) */}
          <div className="lg:col-span-4">
            <h2 className="text-4xl font-black tracking-tighter mb-6 text-white">NSP</h2>
            <p className="text-gray-400 mb-8 leading-relaxed max-w-sm">
              Empowering the next generation of Scrabble champions from Nigeria to the global stage. We define strategy, creativity, and excellence.
            </p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/nigerianscrabbleprodigies"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 p-3 rounded-full hover:bg-nsp-orange hover:text-white transition-all transform hover:-translate-y-1 hover:shadow-lg flex items-center gap-2 pr-4 group"
              >
                <Icon icon="ri:instagram-fill" width="20" height="20" />
                <span className="text-sm font-bold text-gray-300 group-hover:text-white">@nigerianscrabbleprodigies</span>
              </a>
            </div>
          </div>

          {/* Links Column (Span 2) */}
          <div className="lg:col-span-2 lg:col-start-6">
            <h3 className="font-luckiest text-xl text-nsp-yellow mb-6 tracking-wide">Explore</h3>
            <ul className="space-y-4">
              {[
                { label: 'Social Feed', path: '/feed' },
                { label: 'Our Story', path: '/story' },
                { label: 'Members', path: '/members' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-gray-400 hover:text-nsp-orange transition-colors text-sm font-semibold uppercase tracking-wide">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button className="text-gray-400 hover:text-nsp-orange transition-colors text-sm font-semibold uppercase tracking-wide">Word Wizard</button>
              </li>
            </ul>
          </div>

          {/* Contact Column (Span 3) */}
          <div className="lg:col-span-3">
            <h3 className="font-luckiest text-xl text-nsp-yellow mb-6 tracking-wide">Contact</h3>
            <ul className="space-y-6">
              <li className="flex items-start gap-4 text-gray-400">
                <div className="bg-nsp-teal/20 p-2 rounded-lg text-nsp-teal">
                  <Icon icon="ph:envelope-fill" width="18" height="18" />
                </div>
                <span className="mt-1">hello.nsp@gmail.com</span>
              </li>
              <li className="flex items-start gap-4 text-gray-400">
                <div className="bg-nsp-teal/20 p-2 rounded-lg text-nsp-teal">
                  <Icon icon="ph:map-pin-fill" width="18" height="18" />
                </div>
                <span className="mt-1 leading-relaxed">
                  Lagos, Nigeria
                </span>
              </li>
            </ul>
          </div>

          {/* Newsletter Column (Span 3) */}
          <div className="lg:col-span-3">
            <h3 className="font-luckiest text-xl text-nsp-yellow mb-6 tracking-wide">Stay Sharp</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get daily word tips and tournament updates.
            </p>
            <form className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-4 py-3 text-white focus:outline-none focus:border-nsp-orange transition-colors placeholder-gray-600"
                />
              </div>
              <button
                type="button"
                className="relative group font-bold text-white w-full sm:w-auto transition-transform transform hover:-translate-y-1"
              >
                <img
                  src="https://endspeciesism.org/_next/static/media/cta.99be8170.svg"
                  className="absolute inset-0 w-full h-full object-fill drop-shadow-lg group-hover:drop-shadow-xl transition-all"
                  alt=""
                />
                <span className="relative z-10 flex items-center justify-center gap-2 px-8 py-3">
                  Subscribe
                  <Icon icon="ph:arrow-right-bold" width="18" height="18" className="transform group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Nigeria Scrabble Prodigies. All tiles reserved.
          </p>
          <div className="flex gap-8 text-sm text-gray-500 font-medium">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none">
        <h1 className="text-[15rem] font-black leading-none text-white tracking-tighter select-none translate-y-1/3 translate-x-1/4">NSP</h1>
      </div>
    </footer>
  );
};

export default Footer;