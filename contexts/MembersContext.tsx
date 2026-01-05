import React, { createContext, useContext, useMemo } from 'react';
import membersDataRaw from '../src/data/members.json';
import { MemberData } from '../components/MemberProfileModal';

interface MembersContextType {
    members: MemberData[];
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Cache the processed members data using useMemo
    const members = useMemo(() => {
        const safeMembersData = Array.isArray(membersDataRaw) ? membersDataRaw : [];

        return safeMembersData
            .filter(m => m != null) // Filter out null/undefined entries
            .map(m => ({
                name: `${m.firstName || ''} ${m.surname || ''}`.trim() || 'Unknown Member',
                rank: m.category || "Member",
                title: m.state || "NSP Member",
                img: m.image || undefined,
                state: m.state,
                category: m.category,
                rating: 'Unrated',
            }));
    }, []); // Empty deps - only compute once

    return (
        <MembersContext.Provider value={{ members }}>
            {children}
        </MembersContext.Provider>
    );
};

export const useMembers = () => {
    const context = useContext(MembersContext);
    if (!context) {
        throw new Error('useMembers must be used within a MembersProvider');
    }
    return context;
};
