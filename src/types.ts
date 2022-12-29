import type { Errorlike } from "bun";

/**
 * Checks if an object is an error-like object, i.e. has a `code` property.
 *
 * @param error The error to check
 */
export function isErrorlike(error: any): error is Errorlike {
	return Object.hasOwn(error, "code");
}
