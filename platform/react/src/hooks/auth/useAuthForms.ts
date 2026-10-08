import { useState } from 'react';
import type {
  LoginRequest,
  RegisterRequest,
  RequestResetPasswordRequest,
  ResetPasswordRequest,
  TokenResponse,
} from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCredentialsStore } from '../../contexts/credentialsStore';
import {
  performLogin,
  performRegister,
  performRequestResetPassword,
  performResetPassword,
} from '../../lib/auth';

export const usePasswordLogin = () => {
  const { client } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: LoginRequest): Promise<TokenResponse> => {
    setSubmitting(true);
    setError(null);
    try {
      return await performLogin(client, credentialsStore, data);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { login, submitting, error, clearError: () => setError(null) };
};

export const useRegisterAccount = () => {
  const { client } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (data: RegisterRequest): Promise<TokenResponse> => {
    setSubmitting(true);
    setError(null);
    try {
      return await performRegister(client, credentialsStore, data);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    register,
    submitting,
    error,
    clearError: () => setError(null),
  };
};

export const useRequestPasswordReset = () => {
  const { client } = useOpenpeeps();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = async (data: RequestResetPasswordRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await performRequestResetPassword(client, data);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    requestReset,
    submitting,
    error,
    clearError: () => setError(null),
  };
};

export const useResetPassword = (token: string) => {
  const { client } = useOpenpeeps();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = async (data: ResetPasswordRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await performResetPassword(client, data, token);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    resetPassword,
    submitting,
    error,
    clearError: () => setError(null),
  };
};
