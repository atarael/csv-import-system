import { Request, Response } from 'express';
import { createJob } from '../services/job.service';

export const uploadJob = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'CSV file is required' });
  }

  const job = await createJob(req.file);

  // ⬅️ קריטי: מחזירים מיד
  res.status(201).json({
    jobId: job._id,
  });
};
