import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { createJob } from '../services/job.service';
import { Job } from '../models/job.model';
import { AppError } from '../middleware/errorHandler';

export const uploadJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;

    if (!file) {
      throw new AppError('CSV file is required', 400);
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new AppError('Invalid file type', 400);
    }

    if (file.size === 0) {
      throw new AppError('File is empty', 400);
    }

    const job = await createJob(file);

    res.status(201).json({ jobId: job._id });
  } catch (error) {
    next(error);
  }
};

export const getJobs = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      throw new AppError('Invalid job id', 400);
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid job id', 400);
    }

    const job = await Job.findById(id);
    if (!job) {
      throw new AppError('Job not found', 404);
    }

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });

    res.json(job);
  } catch (error) {
    next(error);
  }
};

export const downloadErrorReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (typeof id !== 'string') {
      throw new AppError('Invalid job id', 400);
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid job id', 400);
    }

    const job = await Job.findById(id).lean();
    if (!job) {
      throw new AppError('Job not found', 404);
    }

    if (!job.rowErrors || job.rowErrors.length === 0) {
      throw new AppError('No errors for this job', 400);
    }

    const headers = [
      'rowNumber',
      'name',
      'email',
      'phone',
      'company',
      'error',
    ];

    const rows = job.rowErrors.map((err: any) => [
      err.rowNumber,
      err.rowData?.name ?? '',
      err.rowData?.email ?? '',
      err.rowData?.phone ?? '',
      err.rowData?.company ?? '',
      err.error ?? '',
    ]);

    const escape = (value: unknown) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv =
      `${headers.join(',')}\n` +
      rows.map(row => row.map(escape).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=job-${id}-error-report.csv`
    );

    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
