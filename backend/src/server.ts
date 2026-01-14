import app from './app';
import { connectDB } from './config/db';

const PORT = 3000;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
