export * from './events';
export * from './scrolling';

export const deepGet = (obj: unknown, path: (string | number | symbol)[]) =>
	// @ts-expect-error deepget is not typeable
	path.reduce((o, i) => o && o[i], obj);

export const deepSet = <T>(obj: T, path: string | (string | number)[], val: unknown): T => {
	const keys = Array.isArray(path)
		? path
		: path
			.replace(/(\w)\[/g, '$1.[')
			.split('.')
			.map((k) => (k.includes('[') ? parseInt(k.substring(1, k.length - 1)) : k));

	let subObject: unknown = obj;
	for (let i = 0; i < keys.length; i++) {
		const currentKey = keys[i];
		const nextKey = keys[i + 1];

		if (typeof nextKey !== 'undefined') {
			// @ts-expect-error deepset is not really typeable
			subObject[currentKey] = subObject[currentKey]
				? // @ts-expect-error deepset is not really typeable
				subObject[currentKey]
				: // @ts-expect-error deepset is not really typeable
				isNaN(nextKey)
					? {}
					: [];
		} else {
			// @ts-expect-error deepset is not really typeable
			subObject[currentKey] = val;
		}

		// @ts-expect-error deepset is not really typeable
		subObject = subObject[currentKey];
	}
	return obj;
};

export const getUniqueBy = <T, V = string>(
	arr: T[],
	predicate: (o: T) => V,
) => {
	const set = new Set<V>();
	return arr.filter((o) => !set.has(predicate(o)) && set.add(predicate(o)));
};
