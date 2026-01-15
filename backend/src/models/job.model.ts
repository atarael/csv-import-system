import { Schema, model, InferSchemaType } from 'mongoose';

const JobSchema = new Schema(
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

    rowErrors: {
      type: [
        {
          rowNumber: Number,
          error: String,
          rowData: Schema.Types.Mixed,
        },
      ],
      default: [],
    },

    completedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);


export type JobDocument = InferSchemaType<typeof JobSchema>;

export const Job = model<JobDocument>('Job', JobSchema);
