import { Job } from '../../models/job.model';
import { broadcast } from '../../ws/wsServer';

const WS_EVENT_JOB_UPDATED = 'JOB_UPDATED' as const;

type JobProgressUpdate = {
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  rowErrors?: unknown[];
};

export const updateJobStatus = async (
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> => {
  const job = await Job.findByIdAndUpdate(
    jobId,
    { status },
    { new: true }
  );
  if (!job) return;

  broadcast({ type: WS_EVENT_JOB_UPDATED, payload: job });
};

export const updateJobProgress = async (
  jobId: string,
  data: JobProgressUpdate
): Promise<void> => {
  const update: Record<string, unknown> = {
    totalRows: data.totalRows,
    processedRows: data.processedRows,
    successCount: data.successCount,
    failedCount: data.failedCount,
  };

  if (data.rowErrors && data.rowErrors.length > 0) {
    update.$push = { rowErrors: { $each: data.rowErrors } };
  }

  const job = await Job.findByIdAndUpdate(jobId, update, { new: true });
  if (!job) return;

  broadcast({ type: WS_EVENT_JOB_UPDATED, payload: job });
};

export const completeJob = async (jobId: string): Promise<void> => {
  const job = await Job.findByIdAndUpdate(
    jobId,
    { status: 'completed', completedAt: new Date() },
    { new: true }
  );
  if (!job) return;

  broadcast({ type: WS_EVENT_JOB_UPDATED, payload: job });
};

export const failJob = async (jobId: string): Promise<void> => {
  const job = await Job.findByIdAndUpdate(
    jobId,
    { status: 'failed' },
    { new: true }
  );
  if (!job) return;

  broadcast({ type: WS_EVENT_JOB_UPDATED, payload: job });
};
