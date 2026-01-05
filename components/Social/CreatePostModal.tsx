import React from 'react';
import { Icon } from '@iconify/react';
import CreatePost from './CreatePost';
import { User } from '../../types';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, currentUser }) => {
    if (!isOpen || !currentUser) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center sm:pt-20 px-0 sm:px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content - Full screen on mobile, Modal on Desktop */}
            <div className="relative bg-white w-full h-full sm:h-auto sm:max-w-[600px] sm:rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 overflow-hidden flex flex-col">

                {/* Mobile Header (Hidden on Desktop usually, but X keeps it consistent inside) */}
                <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <button
                        onClick={onClose}
                        className="text-base font-medium text-gray-900"
                    >
                        Cancel
                    </button>
                    {/* Post button is inside the CreatePost component */}
                </div>

                {/* Close Button (Desktop Only) */}
                <button
                    onClick={onClose}
                    className="hidden sm:block absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <Icon icon="ph:x" width="20" height="20" />
                </button>

                <div className="flex-1 overflow-y-auto">
                    <CreatePost
                        currentUser={currentUser}
                        onPost={() => onClose()}
                        variant="modal"
                        onClose={onClose}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;
