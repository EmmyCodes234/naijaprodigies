import React from 'react';
import { Icon } from '@iconify/react';
import ImageViewer from './Shared/ImageViewer';

export interface MemberData {
  name: string;
  rank: string;
  rating?: string;
  title?: string;
  img?: string;
  bio?: string;
  stats?: {
    wins: number;
    avgScore: number;
    highGame: number;
  };
  favoriteWord?: string;
  wordDefinition?: string;
  state?: string; // Add state
  category?: string; // Add category
}

interface MemberProfileModalProps {
  member: MemberData | null;
  isOpen: boolean;
  onClose: () => void;
}

const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ member, isOpen, onClose }) => {
  const [showFullImage, setShowFullImage] = React.useState(false);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nsp-dark-teal/90 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-nsp-teal to-nsp-dark-teal relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-md z-10"
          >
            <Icon icon="ph:x-bold" width="24" height="24" />
          </button>
        </div>

        <div className="px-8 pb-8">
          {/* Avatar & Main Info */}
          <div className="flex flex-col md:flex-row gap-6 items-start -mt-12 mb-8">
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                <img
                  src={member.img || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D9488&color=fff`}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform hover:scale-110 cursor-zoom-in"
                  referrerPolicy="no-referrer"
                  onClick={() => setShowFullImage(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D9488&color=fff`;
                  }}
                /></div>
              {member.rank === "Grandmaster" && (
                <div className="absolute bottom-2 right-2 bg-nsp-yellow text-nsp-dark-teal text-xs font-black uppercase py-1 px-3 rounded-full shadow-md border-2 border-white flex items-center gap-1">
                  <Icon icon="ph:crown-fill" /> GM
                </div>
              )}
            </div>

            <div className="flex-1 pt-14 md:pt-16">
              <h2 className="text-3xl md:text-4xl font-luckiest text-nsp-dark-teal mb-1">{member.name}</h2>
              <p className="text-nsp-orange font-bold text-lg uppercase tracking-wide flex items-center gap-2">
                {member.title || member.state}
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="text-gray-500 text-sm font-semibold">{member.rank}</span>
              </p>
            </div>

            {member.rating && (
              <div className="hidden md:block pt-16 text-right">
                <div className="text-4xl font-black text-nsp-teal">{member.rating}</div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Current Rating</div>
              </div>
            )}
          </div>

          {/* Stats Grid - Only show if stats exist */}
          {member.stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                <div className="text-nsp-teal mb-1"><Icon icon="ph:trophy-fill" width="24" height="24" className="mx-auto" /></div>
                <div className="font-black text-xl text-gray-800">{member.stats.wins}</div>
                <div className="text-xs text-gray-500 font-bold uppercase">Career Wins</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                <div className="text-nsp-red mb-1"><Icon icon="ph:chart-bar-fill" width="24" height="24" className="mx-auto" /></div>
                <div className="font-black text-xl text-gray-800">{member.stats.avgScore}</div>
                <div className="text-xs text-gray-500 font-bold uppercase">Avg Score</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                <div className="text-nsp-yellow mb-1"><Icon icon="ph:lightning-fill" width="24" height="24" className="mx-auto" /></div>
                <div className="font-black text-xl text-gray-800">{member.stats.highGame}</div>
                <div className="text-xs text-gray-500 font-bold uppercase">High Game</div>
              </div>
            </div>
          )}

          {/* Bio & Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Player Bio</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                {member.bio || "No biography available for this player yet."}
              </p>
            </div>

            {member.favoriteWord && (
              <div className="bg-nsp-teal/5 border border-nsp-teal/10 rounded-xl p-5 flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg text-nsp-teal shadow-sm">
                  <Icon icon="ph:quotes-fill" width="24" height="24" />
                </div>
                <div>
                  <h4 className="font-bold text-nsp-dark-teal text-sm uppercase mb-1">Favorite Word</h4>
                  <p className="text-2xl font-marker text-nsp-orange">{member.favoriteWord}</p>
                  <p className="text-xs text-gray-500 mt-1">Definition: {member.wordDefinition || "A word that wins games."}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="mt-8 pt-8 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
            <button className="px-6 py-3 rounded-xl font-bold bg-nsp-teal text-white hover:bg-nsp-dark-teal transition-colors shadow-lg shadow-nsp-teal/20 flex items-center gap-2">
              <Icon icon="ph:envelope-simple-bold" />
              Challenge Player
            </button>
          </div>
        </div>
      </div>

      {showFullImage && member.img && (
        <ImageViewer
          src={member.img}
          alt={member.name}
          onClose={() => setShowFullImage(false)}
        />
      )}
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default MemberProfileModal;