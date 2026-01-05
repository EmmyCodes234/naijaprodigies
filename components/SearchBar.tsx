import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useNavigate } from 'react-router-dom'
import { searchAll } from '../services/searchService'
import type { User, Post } from '../types'
import VerifiedBadge from './Shared/VerifiedBadge'

interface SearchBarProps {
  className?: string
}

const SearchBar: React.FC<SearchBarProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ users: User[]; posts: Post[] }>({ users: [], posts: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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
      } catch (error) {
        console.error('Search error:', error)
        setResults({ users: [], posts: [] })
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query])

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

  const handlePostClick = (post: Post) => {
    // For now, navigate to the user's profile
    // In the future, this could navigate to a specific post view
    navigate(`/profile/${post.user.handle}`)
    setShowResults(false)
    setQuery('')
  }

  const handleHashtagClick = () => {
    // Keep the search results open for hashtag searches
    // User can see all posts with that hashtag
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-96 overflow-y-auto z-50">
          {!isSearching && !hasResults && (
            <div className="p-4 text-center text-gray-500">
              No results found for "{query}"
            </div>
          )}

          {/* Users Section */}
          {results.users.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                Users
              </div>
              {results.users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nsp-orange to-nsp-teal flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      (user.name || '?').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-900 truncate">{user.name || 'Unknown User'}</span>
                      <VerifiedBadge user={user} size={16} />
                    </div>
                    <div className="text-sm text-gray-500 truncate">@{user.handle}</div>
                  </div>

                  {/* Rank Badge */}
                  {user.rank && (
                    <div className="px-2 py-1 bg-nsp-orange/20 text-nsp-orange text-xs font-bold rounded flex-shrink-0">
                      {user.rank}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Posts Section */}
          {results.posts.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
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
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nsp-orange to-nsp-teal flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {post.user?.avatar ? (
                        <img src={post.user.avatar} alt={post.user.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        (post.user?.name || '?').charAt(0).toUpperCase()
                      )}
                    </div>
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
        </div>
      )}
    </div>
  )
}

export default SearchBar
