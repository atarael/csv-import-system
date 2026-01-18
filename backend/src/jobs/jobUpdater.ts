import { Job } from '../models/job.model';
import { publishJobEvent } from '../ws/wsPublisher';

export const updateJobAndPublish = async (
  jobId: string,
  update: any
) => {
  const job = await Job.findByIdAndUpdate(jobId, update, { new: true });
  if (!job) return;

  publishJobEvent({
    type: 'JOB_UPDATE',
    payload: job,
  });
};
