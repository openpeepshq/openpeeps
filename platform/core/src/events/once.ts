import { queueAndWorker } from '../jobs';

export const registeredHandlers = new Map<
  string,
  ((...args: unknown[]) => unknown)[]
>();

export const registerOnceHandler = (
  qualifiedEventType: string,
  handler: (...args: unknown[]) => unknown,
) => {
  if (registeredHandlers.has(qualifiedEventType)) {
    registeredHandlers.get(qualifiedEventType)?.push(handler);
  } else {
    registeredHandlers.set(qualifiedEventType, [handler]);
  }
};

const [onceQueue, onceWorker] = queueAndWorker<unknown[], unknown[]>(
  'once',
  async (job) => {
    const event = job.name;
    const args = job.data;
    return Promise.all(
      (registeredHandlers.get(event) ?? []).map((handler) => handler(...args)),
    );
  },
  {
    defaultJobOptions: {
      removeOnComplete: { age: 3600 }, // Remove successful tasks after 1 hour
      removeOnFail: { age: 2592000 }, // Remove failed tasks after 1 month (30 days)
    },
  },
);
export { onceQueue, onceWorker };
