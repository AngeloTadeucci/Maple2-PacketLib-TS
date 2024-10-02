import { readdir, readFile } from "fs/promises";
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { join } from "path";

export async function getAllFiles(
  dirPath: string,
  arrayOfFiles: string[] = []
) {
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

export async function hashFile(file: string): Promise<string> {
  const data = await readFile(file);
  const hash = createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}
