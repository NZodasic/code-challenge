import http from 'http';
import { createApp } from './app';
import { config } from './config';

const server = http.createServer();
const app = createApp(server);

server.on('request', app);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`WebSocket server running at ws://localhost:${config.port}/ws/leaderboard`);
});

export { server };
