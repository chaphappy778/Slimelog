'use client';

import { useState } from 'react';
import { TypeBadge } from '@/components/TypeBadge';
import { RatingDisplay } from '@/components/RatingInput';
import { MY_COLLECTION_LOGS, MOCK_COLLECTION_SUMMARY } from '@/lib/mock-data';
import { CollectionLog, SlimeType, SLIME_TYPE_LABELS } from '@/lib/types';

type TabFilter = 'collection' | 'wishlist' | 'rated';

function CollectionItemCard({ log }: { log: CollectionLog }) {
  const slime = log.slime;
  const name = slime?.name ?? log.slime_name ?? 'Unknown Slime';
  const brand = slime?.brand?.name ?? log.brand?.name ?? log.brand_name_raw ?? '';
  const color = slime?.colors?.[0] ?? '#F9A8D4';

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-pink-50 shadow-sm active:scale-[0.97] transition-transform">
      {/* Mini photo area */}
      <div
        className="w-full h-28 flex items-center justify-center relative"
        style={{ background: `linear-gradient(135deg, ${color}55, ${slime?.colors?.[1] ?? color}22)` }}
      >
        <span className="text-3xl">🫧</span>
        {log.in_wishlist && !log.in_collection && (
          <div className="absolute top-2 right-2 bg-purple-100 text-purple-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">
            WISH
          </div>
        )}
        {slime?.is_limited && (
          <div className="absolute top-2 left-2 bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
            LTD
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-800 truncate leading-tight">{name}</p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{brand}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <TypeBadge type={log.slime_type} size="sm" />
          {log.rating_overall && (
            <span className="text-[10px] font-black text-pink-500">{log.rating_overall}★</span>
          )}
        </div>
      </div>
    </div>
  );
}

const ALL_TYPES = Object.keys(SLIME_TYPE_LABELS) as SlimeType[];

export default function CollectionPage() {
  const [tab, setTab] = useState<TabFilter>('collection');
  const [typeFilter, setTypeFilter] = useState<SlimeType | 'all'>('all');
  const [search, setSearch] = useState('');

  const summary = MOCK_COLLECTION_SUMMARY;

  const filtered = MY_COLLECTION_LOGS.filter(log => {
    if (tab === 'collection' && !log.in_collection) return false;
    if (tab === 'wishlist' && !log.in_wishlist) return false;
    if (tab === 'rated' && !log.rating_overall) return false;
    if (typeFilter !== 'all' && log.slime_type !== typeFilter) return false;
    const name = log.slime?.name ?? log.slime_name ?? '';
    const brand = log.slime?.brand?.name ?? log.brand_name_raw ?? '';
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !brand.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-50 px-4 py-3">
        <h1 className="font-black text-2xl gradient-text">My Collection</h1>

        {/* Stats row */}
        <div className="flex gap-3 mt-2 overflow-x-auto scroll-hide pb-0.5">
          {[
            { label: 'Slimes', value: summary.total_in_collection },
            { label: 'Wishlisted', value: summary.total_in_wishlist },
            { label: 'Rated', value: summary.total_rated },
            { label: 'Avg ⭐', value: summary.avg_overall_given?.toFixed(1) ?? '—' },
            { label: 'Brands', value: summary.distinct_brands_tried },
            { label: 'Types', value: summary.distinct_types_tried },
          ].map(stat => (
            <div key={stat.label} className="shrink-0 text-center bg-pink-50 rounded-xl px-3 py-1.5">
              <p className="text-sm font-black text-pink-600">{stat.value}</p>
              <p className="text-[10px] text-gray-400 font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 mt-3">
          {([
            { key: 'collection', label: `📦 Collection (${summary.total_in_collection})` },
            { key: 'wishlist', label: `💫 Wishlist (${summary.total_in_wishlist})` },
            { key: 'rated', label: `⭐ Rated` },
          ] as { key: TabFilter; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${tab === t.key ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search slimes…"
            className="w-full bg-pink-50 border border-pink-100 rounded-2xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder-gray-300"
          />
        </div>

        {/* Type filter chips */}
        <div className="flex gap-2 overflow-x-auto scroll-hide pb-1 mb-3">
          <button
            onClick={() => setTypeFilter('all')}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${typeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            All Types
          </button>
          {ALL_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`shrink-0 rounded-full transition-all ${typeFilter === t ? 'ring-2 ring-pink-400 ring-offset-1' : ''}`}
            >
              <TypeBadge type={t} size="sm" />
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(log => (
              <CollectionItemCard key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🫧</div>
            <p className="font-bold text-gray-400 text-sm">Nothing here yet</p>
            <p className="text-xs text-gray-300 mt-1">Log your first slime to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
