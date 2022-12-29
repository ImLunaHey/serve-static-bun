import type { Context } from "baojs/dist/context";
import getBaoMiddleware from "./middleware/bao";
import getFileInfo, { type FileInfo } from "./utils/get-file-info";

/**
 * Options for serveStatic().
 */
interface ServeStaticBaseOptions {
	/**
	 * The file to use as an index/fallback.
	 *
	 * Set to `null` to disable index files.
	 *
	 * @default "index.html"
	 */
	index?: string | null;

	/**
	 * Add trailing slashes to directory paths.
	 *
	 * @default true
	 */
	dirTrailingSlash?: boolean;

	/**
	 * Collapses all leading, trailing and duplicate slashes from pathname.
	 *
	 * @default true
	 */
	collapseSlashes?: boolean;

	/**
	 * Remove the first occurence of a string from the pathname.
	 */
	stripFromPathname?: string;

	/**
	 * Headers to send with the response.
	 *
	 * Note that the `Content-Type` header will be overwritten.
	 */
	headers?: HeadersInit;

	/**
	 * Allow or deny serving dotfiles (e.g. .gitignore)
	 *
	 * @default "deny"
	 */
	dotfiles?: "allow" | "deny";

	/**
	 * The default mime type to send when one cannot be determined.
	 *
	 * @default "text/plain"
	 */
	defaultMimeType?: string;

	/**
	 * The charset to send.
	 *
	 * @default "utf-8"
	 */
	charset?: string;
}

/**
 * Options for serveStatic() when used as a middleware.
 */
interface ServeStaticMiddlewareOptions extends ServeStaticBaseOptions {
	/**
	 * The type of middleware to generate.
	 */
	middlewareMode: "bao";

	/**
	 * If set to `false`, in the case of a 403 or 404 response, the unmodified context will be returned to Bao.js.
	 * This allows you to handle the error yourself.
	 *
	 * @default true
	 */
	handleErrors?: boolean;
}

/**
 * Type guard for ServeStaticMiddlewareOptions.
 */
function isMiddleware(options: ServeStaticOptions): options is ServeStaticMiddlewareOptions {
	return Object.hasOwn(options, "middlewareMode");
}

type ServeStaticOptions = ServeStaticBaseOptions | ServeStaticMiddlewareOptions;

/**
 * Get the correct pathname from the requested URL.
 * @param url The requested URL
 * @param stripFromPathname The string to remove from the pathname, if necessary
 */
function getPathname({ pathname }: URL, stripFromPathname: ServeStaticBaseOptions["stripFromPathname"]) {
	return stripFromPathname ? pathname.replace(stripFromPathname, "") : pathname;
}

/**
 * Get the normalized path to redirect to.
 * @param pathname The requested pathname
 * @param requestedFile The requested file
 * @param options The serveStatic() options
 */
async function getRedirectPath(
	pathname: string,
	{ isFile }: FileInfo,
	{ collapseSlashes, dirTrailingSlash }: Pick<ServeStaticBaseOptions, "collapseSlashes" | "dirTrailingSlash">
) {
	let redirectPath = pathname;

	// Normalize slashes
	if (collapseSlashes) {
		const pkg = await import("./utils/collapse-slashes");
		redirectPath = pkg.collapseSlashes(redirectPath, {
			keepTrailing: redirectPath.endsWith("/"), // Preserve trailing slash if it exists
		});
	}

	// Add trailing slash
	if (dirTrailingSlash && !isFile && !redirectPath.endsWith("/")) {
		redirectPath = `${redirectPath}/`;
	}

	return redirectPath;
}

/**
 * Get the file to serve, either the requested file or the folder's index file.
 * @param pathname The requested pathname
 * @param requestedFile The requested file
 * @param root The root path
 * @param options The serveStatic() options
 * @returns The file to serve, or null if none exists
 */
async function getFileToServe(
	pathname: string,
	requestedFile: FileInfo,
	root: string,
	{ index, dotfiles }: Pick<ServeStaticBaseOptions, "index" | "dotfiles">
) {
	const isDotfile = pathname.split("/").pop()?.startsWith(".");
	if (requestedFile.isFile && (!isDotfile || dotfiles === "allow")) {
		return requestedFile;
	}

	// If it is a folder and it has an index
	const indexFile = index === null ? null : await getFileInfo(`${root}/${pathname}/${index}`);
	if (indexFile?.exists && indexFile.isFile) {
		return indexFile;
	}

	return null;
}

/**
 * For use with {@link Bun.serve}'s fetch function directly.
 *
 * @example
 *
 * ```ts
 * import serveStatic from "serve-static-bun";
 *
 * Bun.serve({ fetch: serveStatic("frontend") });
 * ```
 * @param root The path to the static files to serve
 * @param options
 */
export default function serveStatic(
	root: string,
	options?: ServeStaticBaseOptions
): (req: Request) => Promise<Response>;

/**
 * For use as a bao middleware.
 *
 * @example
 *
 * Serve files with Bao.js
 *
 * ```ts
 * import Bao from "baojs";
 * import serveStatic from "serve-static-bun";
 *
 * const app = new Bao();
 *
 * // *any can be anything
 * // We need to strip /assets from the pathname, because when the root gets combined with the pathname, it results in /assets/assets/file.js.
 * app.get("/assets/*any", serveStatic("assets", { middlewareMode: "bao", stripFromPathname: "/assets" }));
 *
 * app.get("/", (ctx) => ctx.sendText("Hello Bao!"));
 *
 * app.listen();
 * ```
 *
 * @example
 *
 * Serve only static files with Bao.js
 *
 * **All** paths will be handled by `serve-static-bun`.
 *
 * ```ts
 * import Bao from "baojs";
 * import serveStatic from "serve-static-bun";
 *
 * const app = new Bao();
 *
 * // *any can be anything
 * app.get("/*any", serveStatic("web", { middlewareMode: "bao" }));
 *
 * app.listen();
 * ```
 * @param root The path to the static files to serve
 * @param options
 */
export default function serveStatic(
	root: string,
	options: ServeStaticMiddlewareOptions
): (ctx: Context) => Promise<Context>;

export default function serveStatic(root: string, options: ServeStaticOptions = {}) {
	root = `${process.cwd()}/${root}`;
	const {
		index = "index.html",
		dirTrailingSlash = true,
		collapseSlashes = true,
		stripFromPathname,
		headers,
		dotfiles = "deny",
		defaultMimeType = "text/plain",
		charset = "utf-8",
	} = options;
	const wantsMiddleware = isMiddleware(options);

	const getResponse = async (req: Request) => {
		const pathname = getPathname(new URL(req.url), stripFromPathname);
		const requestedFile = await getFileInfo(`${root}/${pathname}`);

		// If path does not exists, return 404
		if (!requestedFile.exists) {
			return new Response("404 Not Found", {
				status: 404,
				headers: {
					...headers,
					"Content-Type": `text/plain; charset=${charset}`,
				},
			});
		}

		// Redirect to normalized path, if needed
		const redirectPath = await getRedirectPath(pathname, requestedFile, { collapseSlashes, dirTrailingSlash });
		if (redirectPath !== pathname) {
			return new Response(undefined, {
				status: 308, // Permanent Redirect, cacheable
				headers: {
					...headers,
					Location: redirectPath,
				},
			});
		}

		// Serve file or index, if one of them exists
		const fileToServe = await getFileToServe(pathname, requestedFile, root, { index, dotfiles });
		if (fileToServe) {
			return new Response(fileToServe.blob, {
				headers: {
					...headers,
					"Content-Type": `${fileToServe.mimeType ?? defaultMimeType}; charset=${charset}`,
				},
			});
		}

		// Fallback to 403
		return new Response("403 Forbidden", {
			status: 403,
			headers: {
				...headers,
				"Content-Type": `text/plain; charset=${charset}`,
			},
		});
	};

	if (wantsMiddleware) {
		const { middlewareMode, handleErrors = true } = options;

		switch (middlewareMode) {
			case "bao":
				return getBaoMiddleware(getResponse, handleErrors);

			// No default
		}
	}

	return getResponse;
}
