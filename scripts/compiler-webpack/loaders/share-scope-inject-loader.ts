import webpack, { type LoaderContext } from "webpack";

/**
 * Injects share scope so that Webpack knows it's required & provided necessary runtime.
 */
export default function injectShareScopeLoader(
  this: LoaderContext<{}>,
  content: string
) {
  const __BAIL__ = "// hasShareScope";

  if (content.includes(__BAIL__)) {
    return content;
  }

  const result = [
    "(function() {",
    `${webpack.RuntimeGlobals.shareScopeMap};`,
    __BAIL__,
    "})();",
    content,
  ].join("\n");

  // Cache the generated result
  this.cacheable?.();

  return result;
}
