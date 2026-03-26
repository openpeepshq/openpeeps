import { literal, AqlLiteral } from "arangojs/aql";
import { uuidv7 } from "uuidv7";
import { FlattenedPath } from "./types";

export const randomIdentifier = (prefix: string) => literal(`${prefix}_${uuidv7().replace(/-/g, '_')}`);

export const randomVertexName = () => randomIdentifier('vertex');
export const randomEdgeName = () => randomIdentifier('edge');
export const randomPathName = () => randomIdentifier('path');

export const ensureLiteral = (value: string | AqlLiteral) => typeof value === 'string' ? literal(value) : value;

/**
 * Transforms a JavaScript object into a list of paths and values.
 * This function recursively traverses the object and creates an array of
 * {path, value} pairs where path is an array of keys representing the
 * location of the value in the original object.
 * 
 * @param obj - The object to flatten
 * @param path - Internal parameter for tracking the current path (used in recursion)
 * @returns Array of FlattenedPath objects containing path arrays and their corresponding values
 * 
 * @example
 * ```typescript
 * const obj = {
 *   user: {
 *     name: 'John',
 *     address: {
 *       city: 'New York',
 *       zip: '10001'
 *     }
 *   },
 *   settings: {
 *     theme: 'dark'
 *   }
 * };
 * 
 * const flattened = flattenObject(obj);
 * // Result:
 * // [
 * //   { path: ['user', 'name'], value: 'John' },
 * //   { path: ['user', 'address', 'city'], value: 'New York' },
 * //   { path: ['user', 'address', 'zip'], value: '10001' },
 * //   { path: ['settings', 'theme'], value: 'dark' }
 * // ]
 * ```
 */
export const flattenObject = (obj: unknown, path: (string | number)[] = []): FlattenedPath[] => {
    const result: FlattenedPath[] = [];

    if (obj === null || obj === undefined) {
        return result;
    }

    if (typeof obj === 'object' && !Array.isArray(obj)) {
        // Handle plain objects
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = [...path, key];

            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively flatten nested objects
                result.push(...flattenObject(value, currentPath));
            } else if (Array.isArray(value)) {
                // Handle arrays
                for (let i = 0; i < value.length; i++) {
                    const arrayValue = value[i];
                    const arrayPath = [...currentPath, i];

                    if (arrayValue !== null && typeof arrayValue === 'object' && !Array.isArray(arrayValue)) {
                        // Recursively flatten objects in arrays
                        result.push(...flattenObject(arrayValue, arrayPath));
                    } else {
                        // Add primitive values in arrays
                        result.push({ path: arrayPath, value: arrayValue });
                    }
                }
            } else {
                // Add leaf node
                result.push({ path: currentPath, value });
            }
        }
    } else if (Array.isArray(obj)) {
        // Handle root-level arrays
        for (let i = 0; i < obj.length; i++) {
            const value = obj[i];
            const currentPath = [...path, i];

            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively flatten nested objects in arrays
                result.push(...flattenObject(value, currentPath));
            } else {
                // Add leaf node
                result.push({ path: currentPath, value });
            }
        }
    } else {
        // Handle primitive values at root level
        result.push({ path, value: obj });
    }

    return result;
};

/**
 * Converts a path array to a string representation.
 * This is useful for displaying paths in a human-readable format.
 * 
 * @param path - Array of path segments (strings or numbers)
 * @returns String representation of the path
 * 
 * @example
 * ```typescript
 * pathToString(['user', 'address', 0, 'city']) // Returns: "user.address[0].city"
 * pathToString(['settings', 'theme']) // Returns: "settings.theme"
 * ```
 */
export const pathToString = (path: (string | number)[]): string =>
    path
        .map((element) => (typeof element === 'number' ? `[${element}]` : element))
        .join('.')
        .replaceAll('.[', '[');

/**
 * Converts a flattened object back to its original nested structure.
 * This is the inverse operation of flattenObject.
 * 
 * @param flattened - Array of FlattenedPath objects
 * @returns The reconstructed original object
 * 
 * @example
 * ```typescript
 * const flattened = [
 *   { path: ['user', 'name'], value: 'John' },
 *   { path: ['user', 'address', 'city'], value: 'New York' },
 *   { path: ['settings', 'theme'], value: 'dark' }
 * ];
 * 
 * const reconstructed = unflattenObject(flattened);
 * // Result:
 * // {
 * //   user: {
 * //     name: 'John',
 * //     address: {
 * //       city: 'New York'
 * //     }
 * //   },
 * //   settings: {
 * //     theme: 'dark'
 * //   }
 * // }
 * ```
 */
export const unflattenObject = (flattened: FlattenedPath[]): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    for (const { path, value } of flattened) {
        let current = result;

        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            const nextKey = path[i + 1];

            if (typeof nextKey === 'number') {
                // Next key is a number, so we need an array
                if (!(key in current)) {
                    current[key] = [];
                }
            } else {
                // Next key is a string, so we need an object
                if (!(key in current)) {
                    current[key] = {};
                }
            }

            current = current[key] as Record<string, unknown>;
        }

        // Set the final value
        const finalKey = path[path.length - 1];
        current[finalKey] = value;
    }

    return result;
};