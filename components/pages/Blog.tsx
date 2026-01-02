import React from 'react';
import { Icon } from '@iconify/react';

const Blog: React.FC = () => {
  const posts = [
    {
      title: "10 High-Scoring 2-Letter Words You Must Know",
      excerpt: "Mastering these short words is the key to hooking your way to victory. Don't leave points on the table.",
      author: "Coach Emeka",
      date: "Oct 12, 2024",
      image: "https://images.unsplash.com/photo-1591635566278-10dca0ca76ee?q=80&w=600&auto=format&fit=crop",
      category: "Strategy"
    },
    {
      title: "Interview: How I Won The African Championship",
      excerpt: "Exclusive insights from the reigning champion on mental preparation and board management.",
      author: "NSP Editorial",
      date: "Oct 05, 2024",
      image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600&auto=format&fit=crop",
      category: "Interviews"
    },
    {
      title: "The Psychology of Scrabble: It's Not Just Vocabulary",
      excerpt: "Why keeping your cool is just as important as knowing the dictionary definition of 'QUIZ'.",
      author: "Dr. A. Bello",
      date: "Sep 28, 2024",
      image: "https://images.unsplash.com/photo-1494178270175-e96de2971df9?q=80&w=600&auto=format&fit=crop",
      category: "Psychology"
    },
    {
      title: "NSP Launches New Youth Initiative in Abuja",
      excerpt: "Bringing the joy of words to 50 new schools in the capital territory.",
      author: "NSP News",
      date: "Sep 15, 2024",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600&auto=format&fit=crop",
      category: "News"
    },
    {
      title: "Memorization Techniques for Top Players",
      excerpt: "How to retain thousands of words without losing your mind. Spaced repetition explained.",
      author: "Coach Emeka",
      date: "Sep 10, 2024",
      image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop",
      category: "Training"
    },
    {
      title: "Why 'QI' is the Best Friend You'll Ever Have",
      excerpt: "A deep dive into the utility of the Q without U. The math behind the magic.",
      author: "Stats Team",
      date: "Aug 22, 2024",
      image: "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?q=80&w=600&auto=format&fit=crop",
      category: "Analysis"
    }
  ];

  return (
    <div className="bg-[#f2f0e9] min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16">
          <h1 className="font-marker text-6xl text-nsp-teal mb-4">The NSP Blog</h1>
          <p className="text-xl text-gray-600">News, strategies, and stories from the world of words.</p>
        </div>

        {/* Categories */}
        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {['All', 'Strategy', 'Interviews', 'News', 'Training'].map(cat => (
             <button key={cat} className={`px-6 py-2 rounded-full font-bold transition-all ${cat === 'All' ? 'bg-nsp-teal text-white' : 'bg-white text-gray-500 hover:text-nsp-teal hover:bg-white'}`}>
                {cat}
             </button>
          ))}
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {posts.map((post, index) => (
             <article key={index} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col">
                <div className="relative h-56 overflow-hidden">
                   <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-nsp-dark-teal text-xs font-bold px-3 py-1 rounded-full z-10">
                     {post.category}
                   </div>
                   <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                   <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <span>{post.date}</span>
                      <span>•</span>
                      <span>{post.author}</span>
                   </div>
                   <h3 className="font-bold text-xl text-nsp-dark-teal mb-3 leading-tight hover:text-nsp-orange transition-colors cursor-pointer">
                      {post.title}
                   </h3>
                   <p className="text-gray-600 text-sm mb-6 flex-1">
                      {post.excerpt}
                   </p>
                   <a href="#" className="inline-flex items-center gap-2 text-nsp-teal font-bold hover:gap-3 transition-all">
                      Read Article <Icon icon="ph:arrow-right-bold" />
                   </a>
                </div>
             </article>
           ))}
        </div>

        <div className="mt-16 text-center">
           <button className="bg-transparent border-2 border-nsp-teal text-nsp-teal hover:bg-nsp-teal hover:text-white font-bold py-3 px-8 rounded-lg transition-colors">
              Load More Articles
           </button>
        </div>

      </div>
    </div>
  );
};

export default Blog;