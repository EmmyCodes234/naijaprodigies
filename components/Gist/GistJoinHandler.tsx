import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGist } from '../../contexts/GistContext';

const GistJoinHandler: React.FC = () => {
    const { gistId } = useParams();
    const { joinGist } = useGist();
    const navigate = useNavigate();

    useEffect(() => {
        if (gistId) {
            joinGist(gistId);
            // Redirect to feed after triggering join
            navigate('/feed', { replace: true });
        }
    }, [gistId, joinGist, navigate]);

    return (
        <div className="fixed inset-0 bg-[#052120] flex items-center justify-center z-[100]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#f08920] border-t-transparent rounded-full animate-spin"></div>
                <p className="font-luckiest text-xl text-white tracking-widest uppercase">Joining Gist...</p>
            </div>
        </div>
    );
};

export default GistJoinHandler;
