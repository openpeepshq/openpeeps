import { uuidv7 } from 'uuidv7';

/**
 * Minimal observable for SSE fan-out:
 *   - `subscribe(fn)` returns an unsubscribe function and invokes `fn` once
 *     with the current value
 *   - `set(value)` replaces the current value and notifies subscribers
 */
const writable = <T>(initial: T) => {
  let value = initial;
  const listeners = new Set<(v: T) => void>();
  return {
    subscribe(fn: (v: T) => void) {
      listeners.add(fn);
      fn(value);
      return () => listeners.delete(fn);
    },
    set(next: T) {
      value = next;
      for (const fn of listeners) fn(value);
    },
  };
};

const ok = (value?: unknown) => ({ value, error: false });

const errorResult = (value: unknown) => {
  if (value instanceof Error) {
    return { value: null, error: value };
  }
  return { value: null, error: new Error(`${value}`) };
};

const createContext = () => ({ connected: false });

const createEmitter = <EventType, EventName extends string>({
  controller,
  context,
}: {
  controller: ReadableStreamDefaultController;
  context: { connected: boolean };
}) => {
  const encoder = new TextEncoder();

  return function emit(
    data: EventType | undefined,
    eventName: EventName | 'message' | 'ping' = 'message',
  ) {
    const id = uuidv7();
    if (!context.connected) {
      return errorResult('Client disconnected from the stream.');
    }
    const typeOfEventName = typeof eventName;
    if (typeOfEventName !== 'string') {
      return errorResult(
        `Event name must of type \`string\`, received \`${typeOfEventName}\`.`,
      );
    }
    if (eventName.includes('\n')) {
      return errorResult(
        `Event name must not contain new line characters, received "${eventName}".`,
      );
    }
    try {
      controller.enqueue(encoder.encode(`id: ${id}\nevent: ${eventName}\n`));
      const chunks = data ? JSON.stringify(data).split('\n') : '';
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${encodeURIComponent(chunk)}\n`),
        );
      }
      controller.enqueue(encoder.encode('\n'));
      return ok();
    } catch (e) {
      return errorResult(e);
    }
  };
};

export const produceStream = <
  EventType,
  EventName extends string &
    (string extends EventName ? never : unknown) = 'message',
>({
  start,
  onStopped = async () => undefined,
  ping = 30000,
}: {
  start: ({
    emit,
    stop,
  }: {
    emit: (data: EventType, name?: EventName) => void;
    stop: () => void;
  }) => Promise<void | (() => Promise<void> | void)>;
  onStopped?: () => Promise<void>;
  ping?: number;
}) => {
  const context = createContext();
  const active = writable(false);

  let started = false;

  return new ReadableStream({
    start: (controller) => {
      context.connected = true;

      const stop = () => {
        active.set(false);
      };
      const emit = createEmitter<EventType, EventName>({ controller, context });
      const onStoppedPromise = start({ emit, stop });

      const interval = setInterval(function run() {
        const { error } = emit(undefined, 'ping');
        if (error) {
          active.set(false);
        }
      }, ping);

      const stopLocal = async ({ $lock }: { $lock: boolean }) => {
        if (!started || $lock || !context.connected) {
          return false;
        }

        clearInterval(interval);

        try {
          controller.close();
        } catch {
          // Do nothing — the client has already disconnected without notice.
        }

        context.connected = false;

        if (onStopped) {
          await onStopped();
        }

        await onStoppedPromise.then(
          (onStopped) => onStopped && onStopped(),
        );

        return true;
      };

      const unsubscribe = active.subscribe(async ($lock) => {
        if (await stopLocal({ $lock })) {
          unsubscribe();
        }
      });
      started = true;
      active.set(true);
    },
    cancel: () => {
      active.set(false);
    },
  });
};
