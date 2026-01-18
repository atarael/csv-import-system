import { Job } from '../models/job.model';
import { broadcast } from '../ws/wsServer';
import { enqueueJob } from './queue.service';
import { Express } from 'express';

export const createJob = async (file: Express.Multer.File) => {
  const job = await Job.create({
    filename: file.originalname,
    status: 'pending',
  });
  
  broadcast({
    type: 'JOB_UPDATED',
    payload: job,
  });
  
  enqueueJob(job._id.toString(), file.path);

  return job;
};
