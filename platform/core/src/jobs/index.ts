import { Processor, Queue, QueueOptions, Worker } from 'bullmq';

export const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const queues: Record<string, Queue> = {};

export const queueAndWorker = <Input, Output = undefined>(
  queueName: string,
  processor: Processor<Input, Output>,
  queueOptions?: Omit<QueueOptions, 'connection'>,
): [() => Queue, () => Worker] => [
    () => {
      if (!queues[queueName]) {
        queues[queueName] = new Queue<Input, Output>(queueName, {
          connection,
          ...queueOptions,
        });

        // Clean up existing jobs based on defaultJobOptions retention settings
        const defaultJobOptions = queueOptions?.defaultJobOptions;
        if (defaultJobOptions) {
          void (async () => {
            try {
              // Clean completed jobs if removeOnComplete has age setting
              if (
                defaultJobOptions.removeOnComplete &&
                typeof defaultJobOptions.removeOnComplete === 'object' &&
                'age' in defaultJobOptions.removeOnComplete &&
                typeof defaultJobOptions.removeOnComplete.age === 'number'
              ) {
                const ageMs =
                  defaultJobOptions.removeOnComplete.age * 1000;
                await queues[queueName].clean(
                  ageMs,
                  1000,
                  'completed',
                );
              }

              // Clean failed jobs if removeOnFail has age setting
              if (
                defaultJobOptions.removeOnFail &&
                typeof defaultJobOptions.removeOnFail === 'object' &&
                'age' in defaultJobOptions.removeOnFail &&
                typeof defaultJobOptions.removeOnFail.age === 'number'
              ) {
                const ageMs = defaultJobOptions.removeOnFail.age * 1000;
                await queues[queueName].clean(ageMs, 1000, 'failed');
              }
            } catch (error) {
              // Silently fail cleanup to not block queue initialization
              console.error(
                `Failed to clean old jobs for queue "${queueName}":`,
                error,
              );
            }
          })();
        }
      }
      return queues[queueName] as Queue;
    },
    () =>
      new Worker<Input, Output>(queueName, processor, {
        connection,
        concurrency: 5,
      }),
  ];

export { getJobDetail } from './jobDetail';
