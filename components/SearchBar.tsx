import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useNavigate } from 'react-router-dom'
import { searchAll } from '../services/searchService'
import { followUser, unfollowUser, isFollowing } from '../services/followService'
import { useCurrentUser } from '../hooks/useCurrentUser'
import type { User, Post } from '../types'
import VerifiedBadge from './Shared/VerifiedBadge'
import Avatar from './Shared/Avatar'

interface SearchBarProps {
  className?: string
}

const SearchBar: React.FC<SearchBarProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ users: User[]; posts: Post[] }>({ users: [], posts: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { profile: currentUser } = useCurrentUser()

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], posts: [] })
      setShowResults(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const searchResults = await searchAll(query)
        setResults(searchResults)
        setShowResults(true)

        // Check following status for all returned users
        if (currentUser && searchResults.users.length > 0) {
          const followingStatuses: Record<string, boolean> = {}
          await Promise.all(
            searchResults.users.map(async (user) => {
              if (user.id !== currentUser.id) {
                followingStatuses[user.id] = await isFollowing(currentUser.id, user.id)
              }
            })
          )
          setFollowingMap(followingStatuses)
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults({ users: [], posts: [] })
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, currentUser])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUserClick = (user: User) => {
    navigate(`/profile/${user.handle}`)
    setShowResults(false)
    setQuery('')
  }

  const handleFollowClick = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation()
    if (!currentUser || loadingFollow) return

    setLoadingFollow(userId)
    try {
      const isCurrentlyFollowing = followingMap[userId]
      if (isCurrentlyFollowing) {
        await unfollowUser(currentUser.id, userId)
      } else {
        await followUser(currentUser.id, userId)
      }
      setFollowingMap(prev => ({ ...prev, [userId]: !isCurrentlyFollowing }))
    } catch (error) {
      console.error('Follow error:', error)
    } finally {
      setLoadingFollow(null)
    }
  }

  const handlePostClick = (post: Post) => {
    navigate(`/profile/${post.user.handle}`)
    setShowResults(false)
    setQuery('')
  }

  const hasResults = results.users.length > 0 || results.posts.length > 0

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Icon
          icon="ph:magnifying-glass"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          width="20"
          height="20"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setShowResults(true)}
          placeholder="Search NSP"
          className="w-full bg-gray-100 text-gray-900 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-nsp-teal/50 focus:bg-white transition-all placeholder-gray-500 font-medium"
        />
        {isSearching && (
          <Icon
            icon="line-md:loading-twotone-loop"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-nsp-teal"
            width="20"
            height="20"
          />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto z-50">
          {!isSearching && !hasResults && (
            <div className="p-4 text-center text-gray-500">
              No results found for "{query}"
            </div>
          )}

          {/* Users Section */}
          {results.users.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-50/50">
                People
              </div>
              {results.users.map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  {/* Avatar */}
                  <Avatar user={user} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[15px] text-gray-900 truncate">{user.name || 'Unknown User'}</span>
                      <VerifiedBadge user={user} size={16} />
                    </div>
                    <div className="text-[15px] text-gray-500 truncate">@{user.handle}</div>
                    {user.bio && (
                      <div className="text-[13px] text-gray-500 truncate mt-0.5">{user.bio}</div>
                    )}
                  </div>

                  {/* Follow Button */}
                  {currentUser && user.id !== currentUser.id && (
                    <button
                      onClick={(e) => handleFollowClick(e, user.id)}
                      disabled={loadingFollow === user.id}
                      className={`
                        px-4 py-1.5 rounded-full text-sm font-bold transition-all flex-shrink-0
                        ${followingMap[user.id]
                          ? 'bg-white border border-gray-300 text-gray-900 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                          : 'bg-gray-900 text-white hover:bg-black'
                        }
                        disabled:opacity-50
                      `}
                    >
                      {loadingFollow === user.id ? (
                        <Icon icon="line-md:loading-loop" width="16" height="16" />
                      ) : followingMap[user.id] ? (
                        <span className="group-hover:hidden">Following</span>
                      ) : (
                        'Follow'
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Posts Section */}
          {results.posts.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-50/50">
                Posts
              </div>
              {results.posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(post)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Post Author */}
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar user={post.user} className="w-6 h-6 rounded-full object-cover" />
                    <span className="font-bold text-gray-900 text-sm">{post.user?.name || 'Unknown User'}</span>
                    <VerifiedBadge user={post.user} size={14} />
                    <span className="text-gray-500 text-sm">@{post.user?.handle}</span>
                  </div>

                  {/* Post Content */}
                  <p className="text-gray-700 text-sm line-clamp-2">{post.content}</p>

                  {/* Post Stats */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Icon icon="ph:heart" width="14" height="14" />
                      {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="ph:chat-circle" width="14" height="14" />
                      {post.comments_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="ph:repeat" width="14" height="14" />
                      {post.reracks_count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* View all results link */}
          {hasResults && (
            <button
              onClick={() => {
                navigate(`/explore?q=${encodeURIComponent(query)}`)
                setShowResults(false)
                setQuery('')
              }}
              className="w-full px-4 py-3 text-nsp-teal font-medium hover:bg-nsp-teal/5 transition-colors text-center border-t border-gray-100"
            >
              View all results for "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
