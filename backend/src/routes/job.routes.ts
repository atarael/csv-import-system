import { Router } from 'express';
import multer from 'multer';
import {
  uploadJob,
  getJobs,
  getJobById,
  downloadErrorReport,
} from '../controllers/job.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadJob);
router.get('/', getJobs);
router.get('/:id/error-report', downloadErrorReport);
router.get('/:id', getJobById);

export default router;
