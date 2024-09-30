import { BinaryReader } from "@picode/binary-reader";
import { readFileSync } from "fs";
import { MapleLocale } from "./maple-locale";
import MaplePacket from "./maple-packet";

/**
 * Class representing an MSB file reader.
 *
 * @remarks
 * This class is designed to read and parse MSB files, extracting metadata and packets.
 * On initialization, the metadata is read and stored in the `metadata` property.
 * The `readPackets` function is designed to run only once.
 *
 * @example
 * ```typescript
 * const fileBuffer = fs.readFileSync('path/to/file.msb');
 * const msbReader = new MsbReader(fileBuffer);
 * const packets = msbReader.readPackets();
 * ```
 */
export default class MsbReader {
  private readonly TICKS_AT_EPOCH = 621355968000000000n; // Ticks from 0001-01-01 to 1970-01-01
  private readonly TICKS_PER_MILLISECOND = 10000n;
  private reader: BinaryReader;

  public version: number | undefined;
  public metadata: MsbMetadata | undefined;
  public packets: MaplePacket[] | undefined;

  constructor(filePath: string) {
    if (!filePath) {
      throw new Error("Invalid file path");
    }
    const fileBuffer = readFileSync(filePath);
    this.reader = new BinaryReader(fileBuffer);
    const [version, metadata] = this.readMetadata();
    this.version = version;
    this.metadata = metadata;
  }

  /**
   * Reads packets from the binary data using the reader and returns an array of `MaplePacket` objects.
   * If packets have already been read, it returns the cached packets.
   *
   * @returns {MaplePacket[] | undefined} An array of `MaplePacket` objects or `undefined` if reading packets fails.
   * @throws {Error} Throws an error if metadata is not initialized or if reading packets fails.
   */
  public readPackets(): MaplePacket[] | undefined {
    if (this.packets) {
      return this.packets;
    }

    if (this.version === undefined || this.metadata === undefined) {
      throw new Error("Metadata not initialized!?");
    }

    const packets: MaplePacket[] = [];

    try {
      while (this.reader.offset < this.reader.binary.length) {
        const timestamp = this.reader.readUint64();
        let size =
          this.version < 0x2027
            ? this.reader.readUint16()
            : this.reader.readInt32();
        const opcode = this.reader.readUint16();
        let outbound: boolean;

        if (this.version >= 0x2020) {
          outbound = this.reader.readUint8() !== 0;
        } else {
          outbound = (size & 0x8000) !== 0;
          size = size & 0x7fff;
        }

        const buffer = this.reader.readUint8Array(size);
        if (this.version >= 0x2025 && this.version < 0x2030) {
          this.reader.readUint32(); // preDecodeIV
          this.reader.readUint32(); // postDecodeIV
        }

        const msSinceUnixEpoch =
          (timestamp - this.TICKS_AT_EPOCH) / this.TICKS_PER_MILLISECOND;

        const date = new Date(Number(msSinceUnixEpoch));

        const packet = new MaplePacket(
          date,
          outbound,
          this.metadata.Build,
          opcode,
          buffer
        );
        packets.push(packet);
      }
    } catch (error) {
      throw new Error(`Failed to read packets: ${error}`);
    }

    this.packets = packets;

    return this.packets;
  }

  private readMetadata(): [number, MsbMetadata] {
    if (this.version !== undefined && this.metadata !== undefined) {
      return [this.version, this.metadata];
    }

    const version = this.reader.readUint16();

    const metadata = new MsbMetadata();
    try {
      if (version < 0x2000) {
        metadata.Build = version;
        metadata.LocalPort = this.reader.readUint16();
        metadata.Locale = MapleLocale.Unknown;
      } else {
        const v1 = (version >> 12) & 0xf;
        const v2 = (version >> 8) & 0xf;
        const v3 = (version >> 4) & 0xf;
        const v4 = version & 0xf;

        switch (version) {
          case 0x2012:
            metadata.Locale = this.reader.readUint16();
            metadata.Build = this.reader.readUint16();
            metadata.LocalPort = this.reader.readUint16();
            break;
          case 0x2014:
            metadata.LocalEndpoint = this.readString();
            metadata.LocalPort = this.reader.readUint16();
            metadata.RemoteEndpoint = this.readString();
            metadata.RemotePort = this.reader.readUint16();

            metadata.Locale = this.reader.readUint16();
            metadata.Build = this.reader.readUint16();
            break;
          default:
            if (version >= 0x2015) {
              metadata.LocalEndpoint = this.readString();
              metadata.LocalPort = this.reader.readUint16();
              metadata.RemoteEndpoint = this.readString();
              metadata.RemotePort = this.reader.readUint16();

              metadata.Locale = this.reader.readInt8();
              metadata.Build = this.reader.readUint32();
            } else {
              const message = `Invalid msb file, version: ${v1}.${v2}.${v3}.${v4}`;
              throw new Error(message);
            }
        }
      }
    } catch (error) {
      throw new Error(`Failed to read metadata: ${error}`);
    }
    return [version, metadata];
  }

  private readString(): string {
    const length = this.reader.readUint8();
    const str = this.reader.binary
      .slice(this.reader.offset, this.reader.offset + length)
      .toString();
    this.reader.offset += length;
    return str;
  }
}

export class MsbMetadata {
  public LocalEndpoint: string;
  public LocalPort: number;
  public RemoteEndpoint: string;
  public RemotePort: number;
  public Locale: number;
  public Build: number;

  constructor() {
    this.LocalEndpoint = "";
    this.LocalPort = 0;
    this.RemoteEndpoint = "";
    this.RemotePort = 0;
    this.Locale = 0;
    this.Build = 0;
  }

  public toString(): string {
    return `LocalEndpoint: ${this.LocalEndpoint}, LocalPort: ${this.LocalPort}, RemoteEndpoint: ${this.RemoteEndpoint}, RemotePort: ${this.RemotePort}, Locale: ${this.Locale}, Build: ${this.Build}`;
  }
}
