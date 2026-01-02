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
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-[600px] rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <Icon icon="ph:x" width="20" height="20" />
                </button>

                <div className="mt-6">
                    <CreatePost
                        currentUser={currentUser}
                        onPost={() => {
                            // Optional: Refresh feed? 
                            // For now just close the modal. 
                            // Ideally we'd trigger a global feed refresh or just let the user see their new post eventually.
                            onClose();
                            // We might want to show a toast here too, but CreatePost handles errors. 
                            // Success handling is usually inside CreatePost or passed here.
                            // CreatePost calls onPost(newPost), so we can use that to close.
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;
