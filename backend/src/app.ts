import express from 'express';
import jobRoutes from './routes/job.routes';

const app = express();

app.use(express.json());

app.use('/api/jobs', jobRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
