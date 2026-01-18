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

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';
const WS_EVENT_JOB_UPDATED = 'JOB_UPDATED' as const;

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastCreatedJobId, setLastCreatedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorsDialogJob, setErrorsDialogJob] = useState<Job | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/jobs`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const jobsData = await response.json();
      setJobs(jobsData);
    } catch (error) {
      console.error('[Jobs] Fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.info('[WS] Connected');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type !== WS_EVENT_JOB_UPDATED) return;

        const updatedJob: Job = message.payload;

        setJobs((prevJobs) => {
          const existingIndex = prevJobs.findIndex(
            (job) => job._id === updatedJob._id
          );

          if (existingIndex === -1) {
            return [updatedJob, ...prevJobs];
          }

          const nextJobs = [...prevJobs];
          nextJobs[existingIndex] = updatedJob;
          return nextJobs;
        });
      } catch (error) {
        console.error('[WS] Invalid message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    socket.onclose = () => {
      console.warn('[WS] Disconnected');
    };

    return () => socket.close();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/jobs/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { jobId } = await response.json();
      setLastCreatedJobId(jobId);
    } catch (error) {
      console.error('[Upload] Failed:', error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        CSV Import Jobs
      </Typography>

      <Stack direction="row" spacing={2} mb={3}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) =>
            setSelectedFile(e.target.files?.[0] ?? null)
          }
        />
        <Button variant="contained" onClick={handleUpload}>
          Upload
        </Button>
      </Stack>

      {lastCreatedJobId && (
        <Typography color="success.main" mb={2}>
          Job created successfully. ID: {lastCreatedJobId}
        </Typography>
      )}

      <Button variant="outlined" onClick={fetchJobs} sx={{ mb: 3 }}>
        Refresh
      </Button>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

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

                {Array.isArray(job.rowErrors) &&
                  job.rowErrors.length > 0 && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => setErrorsDialogJob(job)}
                    >
                      Row Errors ({job.rowErrors.length})
                    </Button>
                  )}

                {job.status === 'completed' &&
                  job.failedCount > 0 && (
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

      <Dialog
        open={Boolean(errorsDialogJob)}
        onClose={() => setErrorsDialogJob(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Row Errors – {errorsDialogJob?.filename}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            {errorsDialogJob?.rowErrors?.map((error, index) => (
              <div key={index}>
                <Typography variant="subtitle2">
                  Row {error.rowNumber}
                </Typography>

                <Typography color="error">
                  {error.error}
                </Typography>

                {error.rowData && (
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 8,
                      fontSize: 12,
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(error.rowData, null, 2)}
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
