import React, { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

const OurStory: React.FC = () => {
  // Hook for scroll animations
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up-fade');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    observerRef.current = observer;

    document.querySelectorAll('.timeline-item').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const milestones = [
    {
      year: '2019',
      title: 'The Beginning',
      description: 'The Nigeria Scrabble Prodigies (NSP) was officially formed on April 14, 2019. Born from a vision to nurture young talent, we started with a mission to revolutionize the mind sport in Nigeria.',
      icon: 'ph:plant-fill',
      color: 'nsp-teal'
    },
    {
      year: 'National',
      title: 'Ruling the Home Front',
      description: 'Our rapid ascent saw us producing National Champions across various categories. The consistent dominance of NSP members at national opens cemented our reputation as a powerhouse.',
      icon: 'ph:crown-fill',
      color: 'nsp-orange'
    },
    {
      year: 'NSF',
      title: 'Festival Glory',
      description: 'The National Sports Festival became our playground. NSP athletes have consistently secured medals, proving their mettle against the best in the country at the "Nigerian Olympics".',
      icon: 'ph:medal-fill',
      color: 'nsp-yellow'
    },
    {
      year: 'Universities',
      title: 'Conquering Campuses',
      description: 'Our intellectual dominance extended to university sports. From NUGA (Nigeria) to WAUG (West Africa) and FASU (All Africa), NSP members have stood tall on podiums across the continent.',
      icon: 'ph:student-fill',
      color: 'nsp-dark-teal'
    },
    {
      year: 'Africa',
      title: 'Continental Kings',
      description: 'We took the game to the All Africa Games, contributing significantly to Nigeria\'s medal haul. Our presence is felt wherever Scrabble is played on the continent.',
      icon: 'ph:globe-hemisphere-africa-fill',
      color: 'nsp-red'
    },
    {
      year: 'Global',
      title: 'Youth Champions',
      description: 'The future is bright. We have produced AYSC (Africa Youth Scrabble Championship) Champions, ensuring the legacy of Nigerian Scrabble dominance continues with the next generation.',
      icon: 'ph:rocket-launch-fill',
      color: 'purple-600'
    }
  ];

  return (
    <div className="bg-[#f2f0e9] min-h-screen pt-24 pb-16 lg:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16 lg:mb-24 relative z-10">
          <div className="inline-block p-2 px-4 rounded-full bg-nsp-teal/10 text-nsp-teal font-bold text-sm uppercase mb-4 tracking-wider">Since 2019</div>
          <h1 className="font-marker text-5xl md:text-7xl text-nsp-dark-teal mb-6">Our Legacy</h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto font-sans leading-relaxed">
            From a humble beginning on April 14, 2019, to producing champions across Africa.
            This is the timeline of the Nigeria Scrabble Prodigies.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative max-w-5xl mx-auto">
          {/* Central Line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] bg-gray-200 transform -translate-x-1/2"></div>

          <div className="space-y-12 relative pb-20">
            {milestones.map((item, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={index} className={`timeline-item flex flex-col md:flex-row items-center w-full opacity-0 translate-y-8 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] gpu-accelerate ${isEven ? 'md:justify-start' : 'md:justify-end'}`}>

                  {/* Central Node (Desktop) */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 bg-white rounded-full border-4 border-[#f2f0e9] z-20 hidden md:flex shadow-md">
                    <div className={`w-full h-full rounded-full flex items-center justify-center bg-${item.color} text-white`}>
                      <Icon icon={item.icon} className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={`w-full md:w-[45%] bg-white p-8 rounded-2xl shadow-lg border-l-4 border-${item.color} hover:shadow-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 relative z-10 group gpu-accelerate`}>
                    <div className={`text-${item.color} font-black text-3xl mb-2 font-luckiest flex items-center gap-3`}>
                      {item.year}
                      {/* Mobile Icon */}
                      <div className="md:hidden p-2 rounded-full bg-gray-50 text-base border border-gray-100">
                        <Icon icon={item.icon} />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-nsp-dark-teal mb-3 group-hover:text-nsp-teal transition-colors">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-[15px]">
                      {item.description}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Quote */}
        <div className="text-center mt-20 p-10 bg-nsp-dark-teal rounded-[3rem] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
          <Icon icon="ph:quotes-fill" className="text-nsp-teal/30 w-16 h-16 mx-auto mb-4" />
          <p className="text-2xl md:text-4xl font-luckiest tracking-wide mb-4 relative z-10">
            "We are not just playing Scrabble;<br /> we are building legacies."
          </p>
        </div>
      </div>

      <style>{`
                .animate-slide-up-fade {
                    opacity: 1 !important;
                    transform: translateY(0) !important;
                }
            `}</style>
    </div>
  );
};

export default OurStory;