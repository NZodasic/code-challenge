import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`Server is running in ${config.env} mode on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});
