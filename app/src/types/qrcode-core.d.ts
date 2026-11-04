declare module 'qrcode/lib/core/qrcode' {
  export function create(text: string, opts?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }): { modules: { size: number; get: (x: number, y: number) => number | boolean } };
}
