import { Customer } from '../models/customer.model';

export const writeCustomerBatch = async (
  batch: {
    rowNumber: number;
    doc: any;
  }[]
) => {
  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  const ops = batch.map(item => ({
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

      errors.push({
        rowNumber: batch[e.index].rowNumber,
        error: e.errmsg || 'Duplicate key',
        rowData: batch[e.index].doc,
      });
    }

    batch.forEach((_, idx) => {
      if (!failedIndexes.has(idx)) {
        successCount++;
      }
    });
  }

  return { successCount, failedCount, errors };
};
