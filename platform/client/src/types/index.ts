import {
  BodyType,
  ParametersType,
  TypedNoPayloadEndpoint,
  TypedPayloadEndpoint,
} from '@openpeepshq/fetch-client';
import { SuccessFailureResponse } from '@openpeepshq/common/types';

export type OpenpeepsPayloadEndpoint<
  O,
  I extends BodyType,
  P extends ParametersType = undefined,
  Q extends ParametersType = undefined,
> = TypedPayloadEndpoint<O, I, SuccessFailureResponse, P, Q>;

export type OpenpeepsNoPayloadEndpoint<
  O,
  P extends ParametersType = undefined,
  Q extends ParametersType = undefined,
> = TypedNoPayloadEndpoint<O, SuccessFailureResponse, P, Q>;
