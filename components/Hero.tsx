import React, { useLayoutEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Hero: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    // Use gsap.context for proper cleanup in React 18+
    // This ensures pin-spacers and inline styles are reverted before unmount
    const ctx = gsap.context(() => {
      // Main Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=200%", // Scroll distance (200vh)
          scrub: 1,      // Smooth scrubbing
          pin: true,     // Pin the section
          anticipatePin: 1
        }
      });

      // Animation Steps
      tl.to("#hero-text", {
        scale: 10,       // Fly through text
        opacity: 0,
        ease: "power2.in",
        duration: 5
      }, 0)
        .to("#road-container", {
          scale: 30,       // Zoom into road
          y: 500,          // Move horizon down slightly
          ease: "power1.in",
          duration: 10
        }, 0)
        .to("#hero-bg", {
          opacity: 0,      // Fade out background to white/next section
          duration: 4
        }, 6);

    }, containerRef); // Scope selection to this component

    return () => {
      ctx.revert(); // Reverts all GSAP changes (pinning, styles) instantly
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="hero-section"
      className="relative w-full h-screen overflow-hidden flex flex-col justify-center items-center bg-[#052120]"
    >

      {/* Background Container for Fade Effect */}
      <div id="hero-bg" className="absolute inset-0 w-full h-full">
        {/* Layer 1: Sky Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2e2c] via-[#124a48] to-[#f08920]"></div>

        {/* Layer 2: Abstract Landscape */}
        <div className="absolute bottom-0 left-0 w-full h-[60vh] z-10">
          {/* Distant Mountains */}
          <div className="absolute bottom-0 left-0 w-full h-full opacity-60">
            <div className="absolute bottom-0 left-[-20%] w-[140%] h-[70%] bg-[#1a5553] rounded-t-[100%] transform scale-y-50"></div>
            <div className="absolute bottom-0 right-[-10%] w-[80%] h-[80%] bg-[#236b68] rounded-t-[100%] transform scale-y-75 translate-x-10"></div>
          </div>

          {/* Mid-ground Hills */}
          <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-[#8a2517] to-[#d93a26] clip-hills transform origin-bottom scale-y-125 z-20"></div>
        </div>

        {/* Layer 3: Road/Path (The Tunnel) */}
        <div id="road-container" className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-[50vh] flex justify-center z-20 origin-bottom">
          <div className="w-[100px] md:w-[200px] h-full bg-[#1a1a1a] transform perspective-3d flex justify-center overflow-hidden border-x-[20px] border-[#3a2a1a] opacity-90 box-content">
            {/* Road Markings */}
            <div className="h-full w-2 bg-yellow-500/80 dashed-line"></div>
          </div>
        </div>

        {/* Layer 4: Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 z-30 pointer-events-none mix-blend-overlay"></div>
      </div>

      {/* Content Container */}
      <div
        id="hero-text"
        className="relative z-40 text-center px-4 max-w-7xl mx-auto mt-[-10vh] lg:mt-0 will-change-transform"
      >

        {/* Top Tagline */}
        <p className="text-sm md:text-lg lg:text-xl font-bold tracking-[0.2em] text-nsp-yellow mb-4 uppercase drop-shadow-md animate-hero-text">
          From Naija to the World
        </p>

        {/* Main Headline */}
        <h1 className="font-marker text-6xl md:text-8xl lg:text-9xl text-white leading-[0.9] drop-shadow-xl transform -rotate-2">
          <span className="block animate-hero-text" style={{ animationDelay: '0.1s' }}>
            THE CHAMPIONS
          </span>
          <span className="block relative animate-hero-text" style={{ animationDelay: '0.2s' }}>
            <span className="relative z-10">OF THE BOARD</span>
            {/* Underline decoration */}
            <svg
              className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-64 md:w-96 lg:w-[36rem] xl:w-[42rem] h-6 text-nsp-orange -z-10 animate-stroke"
              style={{ animationDelay: '0.5s' }}
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
        </h1>

        <p className="mt-8 text-lg md:text-2xl text-gray-200 max-w-3xl mx-auto font-sans font-medium leading-relaxed drop-shadow-md animate-hero-text" style={{ animationDelay: '0.3s' }}>
          Join the journey of Nigeria's finest Scrabble Prodigies as they redefine strategy, creativity, and excellence.
        </p>

      </div>

      <style>{`
        .clip-hills {
          clip-path: polygon(0% 100%, 0% 30%, 20% 45%, 40% 25%, 60% 50%, 80% 35%, 100% 60%, 100% 100%);
        }
        .perspective-3d {
           transform: perspective(500px) rotateX(60deg);
        }
        .dashed-line {
          background-image: linear-gradient(to bottom, #fccb56 50%, transparent 50%);
          background-size: 10px 60px;
        }
        
        /* Intro Animations (Run once on load) */
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-hero-text {
          opacity: 0;
          animation: slideUpFade 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes drawStroke {
          0% { stroke-dashoffset: 120; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        .animate-stroke path {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: drawStroke 1.2s cubic-bezier(0.45, 0, 0.55, 1) forwards;
        }
      `}</style>
    </section>
  );
};

export default Hero;