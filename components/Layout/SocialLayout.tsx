import React, { useState, useEffect } from 'react';
import { getTrends } from '../../services/postService';
import { getWhoToFollow, followUser } from '../../services/userService';
import { getUnreadMessageCount, subscribeToConversations } from '../../services/messageService';
import { supabase } from '../../services/supabaseClient';
import { Icon } from '@iconify/react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from '../SearchBar';
import CreatePostModal from '../Social/CreatePostModal';
import GistDiscovery from '../Gist/GistDiscovery';
import VerifiedBadge from '../Shared/VerifiedBadge';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useNotification } from '../../contexts/NotificationContext';
import { getAvatarUrl } from '../../utils/userUtils';
import Avatar from '../Shared/Avatar';
import MoreMenu from './MoreMenu';
import CreateGistModal from '../Gist/CreateGistModal';

interface SocialLayoutProps {
    children: React.ReactNode;
    showWidgets?: boolean;
    fullWidth?: boolean;
    hideBottomNav?: boolean;
}

const SocialLayout: React.FC<SocialLayoutProps> = ({ children, showWidgets = true, fullWidth = false, hideBottomNav: propHideBottomNav }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile: currentUser, loading: userLoading } = useCurrentUser();
    const { unreadCount } = useNotification();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isCreateGistOpen, setIsCreateGistOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const moreMenuRef = React.useRef<HTMLDivElement>(null);
    const moreButtonRef = React.useRef<HTMLButtonElement>(null);
    const [trends, setTrends] = useState<{ tag: string; count: number }[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

    // Navigation Indicators
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [hasNewPosts, setHasNewPosts] = useState(false);

    // Scroll Awareness State
    const [visible, setVisible] = useState(true);
    const [prevScrollPos, setPrevScrollPos] = useState(0);

    // Route-Based Visibility Logic
    const isMessagesPage = location.pathname.startsWith('/messages');
    const isMessageThread = location.pathname.startsWith('/messages/') && location.pathname.split('/').filter(Boolean).length > 1;
    const isGistRoom = location.pathname.startsWith('/gist/room');
    const isPostDetail = location.pathname.startsWith('/post/');

    // - Hide Bottom Nav on: Gist Room, Individual Message Thread, or Prop Override
    const hideBottomNav = isGistRoom || isMessageThread || !!propHideBottomNav;

    // - Hide FAB on: Messages (all), Post Detail, Gist (all)
    const hideFab = isMessagesPage || isPostDetail || location.pathname.startsWith('/gist') || isMessageThread;

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollPos = window.scrollY;
            const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 10;

            setVisible(isVisible);
            setPrevScrollPos(currentScrollPos);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [prevScrollPos]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                moreMenuRef.current &&
                !moreMenuRef.current.contains(event.target as Node) &&
                moreButtonRef.current &&
                !moreButtonRef.current.contains(event.target as Node)
            ) {
                setIsMoreMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const data = await getTrends(5);
                setTrends(data);
            } catch (error) {
                console.error('Failed to fetch trends', error);
            }
        };
        fetchTrends();
    }, []);

    useEffect(() => {
        const fetchSuggestedUsers = async () => {
            try {
                const data = await getWhoToFollow(currentUser?.id);
                setSuggestedUsers(data);
            } catch (error) {
                console.error('Failed to fetch who to follow', error);
            }
        };
        fetchSuggestedUsers();
    }, [currentUser]);

    // Fetch Unread Messages Count & Subscribe
    useEffect(() => {
        if (!currentUser) return;

        const fetchUnread = async () => {
            try {
                const count = await getUnreadMessageCount(currentUser.id);
                setUnreadMessages(count);
            } catch (error) {
                console.error('Failed to get unread messages', error);
            }
        };

        fetchUnread();

        // Subscribe to conversation updates (new messages update last_updated)
        // Note: subscribeToConversations listens to 'messages' INSERTs essentially
        const unsubscribe = subscribeToConversations(currentUser.id, () => {
            fetchUnread();
        });

        // 2. Subscribe to NEW POSTS for 'Home' indicator
        const postsChannel = supabase
            .channel('public:posts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'posts',
                    filter: `user_id=neq.${currentUser.id}` // Don't notify for own posts
                },
                () => {
                    // Only show dot if NOT on home feed
                    if (location.pathname !== '/feed') {
                        setHasNewPosts(true);
                    }
                }
            )
            .subscribe();

        return () => {
            unsubscribe();
            supabase.removeChannel(postsChannel);
        };
    }, [currentUser, location.pathname]);

    // Clear "New Posts" dot when visiting feed
    useEffect(() => {
        if (location.pathname === '/feed') {
            setHasNewPosts(false);
        }
    }, [location.pathname]);

    // Recalculate unread messages when marking as read (can be triggered by route change to messages)
    useEffect(() => {
        if (location.pathname.startsWith('/messages')) {
            // Ideally we'd only refresh when a specific conversation is opened, 
            // but refreshing count on message route visit is a safe fallback
            if (currentUser) getUnreadMessageCount(currentUser.id).then(setUnreadMessages);
        }
    }, [location.pathname, currentUser]);

    const onFollowUser = async (userId: string) => {
        if (!currentUser) {
            alert('Please login to follow users');
            return;
        }
        try {
            await followUser(currentUser.id, userId);
            setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Failed to follow user', error);
            alert('Failed to follow user');
        }
    };

    const NavItems = [
        { icon: 'ph:house', activeIcon: 'ph:house-fill', label: 'Home', path: '/feed' },
        { icon: 'ph:magnifying-glass', activeIcon: 'ph:magnifying-glass-bold', label: 'Explore', path: '/explore' },
        { icon: 'ph:bell', activeIcon: 'ph:bell-fill', label: 'Notifications', path: '/notifications' },
        { icon: 'ph:envelope', activeIcon: 'ph:envelope-fill', label: 'Messages', path: '/messages' },
        { icon: 'ph:microphone-stage', activeIcon: 'ph:microphone-stage-fill', label: 'Gist', path: '#' },
        { icon: 'ph:bookmark-simple', activeIcon: 'ph:bookmark-simple-fill', label: 'Bookmarks', path: '/bookmarks' },
        { icon: 'ph:user', activeIcon: 'ph:user-fill', label: 'Profile', path: currentUser ? `/profile/${currentUser.id}` : '#' },
        { icon: 'ph:dots-three-circle', activeIcon: 'ph:dots-three-circle-fill', label: 'More', path: '#' },
    ];

    return (
        <div className="bg-white min-h-screen md:pt-0 relative flex justify-center">
            {/* Left Sidebar (Desktop Navigation) */}
            <div className="hidden md:flex flex-col w-[88px] xl:w-[275px] sticky top-0 h-screen border-r border-gray-100 pt-2 px-2 xl:px-4 z-40 bg-white group/nav overflow-y-hidden hover:overflow-y-auto">
                <div className="flex-1 flex flex-col items-center xl:items-start">
                    <nav className="space-y-1 w-full mt-2">
                        {NavItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const isMore = item.label === 'More';
                            const isMessages = item.label === 'Messages';
                            const isHome = item.label === 'Home';

                            return (
                                <div key={item.label} className="relative group w-auto xl:w-full">
                                    {isMore && <MoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} menuRef={moreMenuRef} />}
                                    <button
                                        ref={isMore ? moreButtonRef : null}
                                        onClick={() => {
                                            if (isMore) {
                                                setIsMoreMenuOpen(!isMoreMenuOpen);
                                            } else if (item.label === 'Gist') {
                                                setIsCreateGistOpen(true);
                                            } else if (item.path !== '#') {
                                                navigate(item.path);
                                            }
                                        }}
                                        className="flex items-center justify-center xl:justify-start gap-4 p-3 rounded-full transition-all duration-200 w-full hover:bg-gray-200/50"
                                    >
                                        <div className="relative p-0.5">
                                            <Icon
                                                icon={isActive ? item.activeIcon : item.icon}
                                                width="28"
                                                height="28"
                                                className={isActive ? 'text-gray-900' : 'text-gray-900'}
                                            />
                                            {item.label === 'Notifications' && unreadCount > 0 && (
                                                <div className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] bg-nsp-teal text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border border-white">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </div>
                                            )}
                                            {isMessages && unreadMessages > 0 && (
                                                <div className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] bg-nsp-teal text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border border-white">
                                                    {unreadMessages > 99 ? '99+' : unreadMessages}
                                                </div>
                                            )}
                                            {isHome && hasNewPosts && (
                                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-nsp-teal rounded-full border-2 border-white"></div>
                                            )}
                                        </div>
                                        <span className={`hidden xl:block text-[20px] ${isActive ? 'font-bold' : 'font-normal'} text-gray-900 mr-4`}>
                                            {item.label}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}

                        <button
                            onClick={() => setIsPostModalOpen(true)}
                            className="hidden xl:block bg-nsp-teal hover:bg-nsp-dark-teal text-white font-bold text-[17px] py-3.5 rounded-full shadow-md hover:shadow-lg transition-all w-[90%] mt-6"
                        >
                            Post
                        </button>
                        <button
                            onClick={() => setIsPostModalOpen(true)}
                            className="xl:hidden flex items-center justify-center bg-nsp-teal hover:bg-nsp-dark-teal text-white w-[50px] h-[50px] rounded-full shadow-md hover:shadow-lg transition-all mt-6"
                        >
                            <Icon icon="ph:feather-bold" width="24" height="24" />
                        </button>
                    </nav>

                    {currentUser && (
                        <div className="mt-auto mb-6 w-full flex items-center gap-3 p-3 rounded-full hover:bg-gray-200/50 cursor-pointer transition-colors xl:w-full justify-center xl:justify-start">
                            <Avatar user={currentUser} alt="Me" className="w-10 h-10 rounded-full object-cover" />
                            <div className="hidden xl:block flex-1 overflow-hidden">
                                <div className="flex items-center gap-1">
                                    <p className="font-bold text-[15px] truncate text-gray-900">{currentUser.name}</p>
                                    <VerifiedBadge user={currentUser} size={16} />
                                </div>
                                <p className="text-gray-500 text-[15px] truncate">@{currentUser.handle}</p>
                            </div>
                            <Icon icon="ph:dots-three-bold" className="hidden xl:block ml-auto text-gray-900" width="20" height="20" />
                        </div>
                    )}
                </div>
            </div>

            {/* Center Column (Children) */}
            <main className={`flex-1 w-full border-r border-gray-100 min-h-screen ${!hideBottomNav ? 'pb-[64px] pb-safe' : ''} md:pb-0 ${fullWidth ? 'max-w-none' : 'w-full md:max-w-[600px]'}`}>
                <SocialLayoutContext.Provider value={{ openDrawer: () => setIsDrawerOpen(true) }}>
                    {children}
                </SocialLayoutContext.Provider>
            </main>

            {/* Right Sidebar (Widgets) */}
            {showWidgets && (
                <div className="hidden lg:block w-[350px] pl-8 py-4 sticky top-0 h-screen group/widgets overflow-y-hidden hover:overflow-y-auto">
                    <div className="mb-4 sticky top-0 bg-white z-10 pb-2 -mt-4 pt-4">
                        <SearchBar />
                    </div>

                    <GistDiscovery />

                    {/* Trends */}
                    <div className="bg-gray-50 rounded-2xl overflow-hidden mb-4 border border-gray-100">
                        <div className="p-4 py-3">
                            <h3 className="font-extrabold text-[20px] text-gray-900 mb-3">Trends for you</h3>
                            {trends.length > 0 ? (
                                <div className="">
                                    {trends.map((trend, i) => (
                                        <div key={i} className="cursor-pointer hover:bg-gray-100 -mx-4 px-4 py-3 transition-colors relative">
                                            <div className="flex justify-between items-start text-[13px] text-gray-500 mb-0.5">
                                                <span>Trending in Nigeria</span>
                                                <button className="hover:bg-blue-50 text-gray-400 hover:text-nsp-teal rounded-full p-1 -m-1.5 transition-colors">
                                                    <Icon icon="ph:dots-three-bold" width="18" height="18" />
                                                </button>
                                            </div>
                                            <div className="font-bold text-gray-900 text-[15px] mb-0.5">{trend.tag}</div>
                                            <div className="text-[13px] text-gray-500">{trend.count} posts</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">No trends right now</div>
                            )}
                            <div className="mt-2 text-nsp-teal text-[15px] cursor-pointer hover:bg-gray-100 -mx-4 px-4 py-3 transition-colors block text-left">
                                Show more
                            </div>
                        </div>
                    </div>

                    {/* Who to follow */}
                    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                        <div className="p-4 py-3">
                            <h3 className="font-extrabold text-[20px] text-gray-900 mb-3">Who to follow</h3>
                            <div className="space-y-0">
                                {suggestedUsers.map((user) => (
                                    <div key={user.id} className="flex items-center gap-3 hover:bg-gray-100 -mx-4 px-4 py-3 cursor-pointer transition-colors" onClick={() => navigate(`/profile/${user.id}`)}>
                                        <Avatar
                                            user={user}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-bold text-[15px] text-gray-900 hover:underline truncate flex items-center gap-1">
                                                {user.name}
                                                <VerifiedBadge user={user} size={14} />
                                            </div>
                                            <div className="text-[15px] text-gray-500 truncate">@{user.handle}</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onFollowUser(user.id);
                                            }}
                                            className="bg-black hover:bg-gray-800 text-white text-sm font-bold py-1.5 px-4 rounded-full transition-colors"
                                        >
                                            Follow
                                        </button>
                                    </div>
                                ))}
                                {suggestedUsers.length === 0 && (
                                    <div className="text-gray-500 text-sm">No suggestions right now</div>
                                )}
                            </div>
                            <div className="mt-2 text-nsp-teal text-[15px] cursor-pointer hover:bg-gray-100 -mx-4 px-4 py-3 transition-colors block text-left">
                                Show more
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-gray-500 px-4 leading-relaxed">
                        <a href="#/terms" className="hover:underline">Terms of Service</a>
                        <a href="#/privacy" className="hover:underline">Privacy Policy</a>
                        <a href="#/cookie-policy" className="hover:underline">Cookie Policy</a>
                        <a href="#" className="hover:underline">Accessibility</a>
                        <a href="#" className="hover:underline">Ads info</a>
                        <div className="flex items-center gap-1">
                            <span>More</span>
                            <Icon icon="ph:dots-three" />
                        </div>
                        <span>© 2026 NSP Corp.</span>
                    </div>
                </div>
            )}

            {/* Mobile Floating Action Button */}
            {!hideFab && (
                <button
                    onClick={() => setIsPostModalOpen(true)}
                    className={`md:hidden fixed bottom-20 right-4 z-40 bg-nsp-teal text-white p-4 rounded-full shadow-xl hover:scale-105 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}
                >
                    <Icon icon="ph:plus-bold" width="24" height="24" />
                </button>
            )}

            {/* Mobile Bottom Navigation */}
            {!hideBottomNav && (
                <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-[56px] z-50 px-2 pb-safe transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
                    {['Home', 'Explore', 'Gist', 'Notifications', 'Messages'].map((targetLabel) => {
                        const item = NavItems.find(i => i.label === targetLabel);
                        if (!item) return null;
                        const isActive = location.pathname === item.path;
                        const isMessages = item.label === 'Messages';
                        const isHome = item.label === 'Home';

                        return (
                            <button
                                key={item.label}
                                onClick={() => {
                                    if (item.label === 'Gist') {
                                        setIsCreateGistOpen(true);
                                    } else if (item.path !== '#') {
                                        navigate(item.path);
                                    }
                                }}
                                className="p-2 relative flex-1 flex justify-center"
                            >
                                <div className="relative">
                                    <Icon
                                        icon={isActive ? item.activeIcon : item.icon}
                                        width="26"
                                        height="26"
                                        className={isActive ? 'text-gray-900' : 'text-gray-500'}
                                    />
                                    {item.label === 'Notifications' && unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-nsp-teal text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </div>
                                    )}
                                    {isMessages && unreadMessages > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-nsp-teal text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                                            {unreadMessages > 99 ? '99+' : unreadMessages}
                                        </div>
                                    )}
                                    {isHome && hasNewPosts && (
                                        <div className="absolute top-0 right-1 w-2 h-2 bg-nsp-teal rounded-full border border-white"></div>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 z-[90] md:hidden transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsDrawerOpen(false)}
            ></div>

            {/* Drawer Content */}
            <div
                className={`fixed inset-y-0 left-0 w-[280px] bg-white z-[100] md:hidden transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) shadow-2xl overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    {currentUser && (
                        <div className="p-5">
                            <div className="mb-6">
                                <div className="flex justify-between items-start mb-3">
                                    <Avatar user={currentUser} alt="Me" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight mb-0.5">{currentUser.name}</h3>
                                    <VerifiedBadge user={currentUser} size={16} />
                                </div>
                                <p className="text-gray-500 text-sm mb-5">@{currentUser.handle}</p>

                                <div className="flex gap-4 text-sm">
                                    <div className="hover:underline cursor-pointer group">
                                        <span className="font-bold text-gray-900 group-hover:underline">{currentUser.following_count || 0}</span> <span className="text-gray-500">Following</span>
                                    </div>
                                    <div className="hover:underline cursor-pointer group">
                                        <span className="font-bold text-gray-900 group-hover:underline">{currentUser.followers_count || 0}</span> <span className="text-gray-500">Followers</span>
                                    </div>
                                </div>
                            </div>

                            <nav className="space-y-1">
                                {[
                                    { icon: 'ph:user-bold', label: 'Profile', path: currentUser ? `/profile/${currentUser.id}` : '#' },
                                    { icon: 'ph:microphone-stage-bold', label: 'Gists', path: '#' },
                                    { icon: 'ph:hash-bold', label: 'Explore', path: '/explore' },
                                    { icon: 'ph:bookmark-simple-bold', label: 'Bookmarks', path: '/bookmarks' },
                                    { icon: 'ph:gear-bold', label: 'Settings', path: '/settings' },
                                ].map((link) => (
                                    <button
                                        key={link.label}
                                        onClick={() => {
                                            if (link.label === 'Gists') {
                                                setIsCreateGistOpen(true);
                                                setIsDrawerOpen(false);
                                            } else if (link.path !== '#') {
                                                navigate(link.path);
                                                setIsDrawerOpen(false);
                                            }
                                        }}
                                        className="w-full flex items-center gap-4 py-3 px-4 -mx-4 hover:bg-gray-100 transition-colors"
                                    >
                                        <Icon icon={link.icon} width="24" height="24" className={'text-gray-900'} />
                                        <span className="font-bold text-xl text-gray-900">{link.label}</span>
                                    </button>
                                ))}
                            </nav>

                            <div className="h-px bg-gray-200 my-4 -mx-5"></div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => { navigate('/settings'); setIsDrawerOpen(false); }}
                                    className="w-full flex justify-between items-center cursor-pointer group"
                                >
                                    <span className="font-medium text-gray-900 text-sm group-hover:underline">Settings & Support</span>
                                    <Icon icon="ph:caret-down-bold" className="text-gray-500" width="16" height="16" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <CreatePostModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                currentUser={currentUser}
            />

            <CreateGistModal
                isOpen={isCreateGistOpen}
                onClose={() => setIsCreateGistOpen(false)}
            />
        </div>
    );
};

export default SocialLayout;

export const SocialLayoutContext = React.createContext<{ openDrawer: () => void }>({ openDrawer: () => { } });
export const useSocialLayout = () => React.useContext(SocialLayoutContext);
