import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import MemberProfileModal, { MemberData } from '../MemberProfileModal';

const Members: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);

  const members: MemberData[] = [
    { 
        name: "David Ojih", 
        rank: "Master", 
        rating: "1905", 
        title: "African Youth Champion", 
        img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTwaCSwJqaGpygVQTQeJU1szqIiDWBYVwxyQ&s",
        bio: "He became the first African Youth Scrabble Champion in Lagos, 2023. David is a rising star known for his precise board management.",
        stats: { wins: 180, avgScore: 445, highGame: 706 },
        favoriteWord: "MATACHINI",
        wordDefinition: "Dancers in a 16th-century dance performed by extravagantly dressed, masked individuals carrying swords."
    },
    { 
        name: "Eta Karo", 
        rank: "Master", 
        rating: "2050", 
        title: "National Champion", 
        img: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&q=80&w=400",
        bio: "A fierce competitor on the national circuit, Eta combines defensive mastery with explosive scoring power. He has won the National Jubilee 3 times in a row.",
        stats: { wins: 312, avgScore: 442, highGame: 590 },
        favoriteWord: "JIGAJIG"
    },
    { 
        name: "Olatunde Oduwole", 
        rank: "Grandmaster", 
        rating: "2080", 
        title: "African King", 
        img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
        bio: "Known as the 'African King', Olatunde has dominated the continental scene for over a decade. His strategic board management is studied by students at the academy.",
        stats: { wins: 380, avgScore: 460, highGame: 615 },
        favoriteWord: "ZAMOUSE"
    },
    { 
        name: "Tuoyo Mayuku", 
        rank: "Master", 
        rating: "1980", 
        title: "Queen of Tiles", 
        img: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&q=80&w=400",
        bio: "Tuoyo is breaking barriers and setting records. She is currently the highest-rated female player in Nigeria and known for her creative hook placements.",
        stats: { wins: 210, avgScore: 415, highGame: 550 },
        favoriteWord: "QUATRE"
    },
    { 
        name: "Enoch Nwali", 
        rank: "Master", 
        rating: "2020", 
        title: "Rising Star", 
        img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
        bio: "The youngest player to reach the Master rank in NSP history. Enoch represents the bright future of Nigerian Scrabble.",
        stats: { wins: 150, avgScore: 430, highGame: 580 },
        favoriteWord: "VEXILLUM"
    },
    { 
        name: "Jite Umebiye", 
        rank: "Expert", 
        rating: "1950", 
        title: "Strategist", 
        img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
        bio: "Jite treats every game like a chess match. He prefers closed boards and technical endgames where his mathematical precision shines.",
        stats: { wins: 180, avgScore: 405, highGame: 520 },
        favoriteWord: "EUOUAE"
    },
    { 
        name: "Blessing Ooro", 
        rank: "Expert", 
        rating: "1920", 
        title: "Word Weaver", 
        img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
        bio: "A mentor to many, Blessing specializes in vocabulary retention training. She runs the weekend clinics for the junior team.",
        stats: { wins: 140, avgScore: 395, highGame: 490 },
        favoriteWord: "SYZYGY"
    },
    { 
        name: "Dennis Ikekeregor", 
        rank: "Master", 
        rating: "2000", 
        title: "Veteran", 
        img: "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=400",
        bio: "With 20 years of experience, Dennis has seen it all. His experience makes him a formidable opponent in tournament finals.",
        stats: { wins: 330, avgScore: 425, highGame: 560 },
        favoriteWord: "JACUZZI"
    },
  ];

  return (
    <div className="bg-[#f2f0e9] min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16">
          <h1 className="font-marker text-6xl text-nsp-teal mb-4">Hall of Fame</h1>
          <p className="text-xl text-gray-600">Meet the grandmasters and prodigies redefining the game.</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-12 relative">
           <input 
              type="text" 
              placeholder="Find a player..." 
              className="w-full bg-white border-2 border-gray-200 rounded-full py-3 px-6 pl-12 text-nsp-dark-teal focus:outline-none focus:border-nsp-orange transition-colors shadow-sm"
           />
           <Icon icon="ph:magnifying-glass-bold" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" />
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
           {members.map((member, i) => (
             <div key={i} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-center group border border-gray-100 flex flex-col h-full">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-nsp-teal group-hover:border-nsp-orange transition-colors relative shadow-md">
                   <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
                   {member.rank === "Grandmaster" && (
                      <div className="absolute bottom-0 inset-x-0 bg-nsp-yellow text-[10px] font-black uppercase py-1 tracking-wider">GM</div>
                   )}
                </div>
                <h3 className="font-bold text-lg text-nsp-dark-teal mb-1">{member.name}</h3>
                <p className="text-nsp-orange text-sm font-bold uppercase tracking-wide mb-3">{member.title}</p>
                
                <div className="flex justify-center gap-4 text-sm text-gray-500 bg-gray-50 py-2 rounded-lg mb-4">
                   <div className="flex flex-col">
                      <span className="font-bold text-nsp-teal">{member.rating}</span>
                      <span className="text-[10px] uppercase">Rating</span>
                   </div>
                   <div className="w-px bg-gray-200"></div>
                   <div className="flex flex-col">
                      <span className="font-bold text-nsp-teal">{member.rank}</span>
                      <span className="text-[10px] uppercase">Rank</span>
                   </div>
                </div>

                <div className="mt-auto">
                    <button 
                        onClick={() => setSelectedMember(member)}
                        className="w-full py-2 rounded-lg border-2 border-gray-100 text-gray-500 text-sm font-bold hover:bg-nsp-teal hover:text-white hover:border-nsp-teal transition-all flex items-center justify-center gap-2 group-hover:bg-nsp-teal group-hover:text-white group-hover:border-nsp-teal"
                    >
                        View Profile
                        <Icon icon="ph:arrow-right-bold" className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </button>
                </div>
             </div>
           ))}
        </div>
        
        {/* Profile Modal */}
        <MemberProfileModal 
            isOpen={!!selectedMember}
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
        />

      </div>
    </div>
  );
};

export default Members;