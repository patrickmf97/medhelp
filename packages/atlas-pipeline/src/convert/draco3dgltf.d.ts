/**
 * Minimal local type shim for the untyped `draco3dgltf` package (the Draco WASM encoder/decoder
 * modules distributed for glTF use — see https://www.npmjs.com/package/draco3dgltf). Its real
 * module exports are Emscripten-generated WASM bindings with no published .d.ts; the only shapes
 * we rely on are the two factory functions, whose resolved modules are passed straight through
 * to @gltf-transform/extensions as opaque `unknown` dependencies (registerDependencies expects
 * `unknown`, so we never need to describe the module's internals here).
 */
declare module 'draco3dgltf' {
  export function createDecoderModule(): Promise<unknown>;
  export function createEncoderModule(): Promise<unknown>;
}
