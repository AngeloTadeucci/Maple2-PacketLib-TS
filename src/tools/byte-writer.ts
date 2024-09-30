export default class ByteWriter {
  protected static readonly DEFAULT_SIZE: number = 512;

  public buffer: Uint8Array;
  public length: number;

  constructor(size: number = ByteWriter.DEFAULT_SIZE) {
    this.buffer = new Uint8Array(size);
    this.length = 0;
  }

  get remaining(): number {
    return this.buffer.length - this.length;
  }

  private ensureCapacity(length: number): void {
    const required = this.length + length;
    if (this.buffer.length >= required) {
      return;
    }

    let newSize = this.buffer.length * 2;
    while (newSize < required) {
      newSize *= 2;
    }

    this.resizeBuffer(newSize);
  }

  protected resizeBuffer(newSize: number): void {
    const copy = new Uint8Array(newSize);
    copy.set(this.buffer.subarray(0, this.length));
    this.buffer = copy;
  }

  public seek(position: number): void {
    if (position < 0 || position > this.buffer.length) {
      return;
    }

    this.length = position;
  }

  public write<T>(value: T): void {
    const size = this.sizeOf(value);
    this.ensureCapacity(size);
    const view = new DataView(this.buffer.buffer, this.length, size);
    this.writeValue(view, value);
    this.length += size;
  }

  private sizeOf<T>(value: T): number {
    if (typeof value === "number") {
      return 4; // Assuming 32-bit integer
    } else if (typeof value === "boolean") {
      return 1;
    } else if (typeof value === "string") {
      return value.length * 2; // UTF-16
    } else {
      throw new Error("Unsupported type");
    }
  }

  private writeValue<T>(view: DataView, value: T): void {
    if (typeof value === "number") {
      view.setInt32(0, value as number, true);
    } else if (typeof value === "boolean") {
      view.setUint8(0, value ? 1 : 0);
    } else if (typeof value === "string") {
      for (let i = 0; i < (value as string).length; i++) {
        view.setUint16(i * 2, (value as string).charCodeAt(i), true);
      }
    } else {
      throw new Error("Unsupported type");
    }
  }

  public writeBytes(value: Uint8Array): void {
    this.writeBytesWithOffset(value, 0, value.length);
  }

  public writeBytesWithOffset(
    value: Uint8Array,
    offset: number,
    length: number
  ): void {
    if (length === 0) {
      return;
    }

    this.ensureCapacity(length);
    this.buffer.set(value.subarray(offset, offset + length), this.length);
    this.length += length;
  }

  public writeBool(value: boolean): void {
    this.ensureCapacity(1);
    this.buffer[this.length++] = value ? 1 : 0;
  }

  public writeByte(value: number = 0): void {
    this.ensureCapacity(1);
    this.buffer[this.length++] = value;
  }

  public writeShort(value: number = 0): void {
    this.ensureCapacity(2);
    new DataView(this.buffer.buffer).setInt16(this.length, value, true);
    this.length += 2;
  }

  public writeInt(value: number = 0): void {
    this.ensureCapacity(4);
    new DataView(this.buffer.buffer).setInt32(this.length, value, true);
    this.length += 4;
  }

  public writeFloat(value: number = 0): void {
    this.ensureCapacity(4);
    new DataView(this.buffer.buffer).setFloat32(this.length, value, true);
    this.length += 4;
  }

  public writeLong(value: bigint = BigInt(0)): void {
    this.ensureCapacity(8);
    new DataView(this.buffer.buffer).setBigInt64(this.length, value, true);
    this.length += 8;
  }

  public writeString(value: string = ""): void {
    this.writeShort(value.length);
    this.writeRawString(value);
  }

  public writeRawString(value: string): void {
    const length = value.length;
    if (length === 0) {
      return;
    }

    this.ensureCapacity(length);
    for (let i = 0; i < length; i++) {
      this.buffer[this.length++] = value.charCodeAt(i);
    }
  }

  public writeUnicodeString(value: string = ""): void {
    this.writeShort(value.length);
    this.writeRawUnicodeString(value);
  }

  public writeRawUnicodeString(value: string): void {
    const length = value.length * 2;
    if (length === 0) {
      return;
    }

    this.ensureCapacity(length);
    for (let i = 0; i < value.length; i++) {
      new DataView(this.buffer.buffer).setUint16(
        this.length + i * 2,
        value.charCodeAt(i),
        true
      );
    }
    this.length += length;
  }

  public toArray(): Uint8Array {
    return this.buffer.subarray(0, this.length);
  }

  public toString(): string {
    return Array.from(this.buffer.subarray(0, this.length))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(" ");
  }
}
