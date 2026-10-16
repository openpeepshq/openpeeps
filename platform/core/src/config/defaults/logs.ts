import dotenv from 'dotenv';
import { readEnvInteger } from '../helpers';
dotenv.config();

export default {
  local: {
    path: process.env.LOGS_LOCAL_PATH || './.logs',
  },
  retention: {
    zipAfterDays: readEnvInteger('LOGS_RETENTION_ZIP_AFTER_DAYS', 7),
    deleteAfterDays: readEnvInteger('LOGS_RETENTION_DELETE_AFTER_DAYS', 30),
  },
};
