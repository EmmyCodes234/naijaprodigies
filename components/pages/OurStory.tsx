import React from 'react';
import { Icon } from '@iconify/react';

const OurStory: React.FC = () => {
  return (
    <div className="bg-[#f2f0e9] min-h-screen pt-24 pb-16 lg:pb-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-24">
          <h1 className="font-marker text-6xl text-nsp-teal mb-4">Our Journey</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-sans leading-relaxed">
            From a small club in Lagos to dominating the world stage, this is the story of the Nigeria Scrabble Prodigies.
          </p>
        </div>

        {/* Timeline Content */}
        <div className="relative">
          {/* Central Line (Desktop) */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-nsp-teal/20 transform -translate-x-1/2 rounded-full"></div>

          {/* Timeline Items */}
          <div className="space-y-12 lg:space-y-24 relative">
            
            {/* Item 1 */}
            <div className="flex flex-col md:flex-row items-center justify-between w-full group">
              <div className="w-full md:w-5/12 order-2 md:order-1 bg-white p-8 lg:p-10 rounded-2xl shadow-xl border-t-4 border-nsp-orange transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="text-nsp-orange font-black text-4xl mb-2 font-luckiest">2010</div>
                <h3 className="text-2xl font-bold text-nsp-dark-teal mb-3">The First Tile</h3>
                <p className="text-gray-600 leading-relaxed">
                  A group of passionate players gathered in a community hall in Surulere. With just five boards and a dictionary, the seed for NSP was planted.
                </p>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-nsp-teal rounded-full border-4 border-[#f2f0e9] z-10 hidden md:flex shadow-md group-hover:scale-110 transition-transform">
                <Icon icon="ph:star-fill" className="text-white w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <div className="w-full md:w-5/12 order-1 md:order-2 mb-6 md:mb-0">
                 <img src="https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&q=80&w=800" alt="Early days" className="rounded-2xl shadow-lg w-full h-64 lg:h-80 object-cover transform rotate-2 group-hover:rotate-0 transition-transform duration-500"/>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex flex-col md:flex-row items-center justify-between w-full group">
              <div className="w-full md:w-5/12 order-1 mb-6 md:mb-0">
                 <img src="https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&q=80&w=800" alt="Championship" className="rounded-2xl shadow-lg w-full h-64 lg:h-80 object-cover transform -rotate-2 group-hover:rotate-0 transition-transform duration-500"/>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-nsp-red rounded-full border-4 border-[#f2f0e9] z-10 hidden md:flex shadow-md group-hover:scale-110 transition-transform">
                <Icon icon="ph:trophy-fill" className="text-white w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <div className="w-full md:w-5/12 order-2 bg-white p-8 lg:p-10 rounded-2xl shadow-xl border-t-4 border-nsp-red transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="text-nsp-red font-black text-4xl mb-2 font-luckiest">2015</div>
                <h3 className="text-2xl font-bold text-nsp-dark-teal mb-3">World Domination</h3>
                <p className="text-gray-600 leading-relaxed">
                  History was made as Nigeria became the first African nation to produce a World Scrabble Champion. The world took notice.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex flex-col md:flex-row items-center justify-between w-full group">
               <div className="w-full md:w-5/12 order-2 md:order-1 bg-white p-8 lg:p-10 rounded-2xl shadow-xl border-t-4 border-nsp-yellow transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="text-nsp-yellow font-black text-4xl mb-2 font-luckiest">2020</div>
                <h3 className="text-2xl font-bold text-nsp-dark-teal mb-3">The Academy</h3>
                <p className="text-gray-600 leading-relaxed">
                  Focus shifted to the next generation. The NSP Academy was launched to train young minds in schools across the country.
                </p>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-nsp-yellow rounded-full border-4 border-[#f2f0e9] z-10 hidden md:flex shadow-md group-hover:scale-110 transition-transform">
                <Icon icon="ph:graduation-cap-fill" className="text-nsp-dark-teal w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <div className="w-full md:w-5/12 order-1 md:order-2 mb-6 md:mb-0">
                 <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800" alt="Teaching kids" className="rounded-2xl shadow-lg w-full h-64 lg:h-80 object-cover transform rotate-2 group-hover:rotate-0 transition-transform duration-500"/>
              </div>
            </div>
            
             {/* Item 4 */}
            <div className="flex flex-col md:flex-row items-center justify-between w-full group">
              <div className="w-full md:w-5/12 order-1 mb-6 md:mb-0">
                 <img src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800" alt="Future" className="rounded-2xl shadow-lg w-full h-64 lg:h-80 object-cover transform -rotate-2 group-hover:rotate-0 transition-transform duration-500"/>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-nsp-dark-teal rounded-full border-4 border-[#f2f0e9] z-10 hidden md:flex shadow-md group-hover:scale-110 transition-transform">
                <Icon icon="ph:rocket-launch-fill" className="text-white w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <div className="w-full md:w-5/12 order-2 bg-white p-8 lg:p-10 rounded-2xl shadow-xl border-t-4 border-nsp-dark-teal transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="text-nsp-dark-teal font-black text-4xl mb-2 font-luckiest">Today</div>
                <h3 className="text-2xl font-bold text-nsp-dark-teal mb-3">Global Icons</h3>
                <p className="text-gray-600 leading-relaxed">
                  Today, NSP is more than a club; it's a movement. We are redefining intellectual sports in Africa and beyond.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OurStory;