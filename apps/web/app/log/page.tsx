'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RatingInput } from '@/components/RatingInput';
import { TypeBadge } from '@/components/TypeBadge';
import {
  SlimeType,
  SLIME_TYPE_LABELS,
  RATING_DIMENSIONS,
  NewLogFormData,
} from '@/lib/types';

const ALL_TYPES = Object.keys(SLIME_TYPE_LABELS) as SlimeType[];

const EMPTY_FORM: NewLogFormData = {
  slime_name: '',
  brand_name_raw: '',
  slime_type: '',
  rating_texture: 0,
  rating_scent: 0,
  rating_sound: 0,
  rating_drizzle: 0,
  rating_creativity: 0,
  rating_sensory_fit: 0,
  rating_overall: 0,
  notes: '',
  in_collection: true,
  in_wishlist: false,
};

type Step = 'type' | 'info' | 'rate' | 'notes';

export default function LogPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('type');
  const [form, setForm] = useState<NewLogFormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const setRating = (key: keyof NewLogFormData, val: number) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const canAdvanceType = form.slime_type !== '';
  const canAdvanceInfo = form.slime_name.trim() !== '' && form.brand_name_raw.trim() !== '';
  const canAdvanceRate = form.rating_overall > 0;

  const handleSubmit = () => {
    // TODO: write to Supabase
    console.log('Logging slime:', form);
    setSubmitted(true);
    setTimeout(() => router.push('/collection'), 1800);
  };

  const STEPS: Step[] = ['type', 'info', 'rate', 'notes'];
  const stepIdx = STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="text-7xl animate-bounce">🫧</div>
        <h2 className="text-2xl font-black gradient-text">Slime Logged!</h2>
        <p className="text-gray-500 text-sm">
          <span className="font-bold text-gray-700">{form.slime_name}</span> has been added to your collection.
        </p>
        <div className="w-8 h-1 bg-pink-200 rounded-full mt-2">
          <div className="h-full bg-pink-400 rounded-full animate-[grow_1.8s_linear_forwards]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'type') router.back();
              else setStep(STEPS[stepIdx - 1]);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-black text-lg text-gray-900">Log a Slime</h1>
            <p className="text-xs text-gray-400">
              Step {stepIdx + 1} of {STEPS.length} · {
                { type: 'Pick a type', info: 'Name & brand', rate: 'Rate it', notes: 'Add notes' }[step]
              }
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-pink-50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">

        {/* ── Step 1: Type ──────────────────────────────── */}
        {step === 'type' && (
          <div className="pt-4">
            <p className="text-sm font-bold text-gray-500 mb-4">What type of slime is this?</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map(type => {
                const selected = form.slime_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, slime_type: type }))}
                    className={`transition-all active:scale-95 rounded-full ${selected ? 'ring-2 ring-pink-400 ring-offset-2 scale-105' : ''}`}
                  >
                    <TypeBadge type={type} size="lg" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Info ──────────────────────────────── */}
        {step === 'info' && (
          <div className="pt-4 space-y-4">
            {form.slime_type && (
              <div className="flex items-center gap-2 mb-2">
                <TypeBadge type={form.slime_type as SlimeType} size="md" />
                <button
                  onClick={() => setStep('type')}
                  className="text-xs text-pink-400 font-semibold underline"
                >
                  change
                </button>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Slime Name *
              </label>
              <input
                type="text"
                value={form.slime_name}
                onChange={e => setForm(prev => ({ ...prev, slime_name: e.target.value }))}
                placeholder="e.g. Strawberry Shortcake"
                className="w-full bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-800 placeholder-gray-300 focus:border-pink-300 focus:bg-white transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Brand *
              </label>
              <input
                type="text"
                value={form.brand_name_raw}
                onChange={e => setForm(prev => ({ ...prev, brand_name_raw: e.target.value }))}
                placeholder="e.g. Peachybbies, Crafted Slimes…"
                className="w-full bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-800 placeholder-gray-300 focus:border-pink-300 focus:bg-white transition-colors"
              />
            </div>

            {/* Status toggles */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Status
              </label>
              <div className="flex gap-3">
                {[
                  { key: 'in_collection', emoji: '📦', label: 'I own it' },
                  { key: 'in_wishlist', emoji: '💫', label: 'On my wishlist' },
                ].map(({ key, emoji, label }) => {
                  const active = form[key as 'in_collection' | 'in_wishlist'];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          [key]: !prev[key as 'in_collection' | 'in_wishlist'],
                        }))
                      }
                      className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        active
                          ? 'border-pink-400 bg-pink-50 text-pink-700'
                          : 'border-gray-100 bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="text-xs font-bold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Rate ──────────────────────────────── */}
        {step === 'rate' && (
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-bold text-gray-700">Rate</p>
              <span className="font-black text-gray-900">{form.slime_name}</span>
            </div>

            <div className="bg-white rounded-2xl border border-pink-50 overflow-hidden">
              {RATING_DIMENSIONS.map(dim => (
                <RatingInput
                  key={dim.key}
                  value={form[`rating_${dim.key}` as keyof NewLogFormData] as number}
                  onChange={val => setRating(`rating_${dim.key}` as keyof NewLogFormData, val)}
                  label={dim.label}
                  emoji={dim.emoji}
                  description={dim.description}
                />
              ))}
            </div>

            {/* Quick fill helper */}
            <button
              type="button"
              onClick={() =>
                setForm(prev => ({
                  ...prev,
                  rating_texture: 5,
                  rating_scent: 5,
                  rating_sound: 5,
                  rating_drizzle: 5,
                  rating_creativity: 5,
                  rating_sensory_fit: 5,
                  rating_overall: 5,
                }))
              }
              className="mt-3 w-full text-xs font-bold text-purple-400 py-2 hover:text-purple-600 transition-colors"
            >
              ✨ Rate all 5 stars
            </button>
          </div>
        )}

        {/* ── Step 4: Notes ─────────────────────────────── */}
        {step === 'notes' && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-2xl">
              <div className="text-3xl">🫧</div>
              <div>
                <p className="font-black text-gray-800 text-sm">{form.slime_name}</p>
                <p className="text-xs text-gray-400">{form.brand_name_raw}</p>
                <p className="text-xs text-pink-500 font-bold mt-0.5">
                  Overall: {form.rating_overall}/5 ⭐
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Your Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="How's the activation? Scent throw? Click or crunch? ASMR potential? First impressions…"
                rows={5}
                className="w-full bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3.5 text-sm text-gray-800 placeholder-gray-300 focus:border-pink-300 focus:bg-white transition-colors resize-none leading-relaxed"
                autoFocus
              />
              <p className="text-xs text-gray-300 mt-1 text-right">
                {form.notes.length}/500
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-white border border-pink-100 rounded-2xl p-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Rating summary</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {RATING_DIMENSIONS.map(dim => {
                  const val = form[`rating_${dim.key}` as keyof NewLogFormData] as number;
                  return val > 0 ? (
                    <div key={dim.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{dim.emoji} {dim.label}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={`text-xs ${s <= val ? 'text-pink-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="px-4 pb-6 pt-2 bg-white border-t border-pink-50">
        {step !== 'notes' ? (
          <button
            type="button"
            onClick={() => setStep(STEPS[stepIdx + 1])}
            disabled={
              (step === 'type' && !canAdvanceType) ||
              (step === 'info' && !canAdvanceInfo)
            }
            className="w-full py-4 rounded-2xl font-black text-base text-white bg-gradient-to-r from-pink-400 to-purple-500 shadow-lg shadow-pink-100 active:scale-[0.97] transition-all disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
          >
            {step === 'rate' ? 'Add Notes →' : 'Continue →'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl font-black text-base text-white bg-gradient-to-r from-pink-400 to-purple-500 shadow-lg shadow-pink-100 active:scale-[0.97] transition-all"
          >
            🫧 Log This Slime
          </button>
        )}

        {step === 'rate' && (
          <button
            type="button"
            onClick={() => setStep('notes')}
            className="w-full py-3 text-xs font-semibold text-gray-400 mt-1"
          >
            Skip ratings for now
          </button>
        )}
      </div>
    </div>
  );
}
