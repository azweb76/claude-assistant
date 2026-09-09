import { useEffect, useRef, useState } from 'react';
import { streamEventSchema, type StreamEvent } from '@claude-assistant/shared';

export type EventStreamState = {
  events: StreamEvent[];
  status: string | null;
  error: string | null;
  done: boolean;
};

export function useEventStream(url: string | null): EventStreamState {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }
    setEvents([]);
    setStatus(null);
    setError(null);
    setDone(false);

    const source = new EventSource(url);
    sourceRef.current = source;

    const onEvent = (type: StreamEvent['type']) => (raw: MessageEvent) => {
      try {
        const data = JSON.parse(String(raw.data));
        const parsed = streamEventSchema.parse({ type, data });
        setEvents((prev) => [...prev, parsed]);
        if (parsed.type === 'status') {
          setStatus(parsed.data.status);
          if (['succeeded', 'failed', 'canceled', 'done'].includes(parsed.data.status)) {
            setDone(true);
            source.close();
          }
        }
        if (parsed.type === 'error') {
          setError(parsed.data.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    for (const type of ['message', 'usage', 'status', 'error', 'heartbeat'] as const) {
      source.addEventListener(type, onEvent(type));
    }

    source.onerror = () => {
      setError('Event stream connection error');
      setDone(true);
      source.close();
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [url]);

  return { events, status, error, done };
}
