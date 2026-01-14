import { Schema, model, Document } from 'mongoose';

export interface JobDocument extends Document {
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';

  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;

  rowErrors: {
    rowNumber: number;
    error: string;
    rowData: Record<string, any>;
  }[];

  createdAt: Date;
  completedAt?: Date;
}

const JobSchema = new Schema<JobDocument>(
  {
    filename: { type: String, required: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },

    totalRows: { type: Number, default: 0 },
    processedRows: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },

    rowErrors: [
      {
        rowNumber: Number,
        error: String,
        rowData: Schema.Types.Mixed,
      },
    ],

    completedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Job = model<JobDocument>('Job', JobSchema);
