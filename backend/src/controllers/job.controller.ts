import { Request, Response } from 'express';
import { createJob } from '../services/job.service';
import { Job } from '../models/job.model';
import { Types } from 'mongoose';

/* ======================
   📤 Upload CSV → Create Job
   ====================== */
export const uploadJob = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'CSV file is required' });
  }

  const job = await createJob(req.file);

  // ⬅️ מחזירים מיד, העיבוד קורה ברקע
  res.status(201).json({
    jobId: job._id,
  });
};

/* ======================
   📋 Get All Jobs
   ====================== */
export const getJobs = async (_req: Request, res: Response) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.json(jobs);
};

/* ======================
   🔍 Get Job By ID
   ====================== */
export const getJobById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // 🛡️ הגנות
  if (Array.isArray(id) || !Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid job id' });
  }

  const job = await Job.findById(id);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  // ❌ בלי cache – תמיד state עדכני
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  res.json(job);
};

/* ======================
   📥 Download Error Report (CSV)
   ====================== */
export const downloadErrorReport = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  if (Array.isArray(id) || !Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid job id' });
  }

  const job = await Job.findById(id).lean();
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  if (!job.rowErrors || job.rowErrors.length === 0) {
    return res.status(400).json({ message: 'No errors for this job' });
  }

  // כותרות CSV
  const headers = [
    'rowNumber',
    'name',
    'email',
    'phone',
    'company',
    'error',
  ];

  // שורות CSV
  const rows = job.rowErrors.map((err: any) => [
    err.rowNumber,
    err.rowData?.name ?? '',
    err.rowData?.email ?? '',
    err.rowData?.phone ?? '',
    err.rowData?.company ?? '',
    err.error ?? '',
  ]);

  const escape = (value: any) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const csv =
    headers.join(',') +
    '\n' +
    rows.map(row => row.map(escape).join(',')).join('\n');

  // החזרת קובץ להורדה
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=job-${id}-error-report.csv`
  );

  res.status(200).send(csv);
};
