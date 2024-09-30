export default class ByteReader {
  public buffer: Uint8Array;
  public length: number;
  public position: number;

  constructor(packet: Uint8Array, offset: number = 0) {
    this.buffer = packet;
    this.length = packet.length;
    this.position = offset;
  }

  get available(): number {
    return this.length - this.position;
  }

  protected checkLength(length: number): void {
    const index = this.position + length;
    if (index > this.length || index < this.position) {
      throw new RangeError(`Not enough space in packet: ${this}\n`);
    }
  }

  public read<T>(size: number): T {
    this.checkLength(size);
    const value = this.buffer.slice(this.position, this.position + size);
    this.position += size;
    return value as unknown as T;
  }

  public peek<T>(size: number): T {
    this.checkLength(size);
    const value = this.buffer.slice(this.position, this.position + size);
    return value as unknown as T;
  }

  public readBytes(count: number): Uint8Array {
    if (count === 0) {
      return new Uint8Array();
    }

    this.checkLength(count);
    const bytes = this.buffer.slice(this.position, this.position + count);
    this.position += count;
    return bytes;
  }

  public readBool(): boolean {
    return this.readByte() !== 0;
  }

  public readByte(): number {
    this.checkLength(1);
    return this.buffer[this.position++];
  }

  public readShort(): number {
    this.checkLength(2);
    const value = new DataView(this.buffer.buffer, this.position, 2).getInt16(
      0,
      true
    );
    this.position += 2;
    return value;
  }

  public readInt(): number {
    this.checkLength(4);
    const value = new DataView(this.buffer.buffer, this.position, 4).getInt32(
      0,
      true
    );
    this.position += 4;
    return value;
  }

  public readFloat(): number {
    this.checkLength(4);
    const value = new DataView(this.buffer.buffer, this.position, 4).getFloat32(
      0,
      true
    );
    this.position += 4;
    return value;
  }

  public readLong(): bigint {
    this.checkLength(8);
    const value = new DataView(
      this.buffer.buffer,
      this.position,
      8
    ).getBigInt64(0, true);
    this.position += 8;
    return value;
  }

  public readString(): string {
    const length = this.read<Uint16Array>(2)[0];
    return this.readRawString(length);
  }

  public readRawString(length: number): string {
    if (length === 0) {
      return "";
    }

    this.checkLength(length);
    const value = new TextDecoder("utf-8").decode(
      this.buffer.slice(this.position, this.position + length)
    );
    this.position += length;
    return value;
  }

  public readUnicodeString(): string {
    const length = this.read<Uint16Array>(2)[0];
    return this.readRawUnicodeString(length);
  }

  public readRawUnicodeString(length: number): string {
    if (length === 0) {
      return "";
    }

    this.checkLength(length * 2);
    const value = new TextDecoder("utf-16le").decode(
      this.buffer.slice(this.position, this.position + length * 2)
    );
    this.position += length * 2;
    return value;
  }

  public skip(count: number): void {
    const index = this.position + count;
    if (index > this.length || index < 0) {
      // Allow backwards seeking
      throw new RangeError(`Not enough space in packet: ${this}\n`);
    }
    this.position += count;
  }

  public toString(): string {
    return Array.from(this.buffer)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(" ");
  }
}
