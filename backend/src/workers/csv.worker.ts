import fs from 'fs';
import csv from 'csv-parser';
import { Job } from '../models/job.model';
import { Customer } from '../models/customer.model';
import { validateCustomer } from '../utils/validateCustomer';
import { Types } from 'mongoose';


export const processCsvJob = async (
  jobId: string,
  filePath: string
) => {
  console.log(`Starting CSV processing for job ${jobId}`);

  // מסמנים שהתחלנו
  await Job.findByIdAndUpdate(jobId, { status: 'processing' });

  let rowNumber = 0;

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', async (row) => {
        rowNumber++;

        // מגדילים counters כלליים
        await Job.findByIdAndUpdate(jobId, {
          $inc: {
            totalRows: 1,
            processedRows: 1,
          },
        });

        const error = validateCustomer(row);

        if (error) {
          await Job.findByIdAndUpdate(jobId, {
            $inc: { failedCount: 1 },
            $push: {
              rowErrors: {
                rowNumber,
                error,
                rowData: row,
              },
            },
          });
          return;
        }

        try {
          await Customer.create({
            name: row.name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            jobId: new Types.ObjectId(jobId),
          });

          await Job.findByIdAndUpdate(jobId, {
            $inc: { successCount: 1 },
          });
        } catch (err: any) {
          await Job.findByIdAndUpdate(jobId, {
            $inc: { failedCount: 1 },
            $push: {
              rowErrors: {
                rowNumber,
                error: err.message,
                rowData: row,
              },
            },
          });
        }
      })
      .on('end', async () => {
        await Job.findByIdAndUpdate(jobId, {
          status: 'completed',
          completedAt: new Date(),
        });

        fs.unlink(filePath, () => {}); // cleanup
        console.log(`Finished CSV processing for job ${jobId}`);
        resolve();
      })
      .on('error', async (err) => {
        await Job.findByIdAndUpdate(jobId, { status: 'failed' });
        reject(err);
      });
  });
};
