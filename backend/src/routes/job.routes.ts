import { Router } from 'express';
import multer from 'multer';
import { uploadJob } from '../controllers/job.controller';

const router = Router();

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadJob);

export default router;
