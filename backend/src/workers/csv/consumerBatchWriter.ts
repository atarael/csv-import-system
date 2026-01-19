import { Customer } from '../../models/customer.model';
import { Types } from 'mongoose';

type Counters = {
  successCount: number;
  failedCount: number;
};

type RowError = {
  rowNumber: number;
  error: string;
  rowData: unknown;
};

type CustomerDocument = {
  name: string;
  email: string;
  company: string;
  phone?: string;
  jobId: Types.ObjectId;
};

type ConsumerItem = {
  rowNumber: number;
  doc: CustomerDocument;
};

export const flushConsumers = async (
  batch: ConsumerItem[],
  counters: Counters,
  rowErrors: RowError[]
): Promise<void> => {
  if (batch.length === 0) return;

  const ops = batch.map(item => ({
    insertOne: { document: item.doc },
  }));

  try {
    const result = await Customer.bulkWrite(ops, { ordered: false });
    counters.successCount += result.insertedCount;
  } catch (err: unknown) {
    const error = err as {
      writeErrors?: Array<{
        index: number;
        errmsg?: string;
      }>;
    };

    const writeErrors = error.writeErrors ?? [];
    const failedIndexes = new Set<number>();

    for (const e of writeErrors) {
      failedIndexes.add(e.index);
      counters.failedCount++;

      const message =
        typeof e.errmsg === 'string' && e.errmsg.length > 0
          ? e.errmsg
          : 'Insert failed';

      rowErrors.push({
        rowNumber: batch[e.index].rowNumber,
        error: message,
        rowData: batch[e.index].doc,
      });
    }

    batch.forEach((_, index) => {
      if (!failedIndexes.has(index)) {
        counters.successCount++;
      }
    });
  }

  batch.length = 0;
};
