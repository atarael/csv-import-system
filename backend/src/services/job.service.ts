import { Job } from '../models/job.model';
import { broadcast } from '../ws/wsServer';
import { enqueueJob } from './queue.service';
import { Express } from 'express';
import { AppError } from '../middleware/errorHandler';

const WS_EVENT_JOB_UPDATED = 'JOB_UPDATED' as const;

export const createJob = async (
  file: Express.Multer.File
) => {
  if (!file.path) {
    throw new AppError('Invalid uploaded file', 400);
  }

  const job = await Job.create({
    filename: file.originalname,
    status: 'pending',
  });

  broadcast({
    type: WS_EVENT_JOB_UPDATED,
    payload: job,
  });

  enqueueJob(job._id.toString(), file.path);

  return job;
};
