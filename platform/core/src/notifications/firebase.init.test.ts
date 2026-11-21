import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getApps, initializeApp, config, log, createFcmCredential } = vi.hoisted(
  () => ({
    getApps: vi.fn(),
    initializeApp: vi.fn(),
    config: vi.fn(),
    log: {
      info: vi.fn(),
      error: vi.fn(),
    },
    createFcmCredential: vi.fn(() => ({ getAccessToken: vi.fn() })),
  }),
);

vi.mock('firebase-admin/app', () => ({
  getApps: () => getApps(),
  initializeApp: (...args: unknown[]) => initializeApp(...args),
}));
vi.mock('../config', () => ({
  config: () => config(),
}));
vi.mock('../log', () => ({
  logger: () => log,
}));
vi.mock('./fcmCredential', () => ({
  createFcmCredential: (...args: unknown[]) => createFcmCredential(...args),
}));

import { initializeFirebase } from './firebase';

const validServiceAccount = {
  client_email: 'fcm-sender@test-project.iam.gserviceaccount.com',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEA\n-----END PRIVATE KEY-----\n',
  project_id: 'test-project',
};

describe('initializeFirebase FCM credential guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No app initialized yet — the guards below are the only things
    // that can stop initialization.
    getApps.mockReturnValue([]);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('does not initialize when fcmCredentials is unset (no error logged)', async () => {
    config.mockResolvedValue({ apps: { android: { fcmCredentials: null } } });

    await initializeFirebase();

    expect(initializeApp).not.toHaveBeenCalled();
    expect(createFcmCredential).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('does not initialize (and logs an error) when the credentials JSON lacks project_id', async () => {
    const { project_id: _omitted, ...noProjectId } = validServiceAccount;
    config.mockResolvedValue({
      apps: {
        android: { fcmCredentials: JSON.stringify(noProjectId) },
      },
    });

    await initializeFirebase();

    expect(initializeApp).not.toHaveBeenCalled();
    expect(createFcmCredential).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      'FCM credentials JSON is missing project_id; Firebase Messaging cannot send pushes',
    );
  });

  it('initializes the app with the service account when credentials are complete', async () => {
    config.mockResolvedValue({
      apps: {
        android: { fcmCredentials: JSON.stringify(validServiceAccount) },
      },
    });

    await initializeFirebase();

    expect(createFcmCredential).toHaveBeenCalledWith(
      validServiceAccount,
      expect.anything(),
    );
    expect(initializeApp).toHaveBeenCalledWith({
      credential: expect.objectContaining({
        getAccessToken: expect.any(Function),
      }),
      projectId: 'test-project',
      httpAgent: expect.anything(),
    });
    expect(log.error).not.toHaveBeenCalled();
  });

  it('does not reinitialize when an app already exists', async () => {
    getApps.mockReturnValue([{ name: '[DEFAULT]' }]);
    config.mockResolvedValue({
      apps: {
        android: { fcmCredentials: JSON.stringify(validServiceAccount) },
      },
    });

    await initializeFirebase();

    expect(initializeApp).not.toHaveBeenCalled();
    // The short-circuit returns before touching config.
    expect(config).not.toHaveBeenCalled();
  });
});
