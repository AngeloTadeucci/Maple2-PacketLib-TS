import ByteReader from "./byte-reader";
import { MapleLocale } from "./maple-locale";

export default class MaplePacket {
  public timestamp: Date;
  public outbound: boolean;
  public version: number;
  public locale: number;
  public opcode: number;

  private readonly buffer: Uint8Array;
  private readonly reader: ByteReader;

  constructor(
    timestamp: Date,
    outbound: boolean,
    version: number,
    opcode: number,
    buffer: Uint8Array
  ) {
    this.timestamp = timestamp;
    this.outbound = outbound;
    this.version = version;
    this.locale = MapleLocale.Unknown;
    this.opcode = opcode;
    this.buffer = buffer;
    this.reader = new ByteReader(buffer);
  }

  get position(): number {
    return this.reader.position;
  }

  get length(): number {
    return this.buffer.length;
  }

  get available(): number {
    return this.reader.available;
  }

  reset(): void {
    this.reader.skip(-this.reader.position);
  }

  search(pattern: Uint8Array, start: number = 0): number {
    if (!pattern || start < 0) {
      return -1;
    }

    for (let i = start; i <= this.buffer.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; match && j < pattern.length; j++) {
        match = this.buffer[i + j] === pattern[j];
      }

      if (match) {
        return i;
      }
    }

    return -1;
  }

  getReadSegment(length: number): Uint8Array {
    return this.buffer.slice(
      this.reader.position,
      this.reader.position + length
    );
  }

  getSegment(offset: number, length: number): Uint8Array {
    return this.buffer.slice(offset, offset + length);
  }

  readByte(): number {
    return this.reader.readByte();
  }

  readBytes(count: number): Uint8Array {
    return this.reader.readBytes(count);
  }

  skip(count: number): void {
    this.reader.skip(count);
  }

  private toHexString(): string {
    return Array.from(this.buffer)
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
      .join(" ");
  }

  toString(): string {
    return `[${this.timestamp.toISOString()}][${
      this.outbound ? "OUT" : "IN "
    }] [${this.opcode.toString(16).toUpperCase()}] ${this.toHexString()}`;
  }
}
