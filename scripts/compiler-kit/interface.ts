import type { AssetsManifest } from "@remix-run/dev/dist/compiler/assets";
import { RemixConfig } from "@remix-run/dev/dist/config";

import { ReadChannel, WriteChannel } from "../utils/channel";

export interface BrowserCompiler {
  // produce ./public/build/
  build: (manifestChannel: WriteChannel<AssetsManifest>) => Promise<void>;
  dispose: () => void;
}
export interface ServerCompiler {
  // produce ./build/index.js
  build: (manifestChannel: ReadChannel<AssetsManifest>) => Promise<void>;
  dispose: () => void;
}
export type CreateCompiler<T extends BrowserCompiler | ServerCompiler> = (
  config: RemixConfig
) => T;

export interface RemixCompiler {
  browser: BrowserCompiler;
  server: ServerCompiler;
}
