import type Context from "baojs/dist/context";
import { existsSync, readFileSync, statSync } from "node:fs";
import mime from "mime/lite";
import normalizeSlashes from "./utils/normalize-slashes";

type TMiddlewareMode = "bao";

interface IBaseOptions {
	index?: string | false;
	dirTrailingSlash?: boolean;
	collapseSlashes?: boolean;
	stripFromPathname?: string | false;
	headers?: HeadersInit;
	fileEncoding?: BufferEncoding;
	charset?: string;
}
interface IMiddlewareOptions extends IBaseOptions {
	handleErrors?: boolean;
	middlewareMode: TMiddlewareMode;
}
type TOptions = IBaseOptions | IMiddlewareOptions;

function isMiddleware(options: TOptions): options is IMiddlewareOptions {
	return !!(options as IMiddlewareOptions).middlewareMode;
}

const defaultOptions: TOptions = {
	index: "index.html",
	dirTrailingSlash: true,
	collapseSlashes: true,
	stripFromPathname: false,
	fileEncoding: "utf8",
	charset: "utf-8",
};

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
export default function serveStatic(root: string, options?: IBaseOptions): (req: Request) => Promise<Response>;

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
export default function serveStatic(root: string, options: IMiddlewareOptions): (ctx: Context) => Promise<Context>;

export default function serveStatic(root: string, options: TOptions) {
	options = { ...defaultOptions, ...options };
	const { index, dirTrailingSlash, collapseSlashes, stripFromPathname, headers, fileEncoding, charset } = options;

	function getPathname({ pathname }: URL): string {
		return stripFromPathname !== false ? pathname.replace(stripFromPathname, "") : pathname;
	}

	async function getResponse(req: Request): Promise<Response> {
		const pathname = getPathname(new URL(req.url));
		const filepath = `${process.cwd()}/${root}/${pathname}`;
		const exists = existsSync(filepath);
		const isFile = exists && statSync(filepath).isFile();

		// Redirect to path with normalized slashes
		let redirectPath = pathname;
		if (collapseSlashes) {
			redirectPath = normalizeSlashes(pathname, { removeTrailing: !pathname.endsWith("/") });
			if (isFile) {
				redirectPath = normalizeSlashes(pathname, { removeTrailing: true });
			}
		}

		// Add trailing slash
		if (dirTrailingSlash && exists && !isFile && !pathname.endsWith("/")) {
			redirectPath = `${redirectPath}/`;
		}

		if (redirectPath !== pathname) {
			return new Response(null, {
				headers: { ...headers, Location: redirectPath },
				status: 308,
			});
		}

		// If path does not exists
		if (!exists) {
			return new Response("404 Not Found", {
				headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
				status: 404,
			});
		}

		// If it is a file
		if (isFile) {
			const file = readFileSync(filepath, { encoding: fileEncoding });
			return new Response(file, {
				headers: { ...headers, "Content-Type": `${mime.getType(filepath)}; charset=${charset}` },
			});
		}

		// If it is a folder and it has an index
		if (index && existsSync(`${filepath}/${index}`)) {
			const file = readFileSync(`${filepath}/${index}`, {
				encoding: fileEncoding,
			});
			return new Response(file, {
				headers: {
					...headers,
					"Content-Type": `${mime.getType(`${filepath}/${index}`)}; charset=${charset}`,
				},
			});
		}

		// If it is a folder and has no index
		return new Response("403 Forbidden", {
			headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
			status: 403,
		});
	}

	if (isMiddleware(options)) {
		const { middlewareMode, handleErrors = true } = options;

		switch (middlewareMode) {
			case "bao":
				return async function (ctx: Context) {
					const res = await getResponse(ctx.req);
					switch (res.status) {
						case 403:
						case 404:
							return handleErrors ? ctx.sendRaw(res).forceSend() : ctx;

						default:
							return ctx.sendRaw(res).forceSend();
					}
				};

			default:
				break;
		}
	}

	return getResponse;
}
