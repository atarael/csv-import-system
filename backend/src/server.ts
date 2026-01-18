import app from './app';
import { connectDB } from './config/db';
import { initWebSocket } from './ws/wsServer';

const PORT = 3000;

connectDB();

// ⬅️ חשוב: לשמור את ה-server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ⬅️ עכשיו זה עובד
initWebSocket(server);
