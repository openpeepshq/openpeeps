import { z, type ZodType } from 'zod';
import type { ConfigElement, ConfigTree } from '@openpeeps/common/types';

export const unwrap = (schema: ZodType): ZodType => {
	if (schema instanceof z.ZodEffects) {
		return unwrap(schema.sourceType() as ZodType);
	}
	if (schema instanceof z.ZodOptional) {
		return unwrap(schema.unwrap() as ZodType);
	}
	if (schema instanceof z.ZodTransformer) {
		return unwrap(schema.sourceType() as ZodType);
	}
	if (schema instanceof z.ZodDefault) {
		return schema.removeDefault();
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
