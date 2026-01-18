import fs from 'fs';
import csv from 'csv-parser';
import { Types } from 'mongoose';

import { Job } from '../models/job.model';
import { Customer } from '../models/customer.model';
import { validateCustomer } from '../utils/validateCustomer';
import { broadcast } from '../ws/wsServer';

/* =========================
   Configuration
   ========================= */
const JOB_BATCH_SIZE = 50;
const CONSUMER_BATCH_SIZE = 50;

/* =========================
   Job updater & notifier
   Single source of truth
   ========================= */
const updateAndBroadcastJob = async (
  jobId: string,
  update: any
) => {
  const job = await Job.findByIdAndUpdate(jobId, update, { new: true });
  if (!job) return;

  broadcast({
    type: 'JOB_UPDATED',
    payload: job,
  });
};

/* =========================
   CSV processing worker
   ========================= */
export const processCsvJob = async (
  jobId: string,
  filePath: string
): Promise<void> => {
  console.log(`Starting CSV processing for job ${jobId}`);

  await updateAndBroadcastJob(jobId, { status: 'processing' });

  let rowNumber = 0;
  let totalRows = 0;
  let processedRows = 0;
  let successCount = 0;
  let failedCount = 0;
  let sinceLastJobFlush = 0;

  /* --- buffers --- */
  let rowErrors: any[] = [];
  let consumerBatch: {
    rowNumber: number;
    doc: any;
  }[] = [];

  /* =================
     Flush job progress
     ================= */
  const flushJob = async () => {
    if (sinceLastJobFlush === 0 && rowErrors.length === 0) return;

    await updateAndBroadcastJob(jobId, {
      totalRows,
      processedRows,
      successCount,
      failedCount,
      ...(rowErrors.length > 0
        ? { $push: { rowErrors: { $each: rowErrors.splice(0) } } }
        : {}),
    });

    sinceLastJobFlush = 0;
  };

  /* =====================
     Flush consumers batch
     ===================== */
  const flushConsumers = async () => {
    if (consumerBatch.length === 0) return;

    const ops = consumerBatch.map(item => ({
      insertOne: { document: item.doc },
    }));

    try {
      const res = await Customer.bulkWrite(ops, { ordered: false });
      successCount += res.insertedCount;
    } catch (err: any) {
      const writeErrors = err.writeErrors || [];
      const failedIndexes = new Set<number>();

      for (const e of writeErrors) {
        failedIndexes.add(e.index);
        failedCount++;

        rowErrors.push({
          rowNumber: consumerBatch[e.index].rowNumber,
          error: e.errmsg || 'Duplicate key',
          rowData: consumerBatch[e.index].doc,
        });
      }

      consumerBatch.forEach((item, idx) => {
        if (!failedIndexes.has(idx)) {
          successCount++;
        }
      });
    }

    consumerBatch = [];
  };

  /* =====================
     Stream processing
     ===================== */
  return new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath).pipe(csv());

    stream.on('data', async (row) => {
      stream.pause();

      rowNumber++;
      totalRows++;
      processedRows++;
      sinceLastJobFlush++;

      const currentRowNumber = rowNumber;

      try {
        const error = validateCustomer(row);

        if (error) {
          failedCount++;
          rowErrors.push({
            rowNumber: currentRowNumber,
            error,
            rowData: row,
          });
        } else {
          consumerBatch.push({
            rowNumber: currentRowNumber,
            doc: {
              name: row.name,
              email: row.email,
              phone: row.phone,
              company: row.company,
              jobId: new Types.ObjectId(jobId),
            },
          });

          if (consumerBatch.length >= CONSUMER_BATCH_SIZE) {
            await flushConsumers();
          }
        }

        if (sinceLastJobFlush >= JOB_BATCH_SIZE) {
          await flushJob();
        }
      } catch (err: any) {
        failedCount++;
        rowErrors.push({
          rowNumber: currentRowNumber,
          error: err.message,
          rowData: row,
        });
      } finally {
        stream.resume();
      }
    });

    /* =================
       End – completed
       ================= */
    stream.on('end', async () => {
      try {
        await flushConsumers();
        await flushJob();

        await updateAndBroadcastJob(jobId, {
          status: 'completed',
          completedAt: new Date(),
        });

        fs.unlink(filePath, () => {});
        console.log(`Finished CSV processing for job ${jobId}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    stream.on('error', async (err) => {
      await updateAndBroadcastJob(jobId, { status: 'failed' });
      reject(err);
    });
  });
};
