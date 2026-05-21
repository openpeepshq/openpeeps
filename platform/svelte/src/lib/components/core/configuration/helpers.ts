// @ts-nocheck
import { z, type ZodType } from 'zod';
import type { ConfigElement, ConfigTree } from '@openpeeps/common/types';

type SchemaWithDef = ZodType & {
	def?: { type?: string; innerType?: ZodType; in?: ZodType };
	in?: ZodType;
	unwrap?: () => ZodType;
	removeDefault?: () => ZodType;
	sourceType?: () => ZodType;
};

export const unwrap = (schema: ZodType): ZodType => {
	const s = schema as SchemaWithDef;

	switch (s.def?.type) {
		case 'optional':
		case 'nullable':
			return unwrap(s.unwrap!());
		case 'default':
			return unwrap(s.removeDefault!());
		case 'pipe':
			return unwrap((s.in ?? s.def?.in)!);
		case 'readonly':
		case 'catch':
		case 'prefault':
			return unwrap(s.def!.innerType!);
	}

	// Zod v3 compatibility (removed in v4 — guard so `instanceof` never throws)
	if (typeof z.ZodEffects === 'function' && schema instanceof z.ZodEffects) {
		return unwrap(s.sourceType!());
	}
	if (typeof z.ZodTransformer === 'function' && schema instanceof z.ZodTransformer) {
		return unwrap(s.sourceType!());
	}
	if (schema instanceof z.ZodOptional) {
		return unwrap(s.unwrap!());
	}
	if (schema instanceof z.ZodDefault) {
		return unwrap(s.removeDefault!());
	}

	return schema;
};

const isDate = (d: unknown) => d instanceof Date;
const isEmpty = (o: ConfigTree) => Object.keys(o).length === 0;
const isObject = (o: ConfigElement) => o != null && typeof o === 'object';
const hasOwnProperty = (o: ConfigTree, key: string | number | symbol) =>
	Object.prototype.hasOwnProperty.call(o, key);
const isEmptyObject = (o: ConfigElement) => isObject(o) && isEmpty(o as ConfigTree);
const makeObjectWithoutPrototype = () => Object.create(null);

export const diffConfigTrees = (lhs: ConfigTree, rhs: ConfigTree) => {
	const deletedValues = Object.keys(lhs).reduce((acc, key) => {
		if (!hasOwnProperty(rhs, key)) {
			acc[key] = undefined;
		}

		return acc;
	}, makeObjectWithoutPrototype());

	if (isDate(lhs) || isDate(rhs)) {
		if (lhs.valueOf() == rhs.valueOf()) return {};
		return rhs;
	}

	return Object.keys(rhs).reduce((acc, key) => {
		if (!hasOwnProperty(lhs, key) && rhs[key] !== undefined) {
			acc[key] = rhs[key]; // return added r key
			return acc;
		}

		const difference = diffConfigElements(lhs[key], rhs[key]);

		if (
			isEmptyObject(difference) &&
			!isDate(difference) &&
			(isEmptyObject(lhs[key]) || !isEmptyObject(rhs[key]))
		)
			return acc;

		acc[key] = difference;
		return acc;
	}, deletedValues);
};

export const diffConfigElements = (lhs: ConfigElement, rhs: ConfigElement) => {
	if (lhs === rhs) return {}; // equal return no diff

	if (Array.isArray(lhs) || Array.isArray(rhs)) return rhs;

	if (!isObject(lhs) || !isObject(rhs)) return rhs; // return updated rhs

	return diffConfigTrees(lhs as ConfigTree, rhs as ConfigTree);
};

export const equal = (lhs: ConfigTree, rhs: ConfigTree) =>
	Object.keys(diffConfigTrees(lhs, rhs)).length === 0;

export const categories = [
	'favicon',
	'communityLogo',
	'communityTheme',
	'brandColor',
	'contactEmail',
	'communityName',
	'communityTagline',
	'pageText',
	'welcomeEmailText',
	'backgroundImage',
	// 'accountsToFollow',
	'privacyPolicyLink',
	'termsAndConditions'
];

export const getCategoryKey = (v: string, title = true) => {
	return `configuration.community.category.${title ? 'title' : 'description'}.${v}`;
};
