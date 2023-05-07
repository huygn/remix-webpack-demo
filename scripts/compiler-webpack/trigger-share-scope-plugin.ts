import * as webpack from "webpack";

export class TriggerShareScopePlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.thisCompilation.tap(
      TriggerShareScopePlugin.name,
      (compilation) => {
        compilation.hooks.additionalChunkRuntimeRequirements.tap(
          TriggerShareScopePlugin.name,
          (chunk, set) => {
            if (chunk.isOnlyInitial()) {
              set.add(webpack.RuntimeGlobals.shareScopeMap);
              const mod = new webpack.RuntimeModule(
                "trigger share scope",
                webpack.RuntimeModule.STAGE_TRIGGER
              );
              mod.generate = () => `(function noop() {})();`;
              compilation.addRuntimeModule(chunk, mod);
            }
          }
        );
      }
    );
  }
}
