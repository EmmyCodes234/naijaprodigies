import React from 'react';
import { Icon } from '@iconify/react';

const Tournaments: React.FC = () => {
  return (
    <div className="bg-[#f2f0e9] min-h-screen pt-24 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16 lg:mb-24">
          <h1 className="font-marker text-6xl text-nsp-teal mb-4">Tournaments</h1>
          <p className="text-xl text-gray-600">Where legends are made, one tile at a time.</p>
        </div>

        {/* Featured Upcoming Event */}
        <div className="bg-nsp-dark-teal rounded-3xl overflow-hidden shadow-2xl mb-20 lg:mb-32 text-white relative group">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?q=80&w=2000&auto=format&fit=crop')] opacity-20 bg-cover bg-center group-hover:scale-105 transition-transform duration-1000"></div>
           <div className="relative p-8 md:p-16 lg:p-20 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1">
                <div className="inline-block bg-nsp-orange text-white text-xs font-bold px-3 py-1 rounded-full mb-4 lg:mb-6 uppercase tracking-wider">Upcoming Major</div>
                <h2 className="font-luckiest text-5xl lg:text-6xl mb-4">The Lagos Grand Slam</h2>
                <p className="text-gray-300 text-lg lg:text-xl mb-8 leading-relaxed max-w-2xl">
                  The biggest scramble event of the year returns to the Eko Convention Center. 
                  Top players from 15 countries will compete for the ultimate prize.
                </p>
                <div className="flex flex-wrap gap-6 lg:gap-10 mb-8 lg:mb-12">
                  <div className="flex items-center gap-2">
                    <Icon icon="ph:calendar-fill" className="text-nsp-yellow" width="20" height="20" />
                    <span className="font-semibold">Nov 15-18, 2024</span>
                  </div>
                   <div className="flex items-center gap-2">
                    <Icon icon="ph:map-pin-fill" className="text-nsp-yellow" width="20" height="20" />
                    <span className="font-semibold">Lagos, Nigeria</span>
                  </div>
                   <div className="flex items-center gap-2">
                    <Icon icon="ph:trophy-fill" className="text-nsp-yellow" width="20" height="20" />
                    <span className="font-semibold">$50,000 Prize Pool</span>
                  </div>
                </div>
                
                <button className="relative group font-bold text-white transition-transform transform hover:-translate-y-1 inline-block">
                  <img 
                    src="https://endspeciesism.org/_next/static/media/cta.99be8170.svg" 
                    className="absolute inset-0 w-full h-full object-fill drop-shadow-lg"
                    alt=""
                  />
                  <span className="relative z-10 flex items-center gap-2 px-8 py-4">
                    Register Now
                    <Icon icon="ph:arrow-right-bold" />
                  </span>
                </button>
              </div>
              
              {/* Countdown or visual */}
              <div className="w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl text-center min-w-[200px] transform hover:scale-105 transition-transform duration-300">
                 <div className="text-6xl font-black text-nsp-yellow mb-2">24</div>
                 <div className="text-sm uppercase tracking-widest text-gray-300 font-bold">Days Left</div>
              </div>
           </div>
        </div>

        {/* Past Events Grid */}
        <h3 className="font-luckiest text-3xl md:text-4xl text-nsp-dark-teal mb-8 lg:mb-12">Recent Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {[
            {
              title: "Abuja National Open",
              date: "Aug 2024",
              winner: "Wellington Jighere",
              img: "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?auto=format&fit=crop&q=80&w=600"
            },
            {
              title: "University Challenge",
              date: "July 2024",
              winner: "Team UNILAG",
              img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600"
            },
            {
              title: "Junior Scrabble League",
              date: "June 2024",
              winner: "Sarah Adebayo",
              img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600"
            }
          ].map((event, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="h-56 overflow-hidden">
                <img src={event.img} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
              </div>
              <div className="p-8">
                 <div className="flex justify-between items-center mb-3">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{event.date}</span>
                   <span className="text-xs font-bold text-nsp-teal bg-nsp-teal/10 px-2 py-1 rounded">Finished</span>
                 </div>
                 <h4 className="font-bold text-xl text-nsp-dark-teal mb-3">{event.title}</h4>
                 <p className="text-sm text-gray-600 mb-6">Winner: <span className="font-semibold text-nsp-orange">{event.winner}</span></p>
                 <button className="text-sm font-bold text-nsp-teal flex items-center gap-1 hover:gap-2 transition-all">
                    View Scores <Icon icon="ph:arrow-right" />
                 </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Tournaments;