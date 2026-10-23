// src/types/uint8array.d.ts
// Augmentation para Uint8Array.prototype.toHex() (ES2025 / Chrome 133+ / Node 22+).
// O TypeScript ainda não inclui este método nas libs estáveis.
// O polyfill em runtime fica em: src/app/shared/polyfills/uint8array-tohex.polyfill.ts

export {};

declare global {
  interface Uint8Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> {
    /**
     * Representação hexadecimal da array de bytes.
     * Nativo no Chrome 133+ e Node.js 22+.
     * Polyfill aplicado em runtime para WebView Android legado.
     */
    toHex(): string;
  }
}
