import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  LinearProgress,
  Card,
  CardContent,
  Stack,
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

/* ===== App ===== */

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchJobs();
    const es = new EventSource(`${API_URL}/jobs/stream`);

    es.onmessage = (event) => {
      const job: Job = JSON.parse(event.data);

      setJobs((prevJobs) => {
        const index = prevJobs.findIndex((j) => j._id === job._id);

        // 🆕 Job חדש
        if (index === -1) {
          return [job, ...prevJobs];
        }

        // 🔁 עדכון Job קיים
        const updated = [...prevJobs];
        updated[index] = job;
        return updated;
      });
    };

    es.onerror = (err) => {
      console.error('SSE error', err);
      es.close();
    };

    return () => {
      es.close();
    };
    }, []);

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
      fetchJobs();
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

                {/* Errors — SAFE RENDERING */}
                {Array.isArray(job.rowErrors) && job.rowErrors.length > 0 && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Errors:
                    {job.rowErrors.map((e) => (
                      <div key={`${job._id}-${e.rowNumber}`}>
                        Row {e.rowNumber}: {e.error}
                      </div>
                    ))}
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
}

export default App;
