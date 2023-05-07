import path from "path";
import { builtinModules } from "module";

import { ESBuildMinifyPlugin } from "esbuild-loader";
import type { RemixConfig } from "@remix-run/dev/dist/config";
import webpack from "webpack";
import VirtualModulesPlugin from "webpack-virtual-modules";

import * as obj from "./scripts/utils/object";
import { AssignShareScopePlugin } from "./scripts/compiler-webpack/assign-share-scope-plugin";

const BROWSER_ROUTE_PREFIX = "__remix_browser_route__";
const BROWSER_ROUTE_REGEX = new RegExp("/" + BROWSER_ROUTE_PREFIX);
const getBrowserRoutes = (remixConfig: RemixConfig): [string, string][] =>
  obj
    .entries(remixConfig.routes)
    .map(([id, route]) => [
      id,
      path.resolve(
        remixConfig.appDirectory,
        path.dirname(route.file),
        BROWSER_ROUTE_PREFIX + path.basename(route.file)
      ),
    ]);

const mode =
  process.env.NODE_ENV === "development" ? "development" : "production";

const mfShared = {
  react: { singleton: true, eager: true },
  "react-dom": { singleton: true, eager: true },
};

export const createBrowserConfig = (
  remixConfig: RemixConfig
): webpack.Configuration => {
  const browserRoutes = getBrowserRoutes(remixConfig);
  const entryExtras = {
    library: { type: "module" },
    chunkLoading: "import",
    runtime: "runtime",
  } as const;

  return {
    mode,
    devtool: mode === "development" ? "inline-cheap-source-map" : undefined,
    target: "web",
    resolve: {
      fallback: obj.fromEntries(builtinModules.map((m) => [m, false] as const)),
      alias: {
        "~": remixConfig.appDirectory,
      },
      extensions: [".tsx", ".ts", ".jsx", ".js"],
    },
    entry: {
      "entry.client": {
        import: path.resolve(
          remixConfig.appDirectory,
          remixConfig.entryClientFile
        ),
        ...entryExtras,
      },
      ...obj.fromEntries(
        browserRoutes.map(([id, routePath]) => [
          id,
          {
            import: routePath,
            ...entryExtras,
          },
        ])
      ),
    },
    module: {
      rules: [
        {
          test: /\.[j|t]sx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "esbuild-loader",
              options: {
                target: "es2019",
                loader: "tsx",
              },
            },
          ],
        },

        {
          test: /\.module\.css$/i,
          use: [
            {
              loader: require.resolve(
                "./scripts/compiler-webpack/loaders/remix-css-loader.ts"
              ),
              options: { emit: true },
            },
            {
              loader: "css-loader",
              options: { modules: true },
            },
          ],
        },
        {
          test: /\.css$/i,
          type: "asset/resource",
          exclude: /\.module\.css$/i,
        },

        {
          test: /\.server\./,
          loader: require.resolve(
            path.join(
              __dirname,
              "./scripts/compiler-webpack/loaders/empty-module-loader.ts"
            )
          ),
        },
        {
          test: BROWSER_ROUTE_REGEX,
          loader: require.resolve(
            path.join(
              __dirname,
              "./scripts/compiler-webpack/loaders/browser-route-loader.ts"
            )
          ),
          options: { remixConfig, browserRouteRegex: BROWSER_ROUTE_REGEX },
        },
      ],
    },
    experiments: {
      outputModule: true,
    },
    output: {
      path: remixConfig.assetsBuildDirectory,
      publicPath: remixConfig.publicPath,
      // publicPath: "auto",
      module: true,
      chunkFormat: "module",
      assetModuleFilename: "_assets/[name]-[contenthash][ext]",
      cssChunkFilename: "_assets/[name]-[contenthash][ext]",
      filename: "[name]-[contenthash].js",
      chunkFilename: "[name]-[contenthash].js",
    },
    optimization: {
      moduleIds: "deterministic",
      runtimeChunk: false,
      minimize: mode === "production",
      minimizer: [new ESBuildMinifyPlugin({ target: "es2019" })],
      // treeshake unused code in development
      // needed so that browser build does not pull in server code
      usedExports: true,
      innerGraph: true,
    },
    cache: false,
    plugins: [
      new webpack.container.ModuleFederationPlugin({
        name: "webapp",
        library: { type: "var", name: "webapp" },
        remoteType: "var",
        filename: "remoteEntry.js",
        exposes: {
          "./button": "./app/components/button",
        },
        shared: {
          ...mfShared,
        },
      }),
      new AssignShareScopePlugin(),

      new VirtualModulesPlugin(
        obj.fromEntries(browserRoutes.map(([, route]) => [route, ""] as const))
      ),

      new webpack.EnvironmentPlugin({
        REMIX_DEV_SERVER_WS_PORT: JSON.stringify(remixConfig.devServerPort),
      }),

      // shim react so it can be used without importing
      // new webpack.ProvidePlugin({ React: ["react"] }),
    ],
  };
};
