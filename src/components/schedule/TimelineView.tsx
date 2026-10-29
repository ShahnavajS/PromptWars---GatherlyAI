'use client';

import { useState, useEffect } from 'react';

interface ScheduleItem {
  id: string;
  eventId: string;
  dayNumber: number;
  date: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ConflictPair {
  item1: ScheduleItem;
  item2: ScheduleItem;
  reason: string;
}

interface TimelineViewProps {
  eventId: string;
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

interface ScheduleFormData {
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  sortOrder: number;
}

interface ScheduleFormFieldsProps {
  form: ScheduleFormData;
  setForm: React.Dispatch<React.SetStateAction<ScheduleFormData>>;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
}

function ScheduleFormFields({ form, setForm, onSubmit, onCancel, saving }: ScheduleFormFieldsProps) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Activity title"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Day Number</label>
          <input
            type="number"
            min={1}
            max={30}
            value={form.dayNumber}
            onChange={(e) => setForm((f) => ({ ...f, dayNumber: parseInt(e.target.value, 10) || 1 }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Venue / location"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <input
            id="isAllDay"
            type="checkbox"
            checked={form.isAllDay}
            onChange={(e) => setForm((f) => ({ ...f, isAllDay: e.target.checked }))}
            className="h-4 w-4 rounded text-orange-600"
          />
          <label htmlFor="isAllDay" className="text-sm font-semibold text-slate-700">All Day</label>
        </div>
        {!form.isAllDay && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional notes about this activity"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Activity'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TimelineView({ eventId }: TimelineViewProps) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [form, setForm] = useState<ScheduleFormData>({
    dayNumber: 1,
    date: '',
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    location: '',
    sortOrder: 0,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshSchedule = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setConflicts(json.data.conflicts);
      }
    } catch {
      // quiet refresh
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchSchedule = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/schedule`);
        const json = await res.json();
        if (ignore) return;
        if (json.success) {
          setItems(json.data.items);
          setConflicts(json.data.conflicts);
        } else {
          setError(json.error || 'Failed to load schedule.');
        }
      } catch {
        if (!ignore) setError('Network error loading schedule.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchSchedule();
    return () => {
      ignore = true;
    };
  }, [eventId]);

  const resetForm = () => {
    setForm({
      dayNumber: 1,
      date: '',
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      isAllDay: false,
      location: '',
      sortOrder: 0,
    });
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.date) {
      alert('Title and Date are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          description: form.description || undefined,
          location: form.location || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await refreshSchedule();
        setShowAddForm(false);
        resetForm();
        showToast('Activity added to timeline!');
      } else {
        alert(json.error || 'Failed to add activity.');
      }
    } catch {
      alert('Error adding activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (itemId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/schedule/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          description: form.description || undefined,
          location: form.location || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await refreshSchedule();
        setEditingId(null);
        resetForm();
        showToast('Activity updated!');
      } else {
        alert(json.error || 'Failed to update.');
      }
    } catch {
      alert('Error updating activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this activity?')) return;
    try {
      const res = await fetch(`/api/events/${eventId}/schedule/${itemId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await refreshSchedule();
        showToast('Activity deleted.');
      } else {
        alert(json.error || 'Failed to delete.');
      }
    } catch {
      alert('Error deleting activity.');
    }
  };

  const startEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setForm({
      dayNumber: item.dayNumber,
      date: item.date,
      title: item.title,
      description: item.description || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      isAllDay: item.isAllDay,
      location: item.location || '',
      sortOrder: item.sortOrder,
    });
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 animate-pulse rounded-lg bg-amber-100 w-48" />
        <div className="h-64 animate-pulse rounded-2xl bg-amber-50/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-bold">Error loading timeline</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Group items by date
  const byDate = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const existing = byDate.get(item.date) ?? [];
    existing.push(item);
    byDate.set(item.date, existing);
  }

  const conflictIds = new Set<string>();
  conflicts.forEach((c) => {
    conflictIds.add(c.item1.id);
    conflictIds.add(c.item2.id);
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-amber-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Multi-Day Timeline</h2>
            <p className="text-xs text-slate-500">{items.length} activities scheduled</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              resetForm();
            }}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
          >
            + Add Activity
          </button>
        </div>

        {/* Conflict Warning Banner */}
        {conflicts.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-900">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold text-sm">
                  {conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''} Detected
                </p>
                <ul className="mt-1 space-y-1">
                  {conflicts.map((c, i) => (
                    <li key={i} className="text-xs text-amber-800">
                      • {c.item1.title} vs {c.item2.title}: {c.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3">New Activity</h3>
            <ScheduleFormFields
              form={form}
              setForm={setForm}
              saving={saving}
              onSubmit={handleAdd}
              onCancel={() => {
                setShowAddForm(false);
                resetForm();
              }}
            />
          </div>
        )}

        {/* Timeline by Date */}
        {byDate.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="font-bold text-slate-700">No activities yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Click &quot;Add Activity&quot; to start building your event timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(byDate.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dayItems]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white">
                      {formatDate(date)}
                    </div>
                    <div className="flex-1 h-px bg-amber-200" />
                    <span className="text-xs text-slate-500">{dayItems.length} activit{dayItems.length === 1 ? 'y' : 'ies'}</span>
                  </div>

                  <div className="space-y-3 pl-2">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-all ${conflictIds.has(item.id)
                            ? 'border-amber-400 bg-amber-50/60'
                            : 'border-slate-200 bg-white hover:border-amber-300'
                          }`}
                      >
                        {editingId === item.id ? (
                          <ScheduleFormFields
                            form={form}
                            setForm={setForm}
                            saving={saving}
                            onSubmit={() => handleUpdate(item.id)}
                            onCancel={() => {
                              setEditingId(null);
                              resetForm();
                            }}
                          />
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-700'}`}>
                                  {item.status}
                                </span>
                                {conflictIds.has(item.id) && (
                                  <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                    ⚠️ Conflict
                                  </span>
                                )}
                                {item.isAllDay && (
                                  <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                                    All Day
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                {item.startTime && (
                                  <span>🕐 {formatTime(item.startTime)}{item.endTime ? ` – ${formatTime(item.endTime)}` : ''}</span>
                                )}
                                {item.location && <span>📍 {item.location}</span>}
                              </div>
                              {item.description && (
                                <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => startEdit(item)}
                                className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

