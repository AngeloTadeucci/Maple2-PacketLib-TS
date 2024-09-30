export default interface ICrypter {
  encrypt(src: Uint8Array): void;
  encryptRange(src: Uint8Array, start: number, end: number): void;
  decrypt(src: Uint8Array): void;
  decryptRange(src: Uint8Array, start: number, end: number): void;
}
