import { Request, Response } from 'express';
import { createJob } from '../services/job.service';
import { Job } from '../models/job.model';
import { Types } from 'mongoose';
import { sseClients } from '../sse/sseClients';

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

export const getJobs = async (_req: any, res: any) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.json(jobs);
};


export const getJobById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // 🛡️ הגנה ל-TypeScript
  if (Array.isArray(id)) {
    return res.status(400).json({ message: 'Invalid job id' });
  }

  // 🛡️ הגנה ל-Mongo
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid job id' });
  }

  const job = await Job.findById(id);

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  res.json(job);
};

export const streamJobs = (req: Request, res: Response) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.flushHeaders();

  // רושמים את הקליינט
  sseClients.add(res);

  // כשקליינט מתנתק – מנקים
  req.on('close', () => {
    sseClients.delete(res);
  });
};

export const downloadErrorReport = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

 if (Array.isArray(id)) {
    return res.status(400).json({ message: 'Invalid job id' });
  }
  
  // ✅ בדיקת ObjectId
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid job id' });
  }

  const job = await Job.findById(id).lean();

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  if (!job.rowErrors || job.rowErrors.length === 0) {
    return res.status(400).json({ message: 'No errors for this job' });
  }

  // ✅ כותרות CSV לפי הדרישה
  const headers = [
    'rowNumber',
    'name',
    'email',
    'phone',
    'company',
    'error',
  ];

  // ✅ בניית שורות CSV
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

  // ✅ החזרת קובץ להורדה
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=job-${id}-error-report.csv`
  );

  res.status(200).send(csv);
};



