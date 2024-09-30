import ByteReader from "../tools/byte-reader";
import ByteWriter from "../tools/byte-writer";
import ICrypter from "./crypter";
import Rand32 from "./rand32";
import RearrangeCrypter from "./rearrange-crypter";
import TableCrypter from "./table-crypter";
import XORCrypter from "./xor-crypter";

export default class MapleCipher {
  private static readonly HEADER_SIZE = 6;

  private readonly version: number;
  private iv: number;

  private constructor(version: number, iv: number) {
    this.version = version;
    this.iv = iv;
  }

  private advanceIV() {
    this.iv = Rand32.crtRand(this.iv);
  }

  private static initCryptSeq(version: number, blockIV: number): ICrypter[] {
    const crypt: ICrypter[] = new Array(4);
    crypt[RearrangeCrypter.getIndex(version)] = new RearrangeCrypter();
    crypt[XORCrypter.getIndex(version)] = new XORCrypter(version);
    crypt[TableCrypter.getIndex(version)] = new TableCrypter(version);

    const cryptSeq: ICrypter[] = [];
    while (blockIV > 0) {
      const crypter = crypt[blockIV % 10];
      if (crypter) {
        cryptSeq.push(crypter);
      }
      blockIV = Math.floor(blockIV / 10);
    }

    return cryptSeq;
  }

  public static Encryptor = class {
    public readonly cipher: MapleCipher;
    public readonly encryptSeq: ICrypter[];

    constructor(version: number, iv: number, blockIV: number) {
      this.cipher = new MapleCipher(version, iv);
      this.encryptSeq = MapleCipher.initCryptSeq(version, blockIV);
    }

    public encodeSeqBase(): number {
      const encSeq = this.cipher.version ^ (this.cipher.iv >>> 16);
      this.cipher.advanceIV();
      return encSeq;
    }

    public writeHeader(
      packet: Uint8Array,
      offset: number,
      length: number
    ): ByteWriter {
      const encSeq = this.encodeSeqBase();

      const writer = new ByteWriter(length + MapleCipher.HEADER_SIZE);
      writer.writeShort(encSeq);
      writer.writeInt(length);
      writer.writeBytesWithOffset(packet, offset, length);

      return writer;
    }

    public encrypt(
      packet: Uint8Array,
      offset: number,
      length: number
    ): ByteWriter {
      const result = this.writeHeader(packet, offset, length);
      for (const crypter of this.encryptSeq) {
        crypter.encryptRange(
          result.buffer,
          MapleCipher.HEADER_SIZE,
          MapleCipher.HEADER_SIZE + length
        );
      }

      return result;
    }

    public encryptWriter(packet: ByteWriter): ByteWriter {
      return this.encrypt(packet.buffer, 0, packet.length);
    }
  };

  public static Decryptor = class {
    public readonly cipher: MapleCipher;
    public readonly decryptSeq: ICrypter[];

    constructor(version: number, iv: number, blockIV: number) {
      this.cipher = new MapleCipher(version, iv);
      const cryptSeq = MapleCipher.initCryptSeq(version, blockIV);
      cryptSeq.reverse();
      this.decryptSeq = cryptSeq;
    }

    public decodeSeqBase(encSeq: number): number {
      const decSeq = (this.cipher.iv >>> 16) ^ encSeq;
      this.cipher.advanceIV();
      return decSeq;
    }

    public tryDecrypt(buffer: Uint8Array): {
      packet: ByteReader | null;
      size: number;
    } {
      if (buffer.length < MapleCipher.HEADER_SIZE) {
        return { packet: null, size: 0 };
      }

      const reader = new ByteReader(buffer);
      const encSeq = reader.readShort();
      const packetSize = reader.readInt();
      const rawPacketSize = MapleCipher.HEADER_SIZE + packetSize;
      if (buffer.length < rawPacketSize) {
        return { packet: null, size: 0 };
      }

      const decSeq = this.decodeSeqBase(encSeq);
      if (decSeq !== this.cipher.version) {
        throw new Error(`Packet has invalid sequence header: ${decSeq}`);
      }

      const data = new Uint8Array(packetSize);
      data.set(
        buffer.slice(
          MapleCipher.HEADER_SIZE,
          MapleCipher.HEADER_SIZE + packetSize
        )
      );
      for (const crypter of this.decryptSeq) {
        crypter.decryptRange(data, 0, packetSize);
      }

      const packet = new ByteReader(data, packetSize);
      return { packet, size: rawPacketSize };
    }

    public decrypt(rawPacket: Uint8Array, offset = 0): ByteReader {
      const reader = new ByteReader(rawPacket, offset);

      const encSeq = reader.readShort();
      const decSeq = this.decodeSeqBase(encSeq);
      if (decSeq !== this.cipher.version) {
        throw new Error(`Packet has invalid sequence header: ${decSeq}`);
      }

      const packetSize = reader.readInt();
      if (rawPacket.length < packetSize + MapleCipher.HEADER_SIZE) {
        throw new Error(`Packet has invalid length: ${rawPacket.length}`);
      }

      const packet = reader.readBytes(packetSize);
      for (const crypter of this.decryptSeq) {
        crypter.decrypt(packet);
      }

      return new ByteReader(packet);
    }
  };
}
