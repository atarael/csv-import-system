import { Customer } from '../../models/customer.model';

type Counters = {
  successCount: number;
  failedCount: number;
};

type RowError = {
  rowNumber: number;
  error: string;
  rowData: unknown;
};

type ConsumerItem = {
  rowNumber: number;
  doc: any;
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
  } catch (error: any) {
    const writeErrors = error.writeErrors || [];
    const failedIndexes = new Set<number>();

    for (const e of writeErrors) {
      failedIndexes.add(e.index);
      counters.failedCount++;

      rowErrors.push({
        rowNumber: batch[e.index].rowNumber,
        error: e.errmsg || 'Duplicate key',
        rowData: batch[e.index].doc,
      });
    }

    batch.forEach((item, index) => {
      if (!failedIndexes.has(index)) {
        counters.successCount++;
      }
    });
  }

  batch.length = 0;
};
