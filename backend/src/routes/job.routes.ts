import { Router } from 'express';
import multer from 'multer';
import {
  uploadJob,
  getJobs,
  getJobById,
} from '../controllers/job.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadJob);
router.get('/', getJobs);
router.get('/:id', getJobById);

export default router;
