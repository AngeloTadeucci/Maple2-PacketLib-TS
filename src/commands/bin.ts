#!/usr/bin/env node

import { existsSync } from "node:fs";
import { createMetadataCache } from "./metadata-builder";
import duplicateFinder from "./duplicate-finder";

function runCLI() {
  const args = process.argv.slice(2);

  const command = args.shift();

  if (!command) {
    console.log("Use one of the following commands:");
    console.log("metadata-builder <folder-path>");
    console.log("duplicate-finder <folder-path>");
    return;
  }

  if (command !== "metadata-builder" && command !== "duplicate-finder") {
    console.log("Use one of the following commands:");
    console.log("metadata-builder <folder-path>");
    console.log("duplicate-finder <folder-path>");
    return;
  }

  const folderPath = args.shift();

  if (!folderPath) {
    console.log("Please provide a folder path");
    return;
  }

  if (!existsSync(folderPath)) {
    console.log("Invalid folder path");
    return;
  }

  if (command === "metadata-builder") {
    createMetadataCache(folderPath);
  } else if (command === "duplicate-finder") {
    const deleteDuplicates = args.includes("--delete");
    duplicateFinder(folderPath, deleteDuplicates);
  } else {
    console.log("Use one of the following commands:");
    console.log("metadata-builder <folder-path>");
    console.log("duplicate-finder <folder-path>");
  }
}

runCLI();
