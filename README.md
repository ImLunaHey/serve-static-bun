# serve-static-bun

[![npm version](https://img.shields.io/npm/v/serve-static-bun?style=flat-square)](https://npm.im/serve-static-bun)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/serve-static-bun?style=flat-square)](https://npm.im/serve-static-bun)
[![npm downloads](https://img.shields.io/npm/dt/serve-static-bun?style=flat-square)](https://npm.im/serve-static-bun)

Serve static files using `Bun.serve` or Bao.js.

Currently in beta. Aiming for similar features as [`expressjs/serve-static`](https://github.com/expressjs/serve-static).

## Install

This is a [Bun](https://bun.sh/) module available through the [npm registry](https://www.npmjs.com/). Installation is done using the [`bun install` command](https://github.com/oven-sh/bun#bun-install):

```sh
bun install serve-static-bun
```

## Usage

```js
import serveStatic from "serve-static-bun";
```

### `serveStatic(root, options)`

Create a new middleware function to serve files from within a given root directory. The file to serve will be determined by combining `req.url` with the provided root directory.

When a file is not found, it will send a 404 response. If a directory is accessed, but no index file is found, a 403 response will be sent.

When used in middleware mode, the 404 and 403 responses will not be sent and will instead return the context to Bao.js, so that other routes can continue.

By default, slashes are automatically collapsed in the path, and a trailing slash is added when the path is a directory. For example, if you have `blog/example/index.html` and access `https://example.com//blog///example`, it will redirect to `https://example.com/blog/example/`.

#### Options

##### `index`

By default this module will send "index.html" files in response to a request on a directory. To disable this, set it to `null`. To supply a new index, pass a string.

##### `dirTrailingSlash`

Redirect to trailing "/" when the pathname is a dir. Defaults to `true`.

##### `collapseSlashes`

Collapse all slashes in the pathname (`//blog///test` => `/blog/test`). Defaults to `true`.

##### `stripFromPathname`

Removes the first occurence of the specified string from the pathname. Is not defined by default (no stripping).

##### `headers`

Headers to add to the response. The "Content-Type" header cannot be overwritten. If you want to change the charset, use the `charset` option. If `collapseSlashes` or `dirTrailingSlash` is set, a "Location" header will be set if the pathname needs to be changed.

##### `dotfiles`

This option allows you to configure how the module handles dotfiles, i.e. files or directories that begin with a dot ("."). Dotfiles return a 403 by default (when this is set to "deny"), but this can be changed with this option.

##### `defaultMimeType`

The default mime type to send in the "Content-Type" HTTP header, when the file's cannot be determined. Defaults to `text/plain`.

##### `charset`

The "Content-Type" HTTP header charset parameter. Defaults to `utf-8`.

#### Middleware mode options

##### `middlewareMode`

When set to `"bao"`, it will return a Bao.js compatible handler function instead.

##### `handleErrors`

If set to `false`, in the case of a 403 or 404 response, the unmodified context will be returned to Bao.js. This allows you to handle the error yourself.  
If set to `true`, the error response will be sent to the client, without continuing the middleware chain.  
Defaults to `false`.

## Examples

### Serve files with vanilla `Bun.serve`

```ts
import serveStatic from "serve-static-bun";

Bun.serve({ fetch: serveStatic("public") });
```

### Serve files with Bao.js

```ts
import Bao from "baojs";
import serveStatic from "serve-static-bun";

const app = new Bao();

// *any can be anything
// We need to strip /assets from the pathname, because when the root gets combined with the pathname,
// it results in /assets/assets/file.js.
app.get(
	"/assets/*any",
	serveStatic("assets", { middlewareMode: "bao", stripFromPathname: "/assets" }),
);

app.get("/", (ctx) => ctx.sendText("Hello Bao!"));

app.listen();
```

### Serve only static files with Bao.js

**All** paths will be handled by `serve-static-bun`.

```ts
import Bao from "baojs";
import serveStatic from "serve-static-bun";

const app = new Bao();

// *any can be anything
app.get("/*any", serveStatic("web", { middlewareMode: "bao" }));

app.listen();
```

## License

[MIT](LICENSE)
