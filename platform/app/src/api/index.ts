import { API } from 'sveltekit-api';

export default new API(
  import.meta.glob('./**/*.ts'),
  {
    openapi: '3.0.0',
    info: {
      title: 'OpenPeeps API',
      version: '1.0.0',
      description: 'API for the OpenPeeps Community Server',
    },
  },
  '',
);
