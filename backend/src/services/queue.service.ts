import { processCsvJob } from '../workers/csv/csv.worker';

type QueueItem = {
  jobId: string;
  filePath: string;
};

const queue: QueueItem[] = [];
let isProcessing = false;

export const enqueueJob = (jobId: string, filePath: string): void => {
  queue.push({ jobId, filePath });
  void processQueue();
};

const processQueue = async (): Promise<void> => {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const item = queue.shift();
  if (!item) {
    isProcessing = false;
    return;
  }

  try {
    await processCsvJob(item.jobId, item.filePath);
  } catch (error) {
    console.error('[Queue] Job processing failed', {
      jobId: item.jobId,
      error,
    });
  } finally {
    isProcessing = false;
    void processQueue();
  }
};
