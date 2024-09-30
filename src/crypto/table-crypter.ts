import ICrypter from "./crypter";
import Rand32 from "./rand32";

export default class TableCrypter implements ICrypter {
  private static readonly INDEX = 3;
  private static readonly TABLE_SIZE = 256;

  private decrypted: Uint8Array;
  private encrypted: Uint8Array;

  constructor(version: number) {
    this.decrypted = new Uint8Array(TableCrypter.TABLE_SIZE);
    this.encrypted = new Uint8Array(TableCrypter.TABLE_SIZE);

    // Init
    for (let i = 0; i < TableCrypter.TABLE_SIZE; i++) {
      this.encrypted[i] = i;
    }
    TableCrypter.shuffle(this.encrypted, version);
    for (let i = 0; i < TableCrypter.TABLE_SIZE; i++) {
      this.decrypted[this.encrypted[i]] = i;
    }
  }

  public static getIndex(version: number): number {
    return ((version + TableCrypter.INDEX) % 3) + 1;
  }

  public encrypt(src: Uint8Array): void {
    this.encryptRange(src, 0, src.length);
  }

  public encryptRange(
    src: Uint8Array,
    start: number = 0,
    end: number = src.length
  ): void {
    for (let i = start; i < end; i++) {
      src[i] = this.encrypted[src[i]];
    }
  }

  public decrypt(src: Uint8Array): void {
    this.decryptRange(src, 0, src.length);
  }

  public decryptRange(
    src: Uint8Array,
    start: number = 0,
    end: number = src.length
  ): void {
    for (let i = start; i < end; i++) {
      src[i] = this.decrypted[src[i]];
    }
  }

  private static shuffle(data: Uint8Array, version: number): void {
    const rand32 = new Rand32(Math.pow(version, 2));
    for (let i = TableCrypter.TABLE_SIZE - 1; i >= 1; i--) {
      const rand = rand32.random() % (i + 1);

      const swap = data[i];
      data[i] = data[rand];
      data[rand] = swap;
    }
  }
}
