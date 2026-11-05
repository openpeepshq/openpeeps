import type { Response } from 'express';

export const xrpcError = (
  res: Response,
  status: number,
  error: string,
  message: string,
) => res.status(status).json({ error, message });

export const invalidRequest = (res: Response, message: string) =>
  xrpcError(res, 400, 'InvalidRequest', message);

export const authRequired = (
  res: Response,
  message = 'Authentication required',
) => xrpcError(res, 401, 'AuthenticationRequired', message);

export const notFound = (res: Response, message = 'Not found') =>
  xrpcError(res, 404, 'NotFound', message);

export const methodNotImplemented = (res: Response, nsid: string) =>
  xrpcError(res, 501, 'MethodNotImplemented', nsid);
