import ICrypter from "./crypter";
import Rand32 from "./rand32";

class XORCrypter implements ICrypter {
  private static readonly INDEX: number = 2;
  private readonly table: Uint8Array;

  constructor(version: number) {
    this.table = new Uint8Array(2);

    // Init
    const rand1 = new Rand32(version);
    const rand2 = new Rand32(2 * version);

    this.table[0] = Math.floor(rand1.randomFloat() * 255);
    this.table[1] = Math.floor(rand2.randomFloat() * 255);
  }

  public static getIndex(version: number): number {
    return ((version + XORCrypter.INDEX) % 3) + 1;
  }

  public encrypt(src: Uint8Array): void {
    this.encryptRange(src, 0, src.length);
  }

  public encryptRange(src: Uint8Array, start: number, end: number): void {
    for (let i = start; i < end; i++) {
      src[i] ^= this.table[i & 1];
    }
  }

  public decrypt(src: Uint8Array): void {
    this.decryptRange(src, 0, src.length);
  }

  public decryptRange(src: Uint8Array, start: number, end: number): void {
    for (let i = start; i < end; i++) {
      src[i] ^= this.table[i & 1];
    }
  }
}

export default XORCrypter;
