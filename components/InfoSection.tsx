import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useAnimationOnce } from '../hooks/useAnimationOnce';

// Custom hook for checking visibility
const useInView = (options?: IntersectionObserverInit) => {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasAnimated = useAnimationOnce('info-section');

  useEffect(() => {
    if (!ref) return;

    // If already animated, show immediately
    if (hasAnimated) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target); // Only trigger once
      }
    }, options);
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options, hasAnimated]);

  return [setRef, isVisible] as const;
};

const InfoSection: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Refs for scroll animations
  const [textRef, textVisible] = useInView({ threshold: 0.2 });
  const [imageRef, imageVisible] = useInView({ threshold: 0.2 });
  const [statsRef, statsVisible] = useInView({ threshold: 0.1 });

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    handleResize();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className="bg-[#f2f0e9] py-24 lg:py-32 px-6 relative z-40 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Text Content */}
          <div
            ref={textRef as any}
            className={`transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] transform gpu-accelerate ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
          >
            <h2 className="font-luckiest text-5xl md:text-6xl text-nsp-teal mb-6">
              More Than Just A Game
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 leading-relaxed font-sans mb-10">
              Scrabble in Nigeria isn't just a pastime; it's a national sport.
              From street corners in Lagos to grand halls in Abuja, the click-clack of tiles
              is the rhythm of champions in the making.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div
                className={`bg-white p-6 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,60,58,1)] border-2 border-nsp-teal transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(15,60,58,1)] gpu-accelerate ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                style={{ transitionDelay: '300ms' }}
              >
                <Icon icon="ph:crown-fill" className="text-nsp-orange mb-3" width="32" height="32" />
                <h3 className="font-bold text-nsp-dark-teal text-lg">Continental Kings</h3>
                <p className="text-sm text-gray-600 mt-2 leading-snug">Home to Africa Youth Scrabble Champions (AYSC).</p>
              </div>
              <div
                className={`bg-white p-6 rounded-xl shadow-[4px_4px_0px_0px_rgba(217,58,38,1)] border-2 border-nsp-red transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(217,58,38,1)] gpu-accelerate ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                style={{ transitionDelay: '500ms' }}
              >
                <Icon icon="ph:medal-fill" className="text-nsp-red mb-3" width="32" height="32" />
                <h3 className="font-bold text-nsp-dark-teal text-lg">National Glory</h3>
                <p className="text-sm text-gray-600 mt-2 leading-snug">Consistently producing National Champions & NSF Medalists.</p>
              </div>
            </div>
          </div>

          {/* Visual/Image Placeholder - Parallax applied only on desktop */}
          <div
            ref={imageRef as any}
            className={`relative will-change-transform transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-200 gpu-accelerate ${imageVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
              }`}
            style={{
              transform: isMobile || !imageVisible ? undefined : `translateY(${scrollY * 0.08}px)`
            }}
          >
            <div className="absolute inset-0 bg-nsp-orange rounded-3xl transform rotate-3 translate-x-4 translate-y-4 lg:translate-x-6 lg:translate-y-6"></div>
            <div className="relative bg-nsp-teal rounded-3xl overflow-hidden aspect-square shadow-2xl flex items-center justify-center group">
              <img
                src="https://images.unsplash.com/photo-1591635566278-10dca0ca76ee?q=80&w=1000&auto=format&fit=crop"
                alt="Scrabble Tiles"
                className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 lg:p-12">
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 transform transition-transform duration-500 hover:scale-105">
                  <p className="text-white font-bold text-lg lg:text-xl leading-relaxed">"The dictionary is the only place where success comes before work."</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Stats Row */}
        <div
          ref={statsRef as any}
          className="mt-24 lg:mt-32 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12"
        >
          {[
            { label: 'Active Members', value: '100+', icon: 'ph:users-three-fill' }, // Adjusted to a more realistic number based on members.json
            { label: 'Championships', value: '50+', icon: 'ph:trophy-fill' },
            { label: 'Established', value: '2019', icon: 'ph:calendar-check-fill' },
            { label: 'Prodigies', value: '200+', icon: 'ph:brain-fill' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`text-center group transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] gpu-accelerate ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
              style={{ transitionDelay: `${idx * 150}ms` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white shadow-lg mb-4 text-nsp-teal group-hover:bg-nsp-orange group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Icon icon={stat.icon} width="28" height="28" className="lg:w-8 lg:h-8" />
              </div>
              <h4 className="font-luckiest text-4xl lg:text-5xl text-nsp-dark-teal">{stat.value}</h4>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs lg:text-sm mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InfoSection;