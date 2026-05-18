import type { SuccessFailureResponse } from "@openpeeps/common";
import {
	type BodyType,
	type EndpointDefinition,
	type FetchClient,
	type FormDataEndpointDefinition,
	type FormDataSource,
	type ParametersType,
	typedNoPayloadEndpoint,
	typedPayloadEndpoint,
	typedPayloadProgressObserverEndpoint,
	type Verb,
} from "@openpeeps/fetch-client";

export const allpeepPayloadEndpoint = <
	Output,
	Input extends BodyType,
	PathParameters extends ParametersType = undefined,
	QueryParameters extends ParametersType = undefined,
>(
	rawClient: FetchClient,
	path: string,
	method: Verb = "post",
	convertToFormData?: Input extends FormDataSource ? true : false | undefined,
) =>
	typedPayloadEndpoint<
		Output,
		Input,
		SuccessFailureResponse,
		PathParameters,
		QueryParameters
	>(
		{
			path,
			method,
			convertToFormData,
		} as Input extends FormDataSource
			? FormDataEndpointDefinition
			: EndpointDefinition,
		rawClient,
	);

export const allpeepPayloadProgressObserverEndpoint = <
	Output,
	Input extends BodyType,
	PathParameters extends ParametersType = undefined,
	QueryParameters extends ParametersType = undefined,
>(
	rawClient: FetchClient,
	path: string,
	method: Verb = "post",
	convertToFormData?: Input extends FormDataSource ? true : false | undefined,
) =>
	typedPayloadProgressObserverEndpoint<
		Output,
		Input,
		SuccessFailureResponse,
		PathParameters,
		QueryParameters
	>(
		{
			path,
			method,
			convertToFormData,
		} as Input extends FormDataSource
			? FormDataEndpointDefinition
			: EndpointDefinition,
		rawClient,
	);

export const allpeepNoPayloadEndpoint = <
	Output,
	PathParameters extends ParametersType = undefined,
	QueryParameters extends ParametersType = undefined,
>(
	rawClient: FetchClient,
	path: string,
	method: Verb = "get",
) =>
	typedNoPayloadEndpoint<
		Output,
		SuccessFailureResponse,
		PathParameters,
		QueryParameters
	>(
		{
			path,
			method,
		},
		rawClient,
	);
