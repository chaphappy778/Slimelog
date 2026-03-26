'use client';

import { useState } from 'react';
import { TypeBadge } from '@/components/TypeBadge';
import { LogCard } from '@/components/SlimeCard';
import { MOCK_PROFILE, MOCK_COLLECTION_SUMMARY, MY_COLLECTION_LOGS } from '@/lib/mock-data';
import { RATING_DIMENSIONS, SlimeType, SLIME_TYPE_LABELS } from '@/lib/types';

const ALL_TYPES = Object.keys(SLIME_TYPE_LABELS) as SlimeType[];

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-black text-xl text-gray-900">{value}</span>
      <span className="text-[10px] text-gray-400 font-semibold text-center">{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'stats' | 'brands'>('logs');

  const profile = MOCK_PROFILE;
  const summary = MOCK_COLLECTION_SUMMARY;
  const recentLogs = MY_COLLECTION_LOGS.filter(l => l.rating_overall).slice(0, 5);

  // Build type frequency from logs
  const typeCounts = MY_COLLECTION_LOGS.reduce<Record<string, number>>((acc, log) => {
    acc[log.slime_type] = (acc[log.slime_type] ?? 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) as [SlimeType, number][];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-pink-50 px-4 pb-0">
        <div className="flex items-center justify-between pt-4 pb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-200 to-purple-300 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-white">
                {profile.username.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-gray-900 text-lg leading-tight">@{profile.username}</h1>
                {profile.is_premium && (
                  <span className="text-xs bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold px-2 py-0.5 rounded-full">
                    PRO
                  </span>
                )}
              </div>
              {profile.full_name && (
                <p className="text-sm text-gray-500">{profile.full_name}</p>
              )}
            </div>
          </div>
          <button className="px-4 py-2 border border-pink-200 rounded-xl text-xs font-bold text-pink-500 active:scale-95 transition-transform">
            Edit
          </button>
        </div>

        {profile.bio && (
          <p className="text-sm text-gray-600 leading-relaxed pb-3">{profile.bio}</p>
        )}

        {/* Stats row */}
        <div className="flex justify-around py-3 border-t border-pink-50">
          <StatPill value={summary.total_in_collection} label="Collection" />
          <div className="w-px bg-pink-50" />
          <StatPill value={summary.total_in_wishlist} label="Wishlist" />
          <div className="w-px bg-pink-50" />
          <StatPill value={summary.total_rated} label="Rated" />
          <div className="w-px bg-pink-50" />
          <StatPill value="—" label="Followers" />
          <div className="w-px bg-pink-50" />
          <StatPill value="—" label="Following" />
        </div>

        {/* Follow / message */}
        <div className="flex gap-2 pb-3">
          <button className="flex-1 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white text-sm font-bold rounded-xl active:scale-95 transition-transform">
            Follow
          </button>
          <button className="w-12 h-[42px] bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center active:scale-95 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </button>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 pb-3 overflow-x-auto scroll-hide">
          {([
            { key: 'logs', label: '📋 Recent Logs' },
            { key: 'stats', label: '📊 Stats' },
            { key: 'brands', label: '🏪 Brands' },
          ] as { key: typeof activeTab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all ${activeTab === t.key ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">

        {/* ── Recent Logs ──────────────────────── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {recentLogs.map(log => (
              <LogCard key={log.id} log={log} showUser={false} />
            ))}
            {recentLogs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🫧</div>
                <p className="font-bold text-gray-400 text-sm">No logs yet</p>
              </div>
            )}
          </div>
        )}

        {/* ── Stats ────────────────────────────── */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Average ratings breakdown */}
            <div className="bg-white rounded-2xl border border-pink-50 p-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Average Ratings Given</p>

              {/* Overall big number */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-pink-50">
                <span className="text-4xl font-black gradient-text">
                  {summary.avg_overall_given?.toFixed(1) ?? '—'}
                </span>
                <div>
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-sm ${s <= Math.round(summary.avg_overall_given ?? 0) ? 'text-pink-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Overall average across {summary.total_rated} ratings</p>
                </div>
              </div>

              {RATING_DIMENSIONS.filter(d => d.key !== 'overall').map(dim => (
                <div key={dim.key} className="flex items-center gap-3 mb-2">
                  <span className="text-sm w-5">{dim.emoji}</span>
                  <span className="text-xs text-gray-500 w-20 shrink-0">{dim.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"
                      style={{ width: `${(4.5 / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-6 text-right">4.5</span>
                </div>
              ))}
            </div>

            {/* Type breakdown */}
            <div className="bg-white rounded-2xl border border-pink-50 p-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Top Slime Types</p>
              <div className="space-y-2">
                {topTypes.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <TypeBadge type={type} size="sm" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-300 to-purple-300 rounded-full"
                        style={{ width: `${(count / MY_COLLECTION_LOGS.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection badges */}
            <div className="bg-white rounded-2xl border border-pink-50 p-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Collection Milestones</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: '🫧', label: '100+ Slimes', unlocked: summary.total_in_collection >= 100 },
                  { emoji: '🏆', label: 'Top Rater', unlocked: summary.total_rated >= 50 },
                  { emoji: '🌈', label: '10 Types', unlocked: summary.distinct_types_tried >= 10 },
                  { emoji: '🏪', label: '10 Brands', unlocked: summary.distinct_brands_tried >= 10 },
                  { emoji: '⭐', label: '4.0+ Avg', unlocked: (summary.avg_overall_given ?? 0) >= 4 },
                  { emoji: '💫', label: 'Wishlist 25+', unlocked: summary.total_in_wishlist >= 25 },
                ].map(badge => (
                  <div
                    key={badge.label}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl ${badge.unlocked ? 'bg-pink-50' : 'bg-gray-50 opacity-40'}`}
                  >
                    <span className="text-2xl">{badge.emoji}</span>
                    <span className="text-[9px] font-bold text-gray-500 text-center leading-tight">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Brands ───────────────────────────── */}
        {activeTab === 'brands' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">{summary.distinct_brands_tried} brands tried</p>
            {/* Placeholder list */}
            {['Peachybbies', 'Crafted Slimes', 'Sloomoo Institute', 'Glamour Slimes', 'The Slime Spot'].map(brand => (
              <div key={brand} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-pink-50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-lg shrink-0">
                  🫧
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800">{brand}</p>
                  <p className="text-xs text-gray-400">3 slimes tried</p>
                </div>
                <button className="text-xs font-bold text-pink-400 px-2 py-1.5">
                  View →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
