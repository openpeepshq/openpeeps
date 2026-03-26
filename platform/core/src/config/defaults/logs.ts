import dotenv from 'dotenv';
dotenv.config();

export default {
  local: {
    path: process.env.LOGS_LOCAL_PATH || './.logs',
  },
};
