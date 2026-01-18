import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  LinearProgress,
  Card,
  CardContent,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
} from '@mui/material';

/* ===== Types ===== */

interface JobError {
  rowNumber: number;
  error: string;
  rowData?: Record<string, any>;
}

interface Job {
  _id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  rowErrors?: JobError[] | null;
}

/* ===== Config ===== */

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';

/* ===== App ===== */

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔴 state לחלון שגיאות
  const [openErrorsForJob, setOpenErrorsForJob] = useState<Job | null>(null);

  /* ===== Initial fetch ===== */
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/jobs`);
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  /* ===== WebSocket ===== */
  useEffect(() => {
    fetchJobs();

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log('WebSocket connected');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WS MESSAGE:', message);

      if (message.type === 'JOB_UPDATED') {
        const job: Job = message.payload;

        setJobs((prev) => {
          const idx = prev.findIndex((j) => j._id === job._id);
          if (idx === -1) return [job, ...prev];

          const updated = [...prev];
          updated[idx] = job;
          return updated;
        });
      }
    };

    ws.onerror = (err) => console.error('WebSocket error', err);
    ws.onclose = () => console.log('WebSocket disconnected');

    return () => ws.close();
  }, []);

  /* ===== Upload ===== */
  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/jobs/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setLastJobId(data.jobId);
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        CSV Import Jobs
      </Typography>

      {/* Upload */}
      <Stack direction="row" spacing={2} mb={3}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button variant="contained" onClick={handleUpload}>
          Upload
        </Button>
      </Stack>

      {lastJobId && (
        <Typography color="success.main" mb={2}>
          Job created successfully. Job ID: {lastJobId}
        </Typography>
      )}

      <Button variant="outlined" onClick={fetchJobs} sx={{ mb: 3 }}>
        Refresh
      </Button>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Jobs List */}
      <Stack spacing={2}>
        {jobs.map((job) => {
          const progress =
            job.totalRows > 0
              ? Math.round((job.processedRows / job.totalRows) * 100)
              : 0;

          return (
            <Card key={job._id}>
              <CardContent>
                <Typography variant="h6">{job.filename}</Typography>
                <Typography>Status: {job.status}</Typography>

                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ my: 1 }}
                />

                <Typography variant="body2">
                  Processed: {job.processedRows}
                </Typography>

                <Typography variant="body2" color="success.main">
                  Success: {job.successCount}
                </Typography>

                <Typography variant="body2" color="error.main">
                  Failed: {job.failedCount}
                </Typography>

                {/* ✅ Row Errors Button */}
                {Array.isArray(job.rowErrors) && job.rowErrors.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => setOpenErrorsForJob(job)}
                  >
                    Row Errors ({job.rowErrors.length})
                  </Button>
                )}

                {/* Download report */}
                {job.status === 'completed' && job.failedCount > 0 && (
                  <Button
                    variant="outlined"
                    sx={{ mt: 2, ml: 1 }}
                    href={`${API_URL}/jobs/${job._id}/error-report`}
                  >
                    Download Error Report
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* 🔴 Errors Dialog */}
      <Dialog
        open={Boolean(openErrorsForJob)}
        onClose={() => setOpenErrorsForJob(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Row Errors – {openErrorsForJob?.filename}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            {openErrorsForJob?.rowErrors?.map((err, idx) => (
              <div key={idx}>
                <Typography variant="subtitle2">
                  ❌ Row {err.rowNumber}
                </Typography>

                <Typography color="error">
                  {err.error}
                </Typography>

                {err.rowData && (
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 8,
                      fontSize: 12,
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(err.rowData, null, 2)}
                  </pre>
                )}

                <Divider />
              </div>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default App;
