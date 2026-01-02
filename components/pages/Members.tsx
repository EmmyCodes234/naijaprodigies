import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import MemberProfileModal, { MemberData } from '../MemberProfileModal';

import membersDataRaw from "../../src/data/members.json";

const Members: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const members: MemberData[] = membersDataRaw.map(m => ({
    name: `${m.firstName} ${m.surname}`,
    rank: m.category || "Member",
    title: m.state || "NSP Member",
    img: m.image || undefined, // undefined triggers default in Modal
    state: m.state,
    category: m.category,
    // Add default mock stats if we want to show something, or leave undefined to hide
    // For now, we leave them undefined so they hide in modal.
  }));

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.state && m.state.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 rounded-full py-3 px-6 pl-12 text-nsp-dark-teal focus:outline-none focus:border-nsp-orange transition-colors shadow-sm"
          />
          <Icon icon="ph:magnifying-glass-bold" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" />
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredMembers.map((member, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-center group border border-gray-100 flex flex-col h-full">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-nsp-teal group-hover:border-nsp-orange transition-colors relative shadow-md">
                <img
                  src={member.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D9488&color=fff`}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D9488&color=fff`;
                  }}
                />
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