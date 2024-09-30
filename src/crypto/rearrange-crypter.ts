import ICrypter from "./crypter";

export default class RearrangeCrypter implements ICrypter {
  private static readonly INDEX: number = 1;

  public static getIndex(version: number): number {
    return ((version + RearrangeCrypter.INDEX) % 3) + 1;
  }

  public encrypt(src: Uint8Array): void {
    const len = src.length >> 1;
    for (let i = 0; i < len; i++) {
      const swap = src[i];
      src[i] = src[i + len];
      src[i + len] = swap;
    }
  }

  public encryptRange(src: Uint8Array, start: number, end: number): void {
    const len = (end - start) >> 1;
    const max = start + len;
    for (let i = start; i < max; i++) {
      const swap = src[i];
      src[i] = src[i + len];
      src[i + len] = swap;
    }
  }

  public decrypt(src: Uint8Array): void {
    const len = src.length >> 1;
    for (let i = 0; i < len; i++) {
      const swap = src[i];
      src[i] = src[i + len];
      src[i + len] = swap;
    }
  }

  public decryptRange(src: Uint8Array, start: number, end: number): void {
    const len = (end - start) >> 1;
    const max = start + len;
    for (let i = start; i < max; i++) {
      const swap = src[i];
      src[i] = src[i + len];
      src[i + len] = swap;
    }
  }
}
