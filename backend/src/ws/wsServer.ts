import { WebSocketServer } from 'ws';

let wss: WebSocketServer;

export const initWebSocket = (server: any) => {
  console.log('initWebSocket CALLED')
  wss = new WebSocketServer({ server });

  wss.on('connection', () => {
    console.log('WebSocket client connected');
  });
};

export const broadcast = (message: any) => {
  if (!wss) return;

  const data = JSON.stringify(message);

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
};
