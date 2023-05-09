import * as webpack from "webpack";

export class AssignShareScopePlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.thisCompilation.tap(
      AssignShareScopePlugin.name,
      (compilation) => {
        compilation.hooks.additionalChunkRuntimeRequirements.tap(
          AssignShareScopePlugin.name,
          (chunk, set) => {
            if (chunk.isOnlyInitial()) {
              set.add(webpack.RuntimeGlobals.shareScopeMap);
              set.add(webpack.RuntimeGlobals.global);

              const mod = new AssignShareScopeRuntimeModule();
              compilation.addRuntimeModule(chunk, mod);
            }
          }
        );
      }
    );
  }
}

class AssignShareScopeRuntimeModule extends webpack.RuntimeModule {
  constructor() {
    super(
      "assign window.__webpack_share_scopes__",
      webpack.RuntimeModule.STAGE_TRIGGER
    );
  }
  generate() {
    const { Template } = webpack;
    const shareScope = "__webpack_share_scopes__";

    return Template.asString([
      "",
      "(function () {",
      Template.indent([
        `if ("${shareScope}" in ${webpack.RuntimeGlobals.global}) { return; }`,
        // `webpack.RuntimeGlobals.global` resolves to `window` or `globalThis` depends on context
        `Object.defineProperty(${webpack.RuntimeGlobals.global}, "${shareScope}", {`,
        Template.indent([
          // use getter because the value might come later
          `get() { return ${webpack.RuntimeGlobals.shareScopeMap}; },`,
        ]),
        "});",
      ]),
      "})();",
      "",
    ]);
  }
}
