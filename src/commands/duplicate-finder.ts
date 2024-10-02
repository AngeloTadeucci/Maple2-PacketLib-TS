import { readFile, unlink } from "fs/promises";
import { getAllFiles, hashFile } from "../utils/helpers";
import { createHash } from "node:crypto";

export default async function duplicateFinder(
  folderPath: string,
  deleteDuplicates: boolean = false
) {
  const allFiles = await getAllFiles(folderPath);

  const msbFiles = allFiles.filter((file) => file.endsWith(".msb"));

  if (msbFiles.length === 0) {
    console.log("No MSB files found");
    return;
  }

  const hashes: { [key: string]: string[] } = {};

  let i = 1;
  for (const file of msbFiles) {
    const hash = await hashFile(file);
    if (hashes[hash]) {
      hashes[hash].push(file);
    } else {
      hashes[hash] = [file];
    }

    console.log(`Processed ${i}/${msbFiles.length}`);
    i++;
  }

  const duplicates = Object.values(hashes).filter((files) => files.length > 1);

  if (duplicates.length === 0) {
    console.log("No duplicates found");
    return;
  }

  for (const files of duplicates) {
    console.log(files);
  }

  console.log(`Found ${duplicates.length} duplicates`);

  if (!deleteDuplicates) {
    return;
  }

  for await (const files of duplicates) {
    for await (const file of files.slice(1)) {
      console.log(`Deleting ${file}`);
      await unlink(file);
    }
  }
}
