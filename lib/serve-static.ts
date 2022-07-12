import type Context from "baojs/dist/context";
import { existsSync, readFileSync, statSync } from "node:fs";
import mime from "mime/lite";
import normalizeSlashes from "./utils/normalize-slashes";

type TMiddlewareMode = "bao";

interface IBaseOptions {
  indexFile?: string;
}
interface IMiddlewareOptions extends IBaseOptions {
  middlewareMode: TMiddlewareMode;
}
type TOptions = IBaseOptions | IMiddlewareOptions;

function isMiddlewareOptions(options: TOptions): options is IMiddlewareOptions {
  return !!(options as IMiddlewareOptions).middlewareMode;
}

/**
 * For use with {@link Bun.serve}'s fetch function directly.
 *
 * @example
 *
 * ```ts
 * import serveStatic from "./serve-static";
 *
 * Bun.serve({ fetch: serveStatic("frontend") });
 * ```
 * @param path The path to the static files to serve
 * @param options Static files options (indexFile defaults to "index.html")
 */
export default function serveStatic(
  path: string,
  options?: IBaseOptions
): (req: Request) => Promise<Response>;

/**
 * For use as a bao middleware.
 *
 * @example
 *
 * ```ts
 * import Bao from "baojs";
 * import serveStatic from "./serve-static";
 *
 * const app = new Bao();
 *
 * app.get("/", serveStatic("frontend", { middlewareMode: "bao" });
 *
 * app.listen();
 * ```
 * @param path The path to the static files to serve
 * @param options Static files options (indexFile defaults to "index.html")
 */
export default function serveStatic(
  path: string,
  options: IMiddlewareOptions
): (ctx: Context) => Promise<Context>;

export default function serveStatic(path: string, options: TOptions) {
  const { indexFile = "index.html" } = options;

  async function getResponse(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);
    const filepath = `${process.cwd()}/${path}/${pathname}`;
    const exists = existsSync(filepath);
    const isFile = exists && statSync(filepath).isFile();

    // Redirect to path with normalized slashes
    let normalizedPath = normalizeSlashes(pathname);
    if (!exists) {
      normalizedPath = normalizeSlashes(pathname, {
        removeTrailing: !pathname.endsWith("/"),
      });
    } else if (isFile) {
      normalizedPath = normalizeSlashes(pathname, { removeTrailing: true });
    }

    if (normalizedPath !== pathname) {
      return new Response(null, {
        headers: { Location: normalizedPath },
        status: 307,
      });
    }

    // If path does not exists
    if (!exists) {
      return new Response("Not Found", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        status: 404,
      });
    }

    // If it is a file
    if (isFile) {
      const file = readFileSync(filepath, { encoding: "utf-8" });
      return new Response(file, {
        headers: { "Content-Type": `${mime.getType(filepath)}; charset=utf-8` },
      });
    }

    // If it is a folder and it has an index
    if (existsSync(`${filepath}/${indexFile}`)) {
      const file = readFileSync(`${filepath}/${indexFile}`, {
        encoding: "utf-8",
      });
      return new Response(file, {
        headers: {
          "Content-Type": `${mime.getType(
            `${filepath}/${indexFile}`
          )}; charset=utf-8`,
        },
      });
    }

    // If it is a folder and has no index
    return new Response("Forbidden", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: 403,
    });
  }

  if (isMiddlewareOptions(options)) {
    switch (options.middlewareMode) {
      case "bao":
        return async function (ctx: Context) {
          ctx.sendRaw(await getResponse(ctx.req));
          return ctx;
        };

      default:
        break;
    }
  }
  return getResponse;
}
