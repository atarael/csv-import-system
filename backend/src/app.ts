import express from 'express';
import cors from 'cors';
import jobRoutes from './routes/job.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/jobs', jobRoutes);

app.use(errorHandler);

export default app;
