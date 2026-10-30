'use client';

import { useState, useEffect } from 'react';

const CULTURAL_PRESETS = {
  GUJARATI: {
    label: 'Gujarati Wedding',
    traditions: ['Garba & Dandiya Raas', 'Mehendi', 'Sangeet', 'Haldi', 'Vidai'],
    dietary: 'PURE_VEG',
    decor: 'Marigold flowers, vibrant orange and yellow, traditional mandap',
    entertainment: 'Garba night, folk music, dhol players',
  },
  PUNJABI: {
    label: 'Punjabi Wedding',
    traditions: ['Roka', 'Chunni Chadai', 'Sangeet', 'Mehendi', 'Chooda', 'Baraat'],
    dietary: 'MIXED',
    decor: 'Red and gold, phoolon ki chaddar, kaliras',
    entertainment: 'Bhangra, live dhol, Bollywood DJ',
  },
  SOUTH_INDIAN: {
    label: 'South Indian Wedding',
    traditions: ['Naandi', 'Nischitartham', 'Muhurtham', 'Saptapadi', 'Aashirvad'],
    dietary: 'PURE_VEG',
    decor: 'Jasmine flowers, banana leaves, kolam rangoli',
    entertainment: 'Carnatic music, nadaswaram, traditional dance',
  },
  BENGALI: {
    label: 'Bengali Wedding',
    traditions: ['Aiburo Bhaat', 'Gaye Holud', 'Shubho Drishti', 'Sampradaan'],
    dietary: 'MIXED',
    decor: 'White and red, shankha pola, dhak music',
    entertainment: 'Rabindra Sangeet, folk music',
  },
  MODERN: {
    label: 'Modern/Contemporary',
    traditions: [],
    dietary: 'MIXED',
    decor: 'Elegant, minimalist, fairy lights',
    entertainment: 'DJ, live band, photo booth',
  },
  COMMUNITY: {
    label: 'Community Event',
    traditions: [],
    dietary: 'MIXED',
    decor: 'Colorful, festive banners',
    entertainment: 'Cultural performances, games',
  },
} as const;

type PresetKey = keyof typeof CULTURAL_PRESETS;
type DietaryOption = 'PURE_VEG' | 'JAIN_AVAILABLE' | 'VEGAN' | 'HALAL' | 'MIXED';

const PRESET_EMOJIS: Record<PresetKey, string> = {
  GUJARATI: '💍',
  PUNJABI: '🥁',
  SOUTH_INDIAN: '🌸',
  BENGALI: '🎨',
  MODERN: '✨',
  COMMUNITY: '🤝',
};

const DIETARY_LABELS: Record<DietaryOption, string> = {
  PURE_VEG: '🌿 Pure Vegetarian',
  JAIN_AVAILABLE: '🙏 Jain Available',
  VEGAN: '🌱 Vegan',
  HALAL: '🌙 Halal',
  MIXED: '🍽️ Mixed',
};

interface Preferences {
  id: string;
  eventId: string;
  culturalPreset: string;
  dietaryPreference: string;
  accessibilityNotes: string | null;
  decorStyle: string | null;
  entertainmentStyle: string | null;
  venueCapacityMax: number | null;
  customTraditionsJson?: string | null;
  updatedAt?: string | null;
}

interface CulturalPreferencesPanelProps {
  eventId: string;
}

export default function CulturalPreferencesPanel({ eventId }: CulturalPreferencesPanelProps) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable state (not auto-saved)
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | ''>('');
  const [dietaryPref, setDietaryPref] = useState<DietaryOption>('MIXED');
  const [accessibilityNotes, setAccessibilityNotes] = useState('');
  const [decorStyle, setDecorStyle] = useState('');
  const [entertainmentStyle, setEntertainmentStyle] = useState('');
  const [customTraditions, setCustomTraditions] = useState<string[]>([]);
  const [newTraditionInput, setNewTraditionInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let ignore = false;
    fetch(`/api/events/${eventId}/preferences`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.success && json.data.preferences) {
          const prefs = json.data.preferences as Preferences;
          setPreferences(prefs);
          setSelectedPreset((prefs.culturalPreset as PresetKey) || '');
          setDietaryPref((prefs.dietaryPreference as DietaryOption) || 'MIXED');
          setAccessibilityNotes(prefs.accessibilityNotes || '');
          setDecorStyle(prefs.decorStyle || '');
          setEntertainmentStyle(prefs.entertainmentStyle || '');
          if (prefs.customTraditionsJson) {
            try {
              const parsed = JSON.parse(prefs.customTraditionsJson);
              if (Array.isArray(parsed)) setCustomTraditions(parsed);
            } catch {
              // ignore parse error
            }
          }
        }
      })
      .catch(() => {
        if (!ignore) setError('Failed to load preferences.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [eventId]);

  const handleApplyPreset = (key: PresetKey) => {
    setSelectedPreset(key);
    const preset = CULTURAL_PRESETS[key];
    setDietaryPref(preset.dietary as DietaryOption);
    setDecorStyle(preset.decor);
    setEntertainmentStyle(preset.entertainment);
  };

  const handleAddTradition = () => {
    const trimmed = newTraditionInput.trim();
    if (trimmed && !customTraditions.includes(trimmed)) {
      setCustomTraditions([...customTraditions, trimmed]);
      setNewTraditionInput('');
    }
  };

  const handleRemoveTradition = (tag: string) => {
    setCustomTraditions(customTraditions.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          culturalPreset: selectedPreset || undefined,
          dietaryPreference: dietaryPref,
          accessibilityNotes: accessibilityNotes || null,
          decorStyle: decorStyle || null,
          entertainmentStyle: entertainmentStyle || null,
          customTraditions,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPreferences(json.data);
        showToast('Preferences saved!');
      } else {
        setError(json.error || 'Failed to save preferences.');
      }
    } catch {
      setError('Network error saving preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 animate-pulse rounded-lg bg-amber-100 w-48" />
        <div className="h-64 animate-pulse rounded-2xl bg-amber-50/50" />
      </div>
    );
  }

  const currentPreset = selectedPreset ? CULTURAL_PRESETS[selectedPreset] : null;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="surface-card p-6">
        <div className="border-b border-amber-100 pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900">Cultural Preferences</h2>
          <p className="text-xs text-slate-500">
            Personalize your event with cultural traditions, dietary options, and style preferences.
            These settings enhance AI plan generation.
          </p>
        </div>

        {/* Current Preset Display */}
        {currentPreset && (
          <div className="mb-6 rounded-2xl border border-[#d5e1d3] bg-[#e8efe5]/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{PRESET_EMOJIS[selectedPreset as PresetKey]}</span>
              <span className="font-bold text-[#263b34]">{currentPreset.label}</span>
            </div>
            {currentPreset.traditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentPreset.traditions.map((t) => (
                  <span key={t} className="rounded-full bg-white border border-[#d5e1d3] px-2.5 py-0.5 text-xs font-semibold text-[#285942]">
                    🪔 {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preset Selector Grid */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-800 mb-3">Cultural Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(CULTURAL_PRESETS) as PresetKey[]).map((key) => {
              const preset = CULTURAL_PRESETS[key];
              const isSelected = selectedPreset === key;
              return (
                <button
                  key={key}
                  onClick={() => handleApplyPreset(key)}
                  className={`rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-[#285942] bg-[#e8efe5]'
                      : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-lg">{PRESET_EMOJIS[key]}</span>
                    <span className="font-bold text-slate-900 text-sm">{preset.label}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {preset.dietary === 'PURE_VEG' ? '🌿 Pure Veg' : '🍽️ Mixed'}
                  </div>
                  {preset.traditions.length > 0 && (
                    <div className="mt-1 text-xs text-slate-600 line-clamp-1">
                      {preset.traditions.slice(0, 2).join(', ')}{preset.traditions.length > 2 ? '...' : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary Preference */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-800 mb-2">Dietary Preference</label>
          <select
            aria-label="Dietary preference"
            value={dietaryPref}
            onChange={(e) => setDietaryPref(e.target.value as DietaryOption)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          >
            {(Object.entries(DIETARY_LABELS) as [DietaryOption, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Decor Notes */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-800 mb-1">Decor Style</label>
          <input
            aria-label="Decor style"
            type="text"
            value={decorStyle}
            onChange={(e) => setDecorStyle(e.target.value)}
            placeholder="e.g. Marigold flowers, vibrant colors, traditional mandap"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>

        {/* Entertainment Notes */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-800 mb-1">Entertainment Style</label>
          <input
            aria-label="Entertainment style"
            type="text"
            value={entertainmentStyle}
            onChange={(e) => setEntertainmentStyle(e.target.value)}
            placeholder="e.g. Garba night, folk music, dhol players"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>

        {/* Accessibility Notes */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-800 mb-1">Accessibility Notes</label>
          <textarea
            aria-label="Accessibility notes"
            rows={3}
            value={accessibilityNotes}
            onChange={(e) => setAccessibilityNotes(e.target.value)}
            placeholder="e.g. Wheelchair access required, ground floor seating for elderly, hearing assistance needed"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
          />
        </div>

        {/* Custom Traditions & Family Rituals */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Custom Traditions & Family Rituals
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Add specific cultural rituals, family ceremonies, or regional customs to reflect in your plan.
          </p>
          <div className="flex gap-2 mb-2">
            <input
              aria-label="Add a custom tradition"
              type="text"
              value={newTraditionInput}
              onChange={(e) => setNewTraditionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTradition();
                }
              }}
              placeholder="e.g. Ganesh Sthapan, Hastamelap, Cake Cutting"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285942]"
            />
            <button
              type="button"
              onClick={handleAddTradition}
              className="rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200"
            >
              + Add
            </button>
          </div>
          {customTraditions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {customTraditions.map((tradition) => (
                <span
                  key={tradition}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                >
                  🪔 {tradition}
                  <button
                    type="button"
                    onClick={() => handleRemoveTradition(tradition)}
                    aria-label={`Remove tradition ${tradition}`}
                    className="ml-1 text-amber-700 hover:text-red-700 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#285942] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1e4734] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          {preferences && preferences.updatedAt && (
            <span className="text-xs text-slate-500">
              Last saved: {new Date(preferences.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs text-amber-800">
          <span className="font-bold">Made for your event:</span> These preferences help shape future plan suggestions.
        </div>
      </div>
    </div>
  );
}

