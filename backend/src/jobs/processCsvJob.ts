import fs from 'fs';
import csv from 'csv-parser';
import { Types } from 'mongoose';
import { validateCustomer } from '../utils/validateCustomer';
import { updateJobAndPublish } from './jobUpdater';
import { writeCustomerBatch } from '../customers/customerBatchWriter';

const JOB_BATCH_SIZE = 50;
const CONSUMER_BATCH_SIZE = 50;

export const processCsvJob = async (
  jobId: string,
  filePath: string
): Promise<void> => {
  await updateJobAndPublish(jobId, { status: 'processing' });

  let totalRows = 0;
  let processedRows = 0;
  let successCount = 0;
  let failedCount = 0;
  let sinceLastFlush = 0;

  let rowErrors: any[] = [];
  let batch: any[] = [];

  const flushJob = async () => {
    if (sinceLastFlush === 0 && rowErrors.length === 0) return;

    await updateJobAndPublish(jobId, {
      totalRows,
      processedRows,
      successCount,
      failedCount,
      ...(rowErrors.length
        ? { $push: { rowErrors: { $each: rowErrors.splice(0) } } }
        : {}),
    });

    sinceLastFlush = 0;
  };

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath).pipe(csv());

    stream.on('data', async (row) => {
      stream.pause();

      totalRows++;
      processedRows++;
      sinceLastFlush++;

      const error = validateCustomer(row);

      if (error) {
        failedCount++;
        rowErrors.push({ rowNumber: totalRows, error, rowData: row });
      } else {
        batch.push({
          rowNumber: totalRows,
          doc: {
            name: row.name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            jobId: new Types.ObjectId(jobId),
          },
        });

        if (batch.length >= CONSUMER_BATCH_SIZE) {
          const res = await writeCustomerBatch(batch);
          successCount += res.successCount;
          failedCount += res.failedCount;
          rowErrors.push(...res.errors);
          batch = [];
        }
      }

      if (sinceLastFlush >= JOB_BATCH_SIZE) {
        await flushJob();
      }

      stream.resume();
    });

    stream.on('end', async () => {
      await flushJob();

      await updateJobAndPublish(jobId, {
        status: 'completed',
        completedAt: new Date(),
      });

      fs.unlink(filePath, () => {});
      resolve();
    });

    stream.on('error', async (err) => {
      await updateJobAndPublish(jobId, { status: 'failed' });
      reject(err);
    });
  });
};
