import { OpenpeepsError, OpenpeepsErrorData } from '@openpeepshq/common/types';

const allPeepError = ({
  code = 500,
  errorKey,
  parameters,
}: OpenpeepsErrorData): OpenpeepsError => ({
  __allPeepError__: true,
  code: code,
  errorKey,
  parameters,
});

export const authNeeded = ({
  errorKey = 'authNeeded',
  parameters,
}: OpenpeepsErrorData) => allPeepError({ code: 401, errorKey, parameters });
export const forbidden = ({
  errorKey = 'forbidden',
  parameters,
}: OpenpeepsErrorData) => allPeepError({ code: 403, errorKey, parameters });
export const notFound = ({
  errorKey = 'notFound',
  parameters,
}: OpenpeepsErrorData) => allPeepError({ code: 404, errorKey, parameters });
export const conflict = ({
  errorKey = 'conflict',
  parameters,
}: OpenpeepsErrorData) => allPeepError({ code: 409, errorKey, parameters });
export const unprocessableRequest = ({
  errorKey = 'unprocessableRequest',
  parameters,
}: OpenpeepsErrorData) => allPeepError({ code: 422, errorKey, parameters });
export const internalError = ({
  errorKey = 'internalError',
  parameters,
}: OpenpeepsErrorData) => allPeepError({ code: 500, errorKey, parameters });

export const isOpenpeepsError = (o?: unknown): boolean =>
  (o as OpenpeepsError)?.__allPeepError__;
