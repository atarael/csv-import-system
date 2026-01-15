import express from 'express';
import jobRoutes from './routes/job.routes';
import cors from 'cors';

const app = express();

app.use(cors());

app.use(express.json());

app.use('/api/jobs', jobRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
