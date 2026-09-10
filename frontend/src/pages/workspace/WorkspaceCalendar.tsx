import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  getCollabs,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  type Collab,
  type CalendarEvent,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/AppLayout';

const C = {
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  navy: '#1E2A78',
  navySoft: '#EEF1FF',
  coral: '#FF6B5A',
  coralSoft: '#FFF4F2',
};

const EVENT_TYPES = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'call', label: 'Call' },
  { value: 'posting_date', label: 'Posting Date' },
  { value: 'other', label: 'Other' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// YYYY-MM-DD in the *local* timezone (not UTC — toISOString() would shift
// evening events onto the wrong day for anyone west of UTC).
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function WorkspaceCalendar() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;
  const primarySoft = isBusiness ? C.navySoft : C.coralSoft;

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('collab');

  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // The actual month grid — this is the "calendar" part that was missing.
  // Defaults to today's month; navigable with the arrows in the header.
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    getCollabs()
      .then(setCollabs)
      .catch((err) => console.error('Could not load collaborations:', err));
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCalendarEvents(selectedId ? Number(selectedId) : undefined);
      setEvents(data);
    } catch (err) {
      console.error('Could not load calendar events:', err);
      setError('Could not load your calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Events keyed by day, for O(1) lookup while rendering grid cells.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = dateKey(new Date(e.event_date));
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  // 6 rows x 7 cols, starting the Sunday on/before the 1st of the month and
  // running through the Saturday on/after the last day, so every visible
  // cell is a real, fully-populated week.
  const gridDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - firstOfMonth.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewDate]);

  const today = new Date();
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goToMonth = (offset: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDay(null);
  };
  const goToToday = () => {
    setViewDate(new Date());
    setSelectedDay(new Date());
  };

  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return (eventsByDay.get(dateKey(selectedDay)) || []).sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [selectedDay, eventsByDay]);

  const upcoming = useMemo(() => {
    return events
      .filter((e) => new Date(e.event_date) >= today)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const handleDelete = async (eventId: number) => {
    try {
      await deleteCalendarEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error('Could not delete event:', err);
    }
  };

  return (
    <AppLayout title="Calendar" subtitle="Milestones and deadlines across your collaborations." showSearch={false} showNotifications={false}>
      <style>{`
        .wcal-content { padding: 28px 24px 40px; max-width: 980px; margin: 0 auto; }
        .wcal-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .wcal-tab { font-size: 12.5px; font-weight: 600; padding: 8px 16px; border-radius: 999px; border: 1px solid ${C.line}; background: ${C.card}; color: ${C.inkSoft}; cursor: pointer; }
        .wcal-tab--active { background: ${primary}; border-color: ${primary}; color: #fff; }
        .wcal-add { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; padding: 9px 16px; border-radius: 8px; border: none; background: ${primary}; color: #fff; cursor: pointer; }
        .wcal-add:disabled { opacity: 0.5; cursor: not-allowed; }

        .wcal-grid-card { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 16px; padding: 18px 20px 10px; margin-bottom: 24px; }
        .wcal-grid-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .wcal-grid-month { font-size: 15.5px; font-weight: 800; color: ${C.ink}; }
        .wcal-grid-nav { display: flex; align-items: center; gap: 6px; }
        .wcal-nav-btn { border: 1px solid ${C.line}; background: ${C.card}; color: ${C.inkSoft}; border-radius: 8px; padding: 6px; cursor: pointer; display: flex; }
        .wcal-nav-btn:hover { background: ${C.surface}; }
        .wcal-today-btn { font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid ${C.line}; background: ${C.card}; color: ${C.inkSoft}; cursor: pointer; margin-right: 4px; }
        .wcal-today-btn:hover { background: ${C.surface}; }

        .wcal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .wcal-weekday { text-align: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: ${C.inkFaint}; padding: 4px 0 8px; }

        .wcal-days { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: 1fr; gap: 4px; }
        .wcal-day {
          min-height: 68px; border-radius: 10px; padding: 6px 6px 8px; cursor: pointer;
          border: 1px solid transparent; display: flex; flex-direction: column; gap: 3px;
          background: ${C.card};
        }
        .wcal-day:hover { background: ${C.surface}; }
        .wcal-day--outside { opacity: 0.35; }
        .wcal-day--today .wcal-day-num { background: ${primary}; color: #fff; }
        .wcal-day--selected { border-color: ${primary}; background: ${primarySoft}; }
        .wcal-day-num { font-size: 12px; font-weight: 700; color: ${C.ink}; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 999px; }
        .wcal-day-dots { display: flex; flex-wrap: wrap; gap: 3px; }
        .wcal-day-dot { width: 6px; height: 6px; border-radius: 999px; background: ${primary}; }
        .wcal-day-more { font-size: 9.5px; font-weight: 700; color: ${C.inkFaint}; }

        .wcal-panel-title { font-size: 13px; font-weight: 700; color: ${C.ink}; margin: 0 0 10px; display: flex; align-items: center; justify-content: space-between; }
        .wcal-panel-clear { font-size: 11.5px; font-weight: 600; color: ${C.inkSoft}; background: none; border: none; cursor: pointer; }

        .wcal-card { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 14px; padding: 14px 18px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; }
        .wcal-date { width: 58px; text-align: center; flex-shrink: 0; }
        .wcal-date-day { font-size: 18px; font-weight: 800; color: ${primary}; }
        .wcal-date-month { font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${C.inkSoft}; }
        .wcal-main { flex: 1; }
        .wcal-title { font-size: 13.5px; font-weight: 700; color: ${C.ink}; }
        .wcal-sub { font-size: 12px; color: ${C.inkSoft}; margin-top: 2px; }
        .wcal-type { font-size: 10.5px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; background: ${primarySoft}; color: ${primary}; }
        .wcal-del { border: none; background: transparent; cursor: pointer; color: ${C.inkFaint}; padding: 4px; }
        .wcal-del:hover { color: #d64545; }

        .wcal-state { text-align: center; padding: 40px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .wcal-spin { animation: wcal-spin 0.8s linear infinite; }
        @keyframes wcal-spin { to { transform: rotate(360deg); } }

        .wcal-modal-backdrop { position: fixed; inset: 0; background: rgba(26,22,37,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .wcal-modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 420px; }
        .wcal-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .wcal-modal-head h3 { font-size: 16px; font-weight: 700; color: ${C.ink}; margin: 0; }
        .wcal-modal-close { border: none; background: transparent; cursor: pointer; color: ${C.inkSoft}; }
        .wcal-modal-label { font-size: 12.5px; font-weight: 600; color: ${C.ink}; margin: 12px 0 6px; display: block; }
        .wcal-modal select, .wcal-modal input, .wcal-modal textarea { width: 100%; border: 1px solid ${C.line}; border-radius: 8px; padding: 10px 12px; font: 13px/1.5 -apple-system, sans-serif; color: ${C.ink}; resize: vertical; }
        .wcal-modal-submit { width: 100%; margin-top: 16px; background: ${primary}; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
        .wcal-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .wcal-modal-error { font-size: 12px; color: #d64545; margin-top: 8px; }
      `}</style>

      <div className="wcal-content">
        <div className="wcal-tabs">
          <button className={`wcal-tab ${!selectedId ? 'wcal-tab--active' : ''}`} onClick={() => setSearchParams({})}>
            All
          </button>
          {collabs.map((c) => (
            <button
              key={c.id}
              className={`wcal-tab ${selectedId === String(c.id) ? 'wcal-tab--active' : ''}`}
              onClick={() => setSearchParams({ collab: String(c.id) })}
            >
              {c.campaign_title || `Campaign #${c.campaign_id}`}
            </button>
          ))}
          <button className="wcal-add" disabled={collabs.length === 0} onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add event
          </button>
        </div>

        {loading && <div className="wcal-state"><Loader2 size={18} className="wcal-spin" /></div>}
        {!loading && error && <div className="wcal-state">{error}</div>}

        {!loading && !error && (
          <>
            <div className="wcal-grid-card">
              <div className="wcal-grid-head">
                <div className="wcal-grid-month">{monthLabel}</div>
                <div className="wcal-grid-nav">
                  <button className="wcal-today-btn" onClick={goToToday}>Today</button>
                  <button className="wcal-nav-btn" onClick={() => goToMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
                  <button className="wcal-nav-btn" onClick={() => goToMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
                </div>
              </div>

              <div className="wcal-weekdays">
                {WEEKDAY_LABELS.map((w) => <div className="wcal-weekday" key={w}>{w}</div>)}
              </div>

              <div className="wcal-days">
                {gridDays.map((d) => {
                  const key = dateKey(d);
                  const dayItems = eventsByDay.get(key) || [];
                  const isOutside = d.getMonth() !== viewDate.getMonth();
                  const isToday = isSameDay(d, today);
                  const isSelected = selectedDay ? isSameDay(d, selectedDay) : false;
                  const shownDots = dayItems.slice(0, 4);

                  return (
                    <div
                      key={key}
                      className={[
                        'wcal-day',
                        isOutside ? 'wcal-day--outside' : '',
                        isToday ? 'wcal-day--today' : '',
                        isSelected ? 'wcal-day--selected' : '',
                      ].join(' ').trim()}
                      onClick={() => setSelectedDay(isSelected ? null : d)}
                    >
                      <div className="wcal-day-num">{d.getDate()}</div>
                      {shownDots.length > 0 && (
                        <div className="wcal-day-dots">
                          {shownDots.map((e) => <span className="wcal-day-dot" key={e.id} />)}
                          {dayItems.length > shownDots.length && (
                            <span className="wcal-day-more">+{dayItems.length - shownDots.length}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDay ? (
              <>
                <div className="wcal-panel-title">
                  {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  <button className="wcal-panel-clear" onClick={() => setSelectedDay(null)}>Show upcoming instead</button>
                </div>
                {dayEvents.length === 0 && <div className="wcal-state">Nothing scheduled this day.</div>}
                {dayEvents.map((e) => <EventCard key={e.id} event={e} onDelete={handleDelete} primary={primarySoft} />)}
              </>
            ) : (
              <>
                <div className="wcal-panel-title">Upcoming</div>
                {upcoming.length === 0 && <div className="wcal-state">Nothing on the calendar yet. Click a day above to add something.</div>}
                {upcoming.map((e) => <EventCard key={e.id} event={e} onDelete={handleDelete} primary={primarySoft} />)}
              </>
            )}
          </>
        )}
      </div>

      {showForm && (
        <AddEventModal
          collabs={collabs}
          defaultCollabId={selectedId || undefined}
          initialDate={selectedDay || undefined}
          onClose={() => setShowForm(false)}
          onCreated={(event) => {
            setEvents((prev) => [...prev, event]);
            setShowForm(false);
          }}
        />
      )}
    </AppLayout>
  );
}

function EventCard({ event, onDelete, primary }: { event: CalendarEvent; onDelete: (id: number) => void; primary: string }) {
  const date = new Date(event.event_date);
  return (
    <div className="wcal-card">
      <div className="wcal-date">
        <div className="wcal-date-day">{date.getDate()}</div>
        <div className="wcal-date-month">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
      </div>
      <div className="wcal-main">
        <div className="wcal-title">{event.title}</div>
        <div className="wcal-sub">
          {event.campaign_title} {event.other_party_name ? `· with ${event.other_party_name}` : ''}
          {event.description ? ` · ${event.description}` : ''}
        </div>
      </div>
      <span className="wcal-type" style={{ background: primary }}>{event.event_type.replace('_', ' ')}</span>
      <button className="wcal-del" onClick={() => onDelete(event.id)} aria-label="Delete event"><Trash2 size={15} /></button>
    </div>
  );
}

function AddEventModal({
  collabs,
  defaultCollabId,
  initialDate,
  onClose,
  onCreated,
}: {
  collabs: Collab[];
  defaultCollabId?: string;
  initialDate?: Date;
  onClose: () => void;
  onCreated: (event: CalendarEvent) => void;
}) {
  const [collabId, setCollabId] = useState(defaultCollabId || String(collabs[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Pre-fill from whatever day the person clicked on the grid, defaulting
  // to 9am local so the datetime-local input isn't just a bare date.
  const [eventDate, setEventDate] = useState(() => {
    if (!initialDate) return '';
    const d = new Date(initialDate);
    d.setHours(9, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [eventType, setEventType] = useState('milestone');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!collabId || !title.trim() || !eventDate) {
      setError('Please fill in the campaign, title, and date.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const event = await createCalendarEvent({
        collab_id: Number(collabId),
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: new Date(eventDate).toISOString(),
        event_type: eventType,
      });
      onCreated(event);
    } catch (err: any) {
      console.error('Could not create event:', err);
      setError(err?.response?.data?.detail || 'Could not create this event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wcal-modal-backdrop" onClick={onClose}>
      <div className="wcal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wcal-modal-head">
          <h3>Add calendar event</h3>
          <button className="wcal-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <label className="wcal-modal-label" htmlFor="wcal-collab">Collaboration</label>
        <select id="wcal-collab" value={collabId} onChange={(e) => setCollabId(e.target.value)}>
          {collabs.map((c) => (
            <option key={c.id} value={c.id}>{c.campaign_title || `Campaign #${c.campaign_id}`}</option>
          ))}
        </select>

        <label className="wcal-modal-label" htmlFor="wcal-title">Title</label>
        <input id="wcal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Content due for review" />

        <label className="wcal-modal-label" htmlFor="wcal-type">Type</label>
        <select id="wcal-type" value={eventType} onChange={(e) => setEventType(e.target.value)}>
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <label className="wcal-modal-label" htmlFor="wcal-date">Date</label>
        <input id="wcal-date" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />

        <label className="wcal-modal-label" htmlFor="wcal-desc">Notes (optional)</label>
        <textarea id="wcal-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />

        {error && <div className="wcal-modal-error">{error}</div>}

        <button className="wcal-modal-submit" disabled={submitting} onClick={handleSubmit}>
          {submitting ? <Loader2 size={15} className="wcal-spin" /> : 'Add to calendar'}
        </button>
      </div>
    </div>
  );
}

export default WorkspaceCalendar;
