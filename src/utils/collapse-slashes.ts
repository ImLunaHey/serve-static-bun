interface IOptions {
	removeLeading?: boolean;
	removeTrailing?: boolean;
}

/**
 * By default, collapses all leading, trailing and duplicate slashes into one.
 * Can also remove leading and trailing slashes entirely.
 *
 * @param {string} str The string to use
 * @param {IOptions?} options
 * @returns {string} New string with slashes normalized
 */

export default function collapseSlashes(
	str: string,
	options: IOptions = { removeLeading: false, removeTrailing: false }
): string {
	const { removeLeading, removeTrailing } = options;

	str = `/${str}/`;
	str = str.replaceAll(/[/]+/g, "/");

	if (removeLeading) {
		str = str.substring(1);
	}
	if (removeTrailing) {
		str = str.substring(0, str.length - 1);
	}

	return str;
}
