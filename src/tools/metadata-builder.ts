import { unlink, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "path";
import MsbReader from "./file-loader";
import { statSync } from "node:fs";

interface MetadataCache {
  path: string;
  version: number;
  packets: { [key: string]: Packet };
}

interface Packet {
  opcode: number;
  outbound: boolean;
  modes: number[];
}

async function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = await readdir(dirPath, {
    recursive: true,
  });

  files.forEach((file) => {
    const fullPath = join(dirPath, file);

    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

export const createMetadataCache = async (folderPath: string) => {
  // get all files in directory
  const allFiles = await getAllFiles(folderPath);

  const msbFiles = allFiles.filter((file) => file.endsWith(".msb"));

  if (msbFiles.length === 0) {
    console.log("No MSB files found");
    return;
  }

  console.log(`Found ${msbFiles.length} MSB files`);

  const metadataCache: MetadataCache[] = [];

  let i = 1;
  for (const file of msbFiles) {
    console.log(`Reading metadata for ${file} ... ${i}/${msbFiles.length}`);
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

    metadataCache.push({
      path: file,
      version,
      packets: cachePackets,
    });
  }

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
