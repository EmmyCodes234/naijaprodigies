import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from '../SearchBar';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useNotification } from '../../contexts/NotificationContext';

interface SocialLayoutProps {
    children: React.ReactNode;
}

const SocialLayout: React.FC<SocialLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile: currentUser, loading: userLoading } = useCurrentUser();
    const { unreadCount } = useNotification();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // If loading, show a loading screen or skeleton? 
    // For layout, maybe just render nothing or empty sidebars until user loads.
    // But the children might need to render.

    const NavItems = [
        { icon: 'ph:house-fill', label: 'Home', path: '/feed' },
        { icon: 'ph:hash-bold', label: 'Explore', path: '#' },
        { icon: 'ph:bell-bold', label: 'Notifications', path: '/notifications' },
        { icon: 'ph:envelope-bold', label: 'Messages', path: '/messages' },
        { icon: 'ph:bookmark-simple-bold', label: 'Bookmarks', path: '#' },
        { icon: 'ph:user-bold', label: 'Profile', path: currentUser ? `/profile/${currentUser.id}` : '#' },
    ];

    return (
        <div className="bg-white min-h-screen pt-[72px] md:pt-20 relative">
            <div className="max-w-[1265px] mx-auto flex px-0 lg:px-6">

                {/* Left Sidebar (Desktop Navigation) */}
                <div className="hidden md:flex flex-col w-[80px] xl:w-[275px] sticky top-24 h-[calc(100vh-6rem)] pr-4 xl:pr-8 overflow-y-auto items-end xl:items-start">
                    <nav className="space-y-2 w-full">
                        {NavItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => item.path !== '#' && navigate(item.path)}
                                    className={`flex items-center gap-4 p-3 rounded-full transition-all duration-200 group w-full xl:w-auto ${isActive ? 'font-bold' : 'hover:bg-gray-100'}`}
                                >
                                    <div className="relative">
                                        <Icon
                                            icon={item.icon}
                                            width="28"
                                            height="28"
                                            className={isActive ? 'text-nsp-teal' : 'text-gray-900'}
                                        />
                                        {item.label === 'Notifications' && unreadCount > 0 && (
                                            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-nsp-orange text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`hidden xl:block text-xl ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}

                        <button className="hidden xl:flex items-center justify-center bg-nsp-teal hover:bg-nsp-dark-teal text-white font-bold text-lg py-3 rounded-full shadow-lg transition-colors w-full mt-4">
                            Post
                        </button>
                        <button className="xl:hidden flex items-center justify-center bg-nsp-teal hover:bg-nsp-dark-teal text-white p-3 rounded-full shadow-lg transition-colors mt-4">
                            <Icon icon="ph:feather-bold" width="24" height="24" />
                        </button>
                    </nav>

                    {currentUser && (
                        <div className="mt-auto mb-4 w-full flex items-center gap-3 p-3 rounded-full hover:bg-gray-100 cursor-pointer transition-colors">
                            <img src={currentUser.avatar || '/default-avatar.png'} alt="Me" className="w-10 h-10 rounded-full object-cover" />
                            <div className="hidden xl:block flex-1 overflow-hidden">
                                <div className="flex items-center gap-1">
                                    <p className="font-bold text-sm truncate text-gray-900">{currentUser.name}</p>
                                    {currentUser.verified && <Icon icon="ph:seal-check-fill" className="text-green-500 flex-shrink-0" width="16" height="16" />}
                                </div>
                                <p className="text-gray-500 text-sm truncate">@{currentUser.handle}</p>
                            </div>
                            <Icon icon="ph:dots-three-bold" className="hidden xl:block ml-auto text-gray-900" />
                        </div>
                    )}
                </div>

                {/* Center Column (Children) */}
                <main className="flex-1 max-w-[600px] w-full border-x border-gray-100 min-h-screen">
                    {/* We pass setIsDrawerOpen to children? Or children have their own header? 
             Actually children usually have the header. 
             But the drawer is here. 
             Let's put the mobile trigger control in the layout or allow children to access context?
             Simplest: Pass isDrawerOpen state down? No, standard is Children render Header with a hamburger that triggers Layout's drawer. 
             OR Layout renders the Header? 
             SocialFeed has tabs, PostDetail has "Back" button. Different headers.
             
             Solution: Render the Drawer here, and expose a Context or just rely on the mobile header being inside the Page, which is annoying.
             Better: The drawer is global for Social. The header is per-page.
             We need a way to open the drawer from the page.
             For now, I'll copy the drawer logic into this Layout, and maybe expose a Context later if needed.
             Wait, the drawer trigger is in the `Sticky Header` which is inside `SocialFeed`.
             I will create a context `SocialLayoutContext`.
          */}
                    {/* For simplicity in this iteration, I will assume the pages will handle their own headers. 
             But the Drawer Backdrop/Content is definitely Layout level. 
             I'll export a simple Context to open it.
          */}
                    <SocialLayoutContext.Provider value={{ openDrawer: () => setIsDrawerOpen(true) }}>
                        {children}
                    </SocialLayoutContext.Provider>
                </main>

                {/* Right Sidebar (Widgets) */}
                <div className="hidden lg:block w-[350px] pl-8 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto">
                    {/* Search */}
                    <div className="mb-6">
                        <SearchBar />
                    </div>

                    {/* Trends */}
                    <div className="bg-gray-50 rounded-2xl overflow-hidden mb-6">
                        <div className="p-4">
                            <h3 className="font-black text-xl text-nsp-dark-teal mb-4">Trends for you</h3>
                            <div className="space-y-6">
                                {[
                                    { meta: 'Trending in Nigeria', tag: '#LagosGrandSlam', count: '5,234 posts' },
                                    { meta: 'Strategy · Trending', tag: 'Double-Double', count: '1,432 posts' },
                                    { meta: 'Competition · Live', tag: 'Wellington vs Eta', count: '12.5K posts' },
                                    { meta: 'Trending', tag: 'Dictionary Update', count: '3,100 posts' },
                                ].map((trend, i) => (
                                    <div key={i} className="cursor-pointer hover:bg-gray-100 -mx-4 px-4 py-2 transition-colors relative">
                                        <div className="flex justify-between items-start text-xs text-gray-500 mb-1">
                                            <span>{trend.meta}</span>
                                            <Icon icon="ph:dots-three-bold" className="hover:text-nsp-teal rounded-full p-1 -m-1" width="24" height="24" />
                                        </div>
                                        <div className="font-bold text-gray-900 mb-0.5">{trend.tag}</div>
                                        <div className="text-xs text-gray-500">{trend.count}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-nsp-teal text-sm font-medium cursor-pointer hover:underline">
                                Show more
                            </div>
                        </div>
                    </div>

                    {/* Who to follow */}
                    <div className="bg-gray-50 rounded-2xl overflow-hidden">
                        <div className="p-4">
                            <h3 className="font-black text-xl text-nsp-dark-teal mb-4">Who to follow</h3>
                            <div className="space-y-4">
                                {[
                                    { name: "Scrabble Nigeria", handle: "@ScrabbleNG" },
                                    { name: "Collins Dict", handle: "@CollinsCorp" },
                                ].map((user, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-bold text-sm text-gray-900 hover:underline cursor-pointer">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.handle}</div>
                                        </div>
                                        <button className="bg-black hover:bg-gray-800 text-white text-sm font-bold py-1.5 px-4 rounded-full transition-colors">
                                            Follow
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-nsp-teal text-sm font-medium cursor-pointer hover:underline">
                                Show more
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 px-4">
                        <a href="#" className="hover:underline">Terms of Service</a>
                        <a href="#" className="hover:underline">Privacy Policy</a>
                        <a href="#" className="hover:underline">Cookie Policy</a>
                        <span>© 2024 NSP</span>
                    </div>
                </div>

            </div>

            {/* Mobile Floating Action Button */}
            <button className="md:hidden fixed bottom-20 right-4 z-40 bg-nsp-teal text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform">
                <Icon icon="ph:plus-bold" width="24" height="24" />
            </button>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16 z-50 px-2 pb-safe">
                {NavItems.filter(item => item.label !== 'Bookmarks' && item.label !== 'Profile').map((item) => { // Filter out less critical items for mobile bar
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => item.path !== '#' && navigate(item.path)}
                            className="p-3 relative"
                        >
                            <div className="relative">
                                <Icon
                                    icon={isActive ? item.icon : item.icon} // Could use outline versions here if available
                                    width="28"
                                    height="28"
                                    className={isActive ? 'text-nsp-teal' : 'text-gray-500'}
                                />
                                {item.label === 'Notifications' && unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-nsp-orange text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
                {/* Mobile Profile Icon */}
                {currentUser && (
                    <button onClick={() => navigate(`/profile/${currentUser.id}`)} className="p-3">
                        <img
                            src={currentUser.avatar || '/default-avatar.png'}
                            alt="Me"
                            className={`w-7 h-7 rounded-full object-cover ${location.pathname === `/profile/${currentUser.id}` ? 'border-2 border-nsp-teal' : ''}`}
                        />
                    </button>
                )}
            </div>

            {/* MOBILE SIDEBAR DRAWER (Twitter Style) */}
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 z-[90] md:hidden transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsDrawerOpen(false)}
            ></div>

            {/* Drawer Content */}
            <div
                className={`fixed inset-y-0 left-0 w-[280px] bg-white z-[100] md:hidden transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) shadow-2xl overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {currentUser && (
                        <div className="p-5">
                            {/* Header Info */}
                            <div className="mb-6">
                                <div className="flex justify-between items-start mb-3">
                                    <img src={currentUser.avatar || '/default-avatar.png'} alt="Me" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight mb-0.5">{currentUser.name}</h3>
                                    {currentUser.verified && <Icon icon="ph:seal-check-fill" className="text-green-500" width="16" height="16" />}
                                </div>
                                <p className="text-gray-500 text-sm mb-5">@{currentUser.handle}</p>

                                <div className="flex gap-4 text-sm">
                                    <div className="hover:underline cursor-pointer group">
                                        <span className="font-bold text-gray-900 group-hover:underline">204</span> <span className="text-gray-500">Following</span>
                                    </div>
                                    <div className="hover:underline cursor-pointer group">
                                        <span className="font-bold text-gray-900 group-hover:underline">54</span> <span className="text-gray-500">Followers</span>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Links */}
                            <nav className="space-y-1">
                                {[
                                    { icon: 'ph:user-bold', label: 'Profile' },
                                    { icon: 'ph:star-four-fill', label: 'NSP Premium', color: 'text-nsp-yellow' },
                                    { icon: 'ph:chat-teardrop-text-bold', label: 'Topics' },
                                    { icon: 'ph:bookmark-simple-bold', label: 'Bookmarks' },
                                    { icon: 'ph:list-dashes-bold', label: 'Lists' },
                                    { icon: 'ph:microphone-stage-bold', label: 'Spaces' },
                                ].map((link) => (
                                    <a
                                        key={link.label}
                                        href="#"
                                        className="flex items-center gap-4 py-3 px-4 -mx-4 hover:bg-gray-100 transition-colors"
                                    >
                                        <Icon icon={link.icon} width="24" height="24" className={link.color || 'text-gray-900'} />
                                        <span className="font-bold text-xl text-gray-900">{link.label}</span>
                                    </a>
                                ))}
                            </nav>

                            <div className="h-px bg-gray-200 my-4 -mx-5"></div>

                            {/* Bottom Links */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center cursor-pointer group">
                                    <span className="font-medium text-gray-900 text-sm group-hover:underline">Settings & Support</span>
                                    <Icon icon="ph:caret-down-bold" className="text-gray-500" width="16" height="16" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto p-4 border-t border-gray-100 flex justify-between items-center">
                        <Icon icon="ph:moon-bold" className="text-nsp-dark-teal cursor-pointer" width="24" height="24" />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SocialLayout;

export const SocialLayoutContext = React.createContext<{ openDrawer: () => void }>({ openDrawer: () => { } });
export const useSocialLayout = () => React.useContext(SocialLayoutContext);
