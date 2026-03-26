'use client';

import { useState } from 'react';
import { LogCard } from '@/components/SlimeCard';
import { MOCK_FEED, MOCK_DROPS } from '@/lib/mock-data';
import { ActivityFeedItem, Drop } from '@/lib/types';

function DropBanner({ drop }: { drop: Drop }) {
  const isLive = drop.status === 'live';
  const dropDate = drop.drop_at
    ? new Date(drop.drop_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'TBA';

  return (
    <div className={`rounded-2xl overflow-hidden border ${isLive ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-pink-100 bg-gradient-to-r from-pink-50 to-purple-50'} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        {isLive ? (
          <span className="badge-live inline-flex items-center gap-1.5 text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Live Now
          </span>
        ) : (
          <span className="text-[10px] font-black text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
            Drop Alert 🚨
          </span>
        )}
        <span className="text-xs font-bold text-gray-500">{drop.brand?.name}</span>
      </div>
      <p className="font-bold text-gray-900 text-sm">{drop.title}</p>
      {drop.description && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{drop.description}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">🕐 {dropDate}</span>
        <button className={`text-xs font-bold px-3 py-1.5 rounded-xl ${isLive ? 'bg-green-500 text-white' : 'bg-pink-500 text-white'} active:scale-95 transition-transform`}>
          {isLive ? 'Shop Now →' : 'Set Reminder'}
        </button>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [likedLogs, setLikedLogs] = useState<Set<string>>(new Set());

  const toggleLike = (logId: string) => {
    setLikedLogs(prev => {
      const next = new Set(prev);
      next.has(logId) ? next.delete(logId) : next.add(logId);
      return next;
    });
  };

  // Insert a live drop banner after the first feed item
  const liveDrop = MOCK_DROPS.find(d => d.status === 'live');
  const announcedDrop = MOCK_DROPS.find(d => d.status === 'announced');

  return (
    <div className="min-h-screen slime-blob">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-2xl gradient-text leading-none">SlimeLog</h1>
            <p className="text-xs text-gray-400 font-medium">Your slime feed 🫧</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-pink-50 text-pink-500 active:scale-95 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto scroll-hide pb-0.5">
          {['Following', 'Everyone', 'Drops', 'Hauls'].map((tab, i) => (
            <button
              key={tab}
              className={`shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all ${i === 0 ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">

        {/* Live drop banner at top if any */}
        {liveDrop && <DropBanner drop={liveDrop} />}

        {/* Feed items */}
        {MOCK_FEED.map((item: ActivityFeedItem, idx) => {
          if (item.activity_type === 'drop_announced' && item.drop) {
            return (
              <DropBanner key={item.id} drop={item.drop} />
            );
          }

          if (item.log) {
            return (
              <LogCard
                key={item.id}
                log={item.log}
                showUser
                likeCount={Number(item.metadata?.like_count ?? 0) + (likedLogs.has(item.log.id) ? 1 : 0)}
                commentCount={Number(item.metadata?.comment_count ?? 0)}
                onLike={() => item.log && toggleLike(item.log.id)}
              />
            );
          }

          return null;
        })}

        {/* Upcoming drop teaser */}
        {announcedDrop && (
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Upcoming Drop</p>
            <DropBanner drop={announcedDrop} />
          </div>
        )}

        <p className="text-center text-xs text-gray-300 py-6">You're all caught up 🫧</p>
      </div>
    </div>
  );
}
