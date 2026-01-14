import { Schema, model, Document, Types } from 'mongoose';

export interface CustomerDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  company: string;
  jobId: Types.ObjectId; 
  createdAt: Date;
}

const CustomerSchema = new Schema<CustomerDocument>(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    phone: { type: String },

    company: { type: String, required: true },

    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Customer = model<CustomerDocument>(
  'Customer',
  CustomerSchema
);
