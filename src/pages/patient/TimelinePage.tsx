import { useState, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { Calendar, ArrowLeft, ArrowRight, FileText, Pill, FlaskConical, Stethoscope, Building2, Syringe, Activity } from 'lucide-react';
import { getTimelineEvents } from '@/services/documents';
import type { TimelineEvent, TimelineEventType } from '@/types';

interface TimelinePageProps {
  patientId: string;
  onComplete: () => void;
  onBack: () => void;
}

const EVENT_ICONS: Record<TimelineEventType, React.ReactNode> = {
  diagnosis: <Stethoscope className="w-4 h-4" />,
  surgery: <Activity className="w-4 h-4" />,
  hospitalization: <Building2 className="w-4 h-4" />,
  investigation: <FlaskConical className="w-4 h-4" />,
  prescription: <Pill className="w-4 h-4" />,
  consultation: <Stethoscope className="w-4 h-4" />,
  vaccination: <Syringe className="w-4 h-4" />,
  other: <FileText className="w-4 h-4" />,
};

const EVENT_COLORS: Record<TimelineEventType, string> = {
  diagnosis: 'bg-primary-100 text-primary-700',
  surgery: 'bg-error-100 text-error-700',
  hospitalization: 'bg-warning-100 text-warning-700',
  investigation: 'bg-secondary-100 text-secondary-700',
  prescription: 'bg-accent-100 text-accent-700',
  consultation: 'bg-neutral-100 text-neutral-700',
  vaccination: 'bg-success-100 text-success-700',
  other: 'bg-neutral-100 text-neutral-600',
};

export function TimelinePage({ patientId, onComplete, onBack }: TimelinePageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const evts = await getTimelineEvents(patientId);
        setEvents(evts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  // Group events by year
  const eventsByYear = events.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    const year = event.event_date ? new Date(event.event_date).getFullYear().toString() : 'Unknown Date';
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const sortedYears = Object.keys(eventsByYear).sort((a, b) => {
    if (a === 'Unknown Date') return 1;
    if (b === 'Unknown Date') return -1;
    return parseInt(b) - parseInt(a);
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-3">
              <Calendar className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">Your Medical Timeline</h1>
            <p className="text-sm text-neutral-500">A chronological view of your medical history</p>
          </div>

          {loading ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-neutral-500">Loading timeline...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="card p-8 text-center text-neutral-400 mb-6">
              <p className="text-sm">No timeline events yet. Complete your clinical history and upload documents to build your timeline.</p>
            </div>
          ) : (
            <div className="space-y-6 mb-6">
              {sortedYears.map((year) => (
                <div key={year} className="animate-slide-up">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xl font-bold text-neutral-900">{year}</h2>
                    <div className="flex-1 h-px bg-neutral-200" />
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-neutral-200">
                    {eventsByYear[year].map((event) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="card-hover p-4 cursor-pointer ml-4 relative"
                      >
                        <div className="absolute -left-[22px] top-5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${EVENT_COLORS[event.event_type]}`}>
                            {EVENT_ICONS[event.event_type]}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-neutral-900">{event.event_title}</h3>
                            {event.event_description && (
                              <p className="text-xs text-neutral-500 mt-0.5">{event.event_description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-neutral-400 capitalize">{event.event_type.replace('_', ' ')}</span>
                              <span className="text-xs text-neutral-400">•</span>
                              <span className="text-xs text-neutral-400">{event.source}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Event detail modal */}
          {selectedEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setSelectedEvent(null)}>
              <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${EVENT_COLORS[selectedEvent.event_type]}`}>
                  {EVENT_ICONS[selectedEvent.event_type]}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">{selectedEvent.event_title}</h3>
                {selectedEvent.event_date && (
                  <p className="text-sm text-neutral-500 mb-3">{new Date(selectedEvent.event_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                )}
                {selectedEvent.event_description && (
                  <p className="text-sm text-neutral-600 mb-3">{selectedEvent.event_description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-neutral-400 mb-4">
                  <span className="capitalize">{selectedEvent.event_type.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>Source: {selectedEvent.source}</span>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="btn-secondary w-full">Close</button>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button onClick={onComplete} className="btn-primary">
              Continue to Summary
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
