import type { RemixConfig } from "@remix-run/dev/dist/config";
import esbuild from "esbuild";
import type webpack from "webpack";

import { getExports } from "../get-exports";

const BROWSER_EXPORTS = [
  "CatchBoundary",
  "ErrorBoundary",
  "default",
  "handle",
  "links",
  "meta",
  "unstable_shouldReload",
] as const;

async function treeshakeBrowserExports(
  routePath: string,
  remixConfig: RemixConfig
): Promise<string> {
  const xports = getExports(routePath, remixConfig);
  const browserExports = xports.filter((xport) =>
    (BROWSER_EXPORTS as unknown as string[]).includes(xport)
  );
  const reactComponentExports = browserExports.filter((xport) =>
    ["CatchBoundary", "ErrorBoundary", "default"].includes(xport)
  );
  const otherExports = browserExports.filter(
    (xport) => !["CatchBoundary", "ErrorBoundary", "default"].includes(xport)
  );

  // tree-shake & lazy imports
  const results = (
    await Promise.all(
      browserExports.map(async (xport) => {
        return [
          xport,
          await build(
            `export { ${xport} } from "${routePath}";`,
            routePath,
            remixConfig
          ),
        ];
      })
    )
  ).reduce<Record<string, string>>((acc, [xport, content]) => {
    acc[xport] = content;
    return acc;
  }, {});

  let virtual = "";

  if (reactComponentExports.length !== 0) {
    virtual += `import { lazy } from "react";\n`;

    for (const C of reactComponentExports) {
      virtual +=
        C === "default"
          ? `export default lazy(() => import("${C}").then((mod) => ({ default: mod.default })));`
          : `export const ${C} = lazy(() => import("${C}").then((mod) => ({ default: mod.${C} })));`;
      virtual += "\n";
    }
  }
  if (otherExports.length !== 0) {
    for (const xport of otherExports) {
      virtual += `export { ${xport} } from "${xport}";\n`;
    }
  }
  virtual ||= "module.exports = {};";

  const { outputFiles } = await esbuild.build({
    stdin: { contents: virtual, resolveDir: remixConfig.rootDirectory },
    format: "esm",
    target: "es2018",
    treeShaking: true,
    write: false,
    // sourcemap: "inline",
    bundle: true,
    plugins: [
      {
        name: "virtuals",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (results[args.path]) {
              return { path: args.path, namespace: "virtuals" };
            }
            if (args.path === routePath) return undefined;
            return { external: true, sideEffects: false };
          });
          build.onLoad({ filter: /.*/, namespace: "virtuals" }, (args) => {
            return {
              contents: results[args.path],
              resolveDir: remixConfig.rootDirectory,
            };
          });
        },
      },
    ],
  });
  const result = outputFiles[0].text;
  return result;
}

async function build(
  contents: string,
  routePath: string,
  remixConfig: RemixConfig
) {
  const { outputFiles } = await esbuild.build({
    stdin: { contents, resolveDir: remixConfig.rootDirectory },
    format: "esm",
    target: "es2018",
    treeShaking: true,
    write: false,
    sourcemap: "inline",
    bundle: true,
    plugins: [
      {
        name: "externals",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path === routePath) return undefined;
            return { external: true, sideEffects: false };
          });
        },
      },
    ],
  });
  const result = outputFiles[0].text;
  return result;
}

export default async function BrowserRoutesLoader(
  this: webpack.LoaderContext<{
    remixConfig: RemixConfig;
    browserRouteRegex: RegExp;
  }>
) {
  const callback = this.async();
  this.cacheable(false);
  const { remixConfig, browserRouteRegex } = this.getOptions();
  const routePath = this.resource.replace(browserRouteRegex, "/");
  const browserRouteVirtualModule = await treeshakeBrowserExports(
    routePath,
    remixConfig
  );
  callback(undefined, browserRouteVirtualModule);
}
