import { processCsvJob } from '../workers/csv.worker';

type QueueItem = {
  jobId: string;
  filePath: string;
};

const queue: QueueItem[] = [];
let isProcessing = false;

export const enqueueJob = (jobId: string, filePath: string) => {
  queue.push({ jobId, filePath });
  processQueue();
};

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const item = queue.shift()!;

  await processCsvJob(item.jobId, item.filePath);

  isProcessing = false;
  processQueue();
};
