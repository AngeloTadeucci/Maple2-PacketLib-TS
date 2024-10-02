import MsbReader from "../tools/file-loader";
import { getAllFiles } from "../utils/helpers";

export default async function versionFinder(
  folderPath: string,
  versionStr: string
) {
  const allFiles = await getAllFiles(folderPath);

  const msbFiles = allFiles.filter((file) => file.endsWith(".msb"));

  if (msbFiles.length === 0) {
    console.log("No MSB files found");
    return;
  }

  const isNegatedVersion = versionStr.startsWith("!");

  const version = Number(versionStr.replace(/\D/g, ""));

  if (isNaN(version)) {
    console.log("Invalid version");
    return;
  }

  const files = msbFiles
    .map((file) => {
      const reader = new MsbReader(file);

      if (!reader.metadata?.Build) {
        return null;
      }

      const matchesVersion = isNegatedVersion
        ? reader.metadata.Build !== version
        : reader.metadata.Build === version;

      return matchesVersion
        ? { filePath: file, version: reader.metadata.Build }
        : null;
    })
    .filter((entry) => entry !== null);

  if (files.length === 0) {
    console.log("No files found");
    return;
  }

  for (const file of files) {
    console.log(file);
  }

  console.log(`Found ${files.length} files`);
}
