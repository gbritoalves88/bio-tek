// src/app/shared/polyfills/uint8array-tohex.polyfill.ts

let aplicado = false;

export function aplicarPolyfillsPdfjs(): void {
  if (aplicado) return;

  // 1. Polyfill de Uint8Array.prototype.toHex
  if (typeof Uint8Array.prototype.toHex === 'undefined') {
    Object.defineProperty(Uint8Array.prototype, 'toHex', {
      value(this: Uint8Array): string {
        let hex = '';
        for (let i = 0; i < this.length; i++) {
          hex += this[i].toString(16).padStart(2, '0');
        }
        return hex;
      },
      writable: true,
      configurable: true,
      enumerable: false
    });
    console.log('✅ Polyfill Uint8Array.prototype.toHex aplicado');
  }

  // 2. Polyfill de Map.prototype.getOrInsertComputed
  if (typeof (Map.prototype as any).getOrInsertComputed === 'undefined') {
    Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
      value(key: any, callbackFn: (key: any) => any) {
        if (this.has(key)) {
          return this.get(key);
        }
        const value = callbackFn(key);
        this.set(key, value);
        return value;
      },
      writable: true,
      configurable: true,
      enumerable: false
    });
    console.log('✅ Polyfill Map.prototype.getOrInsertComputed aplicado');
  }

  aplicado = true;
}
