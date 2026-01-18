import fs from 'fs';
import csv from 'csv-parser';
import { Types } from 'mongoose';

import { validateCustomer } from '../../utils/validateCustomer';
import {
  updateJobStatus,
  updateJobProgress,
  completeJob,
  failJob,
} from './jobUpdater';
import { flushConsumers } from './consumerBatchWriter';

const JOB_BATCH_SIZE = 50;
const CONSUMER_BATCH_SIZE = 50;

export const processCsvJob = async (
  jobId: string,
  filePath: string
): Promise<void> => {
  if (!Types.ObjectId.isValid(jobId)) {
    throw new Error('Invalid jobId');
  }

  await updateJobStatus(jobId, 'processing');

  let rowNumber = 0;
  let totalRows = 0;
  let processedRows = 0;
  let sinceLastJobFlush = 0;

  const counters = {
    successCount: 0,
    failedCount: 0,
  };

  const rowErrors: any[] = [];
  const consumerBatch: any[] = [];

  return new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath).pipe(csv());

    stream.on('data', async (row) => {
      stream.pause();

      rowNumber++;
      totalRows++;
      processedRows++;
      sinceLastJobFlush++;

      try {
        const validationError = validateCustomer(row);

        if (validationError) {
          counters.failedCount++;
          rowErrors.push({
            rowNumber,
            error: validationError,
            rowData: row,
          });
        } else {
          consumerBatch.push({
            rowNumber,
            doc: {
              name: row.name,
              email: row.email,
              phone: row.phone,
              company: row.company,
              jobId: new Types.ObjectId(jobId),
            },
          });

          if (consumerBatch.length >= CONSUMER_BATCH_SIZE) {
            await flushConsumers(consumerBatch, counters, rowErrors);
          }
        }

        if (sinceLastJobFlush >= JOB_BATCH_SIZE) {
          await updateJobProgress(jobId, {
            totalRows,
            processedRows,
            successCount: counters.successCount,
            failedCount: counters.failedCount,
            rowErrors,
          });

          sinceLastJobFlush = 0;
          rowErrors.length = 0;
        }
      } catch (error: any) {
        counters.failedCount++;
        rowErrors.push({
          rowNumber,
          error: error.message,
          rowData: row,
        });
      } finally {
        stream.resume();
      }
    });

    stream.on('end', async () => {
      try {
        await flushConsumers(consumerBatch, counters, rowErrors);

        await updateJobProgress(jobId, {
          totalRows,
          processedRows,
          successCount: counters.successCount,
          failedCount: counters.failedCount,
          rowErrors,
        });

        await completeJob(jobId);
        fs.unlink(filePath, () => {});
        resolve();
      } catch (error) {
        await failJob(jobId);
        reject(error);
      }
    });

    stream.on('error', async () => {
      await failJob(jobId);
      reject();
    });
  });
};
