import { unlink, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "path";
import MsbReader from "../tools/file-loader";
import { statSync } from "node:fs";
import { getAllFiles, hashFile } from "../utils/helpers";

interface MetadataCache {
  path: string;
  hash: string;
  version: number;
  packets: { [key: string]: Packet };
}

interface Packet {
  opcode: number;
  outbound: boolean;
  modes: number[];
}

export const createMetadataCache = async (folderPath: string) => {
  const allFiles = await getAllFiles(folderPath);

  const msbFiles = allFiles.filter((file) => file.endsWith(".msb"));

  if (msbFiles.length === 0) {
    console.log("No MSB files found");
    return;
  }

  const metadataCache: MetadataCache[] = [];

  let i = 1;
  for (const file of msbFiles) {
    process.stdout.write(`Processing ${i}/${msbFiles.length} ...\r`);
    i++;

    const reader = new MsbReader(file);

    const version = reader.version;
    const filePackets = reader.readPackets();
    if (!filePackets || !version) {
      continue;
    }

    const filterPackets = filePackets.filter((packet) => {
      if (!packet.outbound) {
        switch (packet.opcode) {
          case 0x11:
          case 0x12:
            return false;

          default:
            return true;
        }
      }

      switch (packet.opcode) {
        case 0x0b:
        case 0x12:
          return false;

        default:
          return true;
      }
    });

    const cachePackets: { [key: string]: Packet } = {};

    for (const packet of filterPackets) {
      if (packet.available < 1) {
        continue;
      }

      const key = `${packet.opcode}-${packet.outbound}`;
      const existingPacket = cachePackets[key];

      const mode = packet.readByte();

      if (existingPacket) {
        if (!existingPacket.modes.includes(mode)) {
          existingPacket.modes.push(mode);
        }
      } else {
        cachePackets[key] = {
          opcode: packet.opcode,
          outbound: packet.outbound,
          modes: [mode],
        };
      }
    }

    const hash = await hashFile(file);

    metadataCache.push({
      path: file,
      hash,
      version,
      packets: cachePackets,
    });
  }
  process.stdout.write("\n");

  console.log("Finished reading all files");

  // write metadata cache to file
  if (metadataCache.length === 0) {
    console.log("No metadata to cache");
    return;
  }

  // check if metadata cache file exists
  const metadataCacheFile = "metadata-cache.json";
  const metadataCacheFileExists = allFiles.includes(metadataCacheFile);

  if (metadataCacheFileExists) {
    // delete existing metadata cache file
    await unlink(metadataCacheFile);
  }

  await writeFile(metadataCacheFile, JSON.stringify(metadataCache, null, 2));
};
