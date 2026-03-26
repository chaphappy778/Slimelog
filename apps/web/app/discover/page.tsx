'use client';

import { useState } from 'react';
import { SlimeCard } from '@/components/SlimeCard';
import { TypeBadge } from '@/components/TypeBadge';
import { MOCK_SLIMES, MOCK_BRANDS, MOCK_DROPS } from '@/lib/mock-data';
import { SlimeType, SLIME_TYPE_LABELS, Drop } from '@/lib/types';

const ALL_TYPES = Object.keys(SLIME_TYPE_LABELS) as SlimeType[];

function DropCard({ drop, compact = false }: { drop: Drop; compact?: boolean }) {
  const isLive = drop.status === 'live';
  const isAnnounced = drop.status === 'announced';
  const date = drop.drop_at
    ? new Date(drop.drop_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'TBA';

  return (
    <div className={`bg-white rounded-2xl border ${isLive ? 'border-green-200' : 'border-pink-100'} p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        {isLive && (
          <span className="badge-live inline-flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live
          </span>
        )}
        {isAnnounced && (
          <span className="text-[10px] font-black text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
            Upcoming
          </span>
        )}
        <span className="text-xs font-semibold text-gray-400">{drop.brand?.name}</span>
      </div>
      <p className="font-bold text-gray-900 text-sm">{drop.title}</p>
      {!compact && drop.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{drop.description}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">🕐 {date}</span>
        <button className={`text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform ${isLive ? 'bg-green-500 text-white' : 'bg-pink-500 text-white'}`}>
          {isLive ? 'Shop →' : 'Notify me'}
        </button>
      </div>
    </div>
  );
}

type DiscoverTab = 'trending' | 'top-rated' | 'drops' | 'types';

export default function DiscoverPage() {
  const [tab, setTab] = useState<DiscoverTab>('trending');
  const [search, setSearch] = useState('');

  const topRated = [...MOCK_SLIMES].sort((a, b) => (b.avg_overall ?? 0) - (a.avg_overall ?? 0));
  const trending = [...MOCK_SLIMES].sort((a, b) => b.total_ratings - a.total_ratings);

  const filteredSlimes = (tab === 'top-rated' ? topRated : trending).filter(s => {
    if (!search) return true;
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.brand?.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-50 px-4 py-3">
        <h1 className="font-black text-2xl gradient-text">Discover</h1>

        {/* Search */}
        <div className="relative mt-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search slimes, brands…"
            className="w-full bg-pink-50 border border-pink-100 rounded-2xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder-gray-300"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto scroll-hide">
          {([
            { key: 'trending', label: '🔥 Trending' },
            { key: 'top-rated', label: '⭐ Top Rated' },
            { key: 'drops', label: '🚨 Drops' },
            { key: 'types', label: '🧬 Types' },
          ] as { key: DiscoverTab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all ${tab === t.key ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">

        {/* ── Trending / Top Rated ──────────────── */}
        {(tab === 'trending' || tab === 'top-rated') && (
          <>
            {tab === 'trending' && (
              <div className="mb-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">🔥 Most Logged This Week</p>
                {/* Hero card */}
                {filteredSlimes[0] && (
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-4 mb-4 border border-pink-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-pink-500 text-white text-xs font-black px-2.5 py-1 rounded-full">#1 This Week</span>
                      <TypeBadge type={filteredSlimes[0].slime_type} size="sm" />
                    </div>
                    <h2 className="font-black text-xl text-gray-900">{filteredSlimes[0].name}</h2>
                    <p className="text-sm text-gray-500">{filteredSlimes[0].brand?.name}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-2xl font-black text-pink-500">{filteredSlimes[0].avg_overall?.toFixed(1)}</span>
                      <div>
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-sm ${s <= Math.round(filteredSlimes[0].avg_overall ?? 0) ? 'text-pink-400' : 'text-gray-200'}`}>★</span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">{filteredSlimes[0].total_ratings.toLocaleString()} logs</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'top-rated' && (
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">⭐ Highest Rated · Min 3 ratings</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {filteredSlimes.map((slime, i) => (
                <SlimeCard
                  key={slime.id}
                  slime={slime}
                  rank={tab === 'top-rated' ? i + 1 : undefined}
                />
              ))}
            </div>

            {filteredSlimes.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-sm text-gray-400 font-semibold">No slimes found</p>
              </div>
            )}
          </>
        )}

        {/* ── Drops ──────────────────────────────── */}
        {tab === 'drops' && (
          <div className="space-y-4">
            {MOCK_DROPS.filter(d => d.status === 'live').length > 0 && (
              <>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">🟢 Live Now</p>
                {MOCK_DROPS.filter(d => d.status === 'live').map(drop => (
                  <DropCard key={drop.id} drop={drop} />
                ))}
              </>
            )}

            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4">📅 Upcoming</p>
            {MOCK_DROPS.filter(d => d.status === 'announced').map(drop => (
              <DropCard key={drop.id} drop={drop} />
            ))}

            {/* Brand follow suggestions */}
            <div className="mt-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">🏪 Follow Brands for Drop Alerts</p>
              <div className="space-y-2">
                {MOCK_BRANDS.map(brand => (
                  <div key={brand.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-pink-50">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-lg shrink-0">
                      🫧
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{brand.name}</p>
                      <p className="text-xs text-gray-400">
                        ⭐ Shipping {brand.avg_shipping?.toFixed(1)} · CS {brand.avg_customer_service?.toFixed(1)}
                      </p>
                    </div>
                    <button className="shrink-0 text-xs font-bold px-3 py-2 bg-pink-50 text-pink-500 rounded-xl active:scale-95 transition-transform">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Types Guide ────────────────────────── */}
        {tab === 'types' && (
          <div className="space-y-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">🧬 Slime Type Guide</p>
            {ALL_TYPES.map(type => (
              <div key={type} className="bg-white rounded-2xl border border-pink-50 p-4">
                <div className="flex items-center justify-between mb-1">
                  <TypeBadge type={type} size="md" />
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {TYPE_DESCRIPTIONS[type]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TYPE_DESCRIPTIONS: Record<SlimeType, string> = {
  butter: 'Soft, spreadable texture with a smooth, creamy feel. Melts in your hands. Perfect for relaxing kneading.',
  clear: 'Transparent base. Shows off add-ins like glitter, charms, and foam beads. Satisfying stretch and clarity.',
  cloud: 'Light, airy texture made with shaving cream or foam clay. Fluffy and soft with a distinctive crunch.',
  icee: 'Granular, crunchy texture. Sounds like packing snow. Extremely satisfying ASMR for crunch lovers.',
  fluffy: 'Ultra-light whipped texture. Deflates slowly on stretch. Soft sounds, gentle on hands.',
  floam: 'Packed with micro foam beads for maximum crunch. Thick and moldable with incredible texture.',
  snow_fizz: 'Fizzy, powdery texture that collapses softly. Gentle sounds, relaxing sensory experience.',
  thick_and_glossy: 'Heavy, satisfying drizzle. Pulls like taffy. Loud pops and drizzle sounds.',
  jelly: 'Clear, slightly firm texture. Jiggle effect. Great bubble pop ASMR.',
  beaded: 'Filled with water beads or fishbowl beads. Wet, squishy sounds with satisfying texture.',
  clay: 'Moldable and firm. Holds shape. Great for sculpture play and creative activation.',
  cloud_cream: 'Whipped cream texture with a cloud base. Dreamy consistency, gorgeous drizzle.',
  magnetic: 'Contains iron filings — responds to magnets! Novelty type with unique visual effects.',
  thermochromic: 'Color-changing slime. Reacts to heat from your hands. Mesmerizing visual transformation.',
  avalanche: 'Classic butter-clear hybrid. Falls in satisfying sheets. Deep, satisfying drizzle and pull.',
  slay: 'Premium craft slime with designer scents and curated add-ins. For the serious collector.',
};
