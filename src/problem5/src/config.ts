import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  env: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : './data/resources.db'),
};
