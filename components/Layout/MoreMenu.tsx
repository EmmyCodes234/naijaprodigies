import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface MoreMenuProps {
    isOpen: boolean;
    onClose: () => void;
    menuRef: React.RefObject<HTMLDivElement>;
}

const MoreMenu: React.FC<MoreMenuProps> = ({ isOpen, onClose, menuRef }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const menuItems = [
        { label: 'Settings and privacy', icon: 'ph:gear', path: '/settings' },
        { label: 'Tournaments', icon: 'ph:trophy', path: '/tournaments' },
        { label: 'Members', icon: 'ph:users', path: '/members' },
        { label: 'Blog', icon: 'ph:article', path: '/blog' },
    ];

    const legalItems = [
        { label: 'Terms of Service', path: '/terms' },
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Cookie Policy', path: '/cookie-policy' },
    ];

    const handleItemClick = (path: string) => {
        navigate(path);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="absolute bottom-full left-0 mb-2 w-[280px] bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
        >
            <div className="py-2">
                {menuItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => handleItemClick(item.path)}
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                    >
                        <Icon icon={item.icon} width="22" height="22" className="text-gray-900" />
                        <span className="font-bold text-[17px] text-gray-900">{item.label}</span>
                    </button>
                ))}

                <div className="h-px bg-gray-100 my-1 mx-4"></div>

                <div className="px-4 py-2">
                    <p className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">Resources</p>
                    {legalItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => handleItemClick(item.path)}
                            className="w-full text-left px-2 py-1.5 text-[15px] text-gray-600 hover:text-nsp-teal hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MoreMenu;
