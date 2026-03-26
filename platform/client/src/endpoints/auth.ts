import type { FetchClient } from '@openpeeps/fetch-client';
import type {
    GuestPassRequest,
    LoginRequest,
    RegisterRequest,
    RequestResetPasswordRequest,
    ResetPasswordRequest,
    SuccessResponse,
    TokenResponse,
} from '@openpeeps/common';
import { allpeepPayloadEndpoint } from './helpers';

export const auth = (rawClient: FetchClient) => ({
    login: allpeepPayloadEndpoint<TokenResponse, LoginRequest>(
        rawClient,
        '/auth/login',
    ),
    register: allpeepPayloadEndpoint<TokenResponse, RegisterRequest>(
        rawClient,
        '/auth/register',
    ),
    requestResetPassword: allpeepPayloadEndpoint<SuccessResponse, RequestResetPasswordRequest>(
        rawClient,
        '/auth/request-reset-password',
    ),
    resetPassword: allpeepPayloadEndpoint<SuccessResponse, ResetPasswordRequest>(
        rawClient,
        '/auth/reset-password',
    ),
    guestPass: allpeepPayloadEndpoint<TokenResponse, GuestPassRequest>(
        rawClient,
        '/auth/guest-pass',
    ),
}); 