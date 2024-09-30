#!/usr/bin/env node

import { existsSync } from "node:fs";
import { createMetadataCache } from "./tools/metadata-builder";

function runCLI() {
  const folderPath = process.argv.slice(1);

  if (folderPath.length < 2) {
    console.log("Please provide a folder path");
    return;
  }

  if (!existsSync(folderPath[1])) {
    console.log("Invalid folder path");
    return;
  }

  createMetadataCache(folderPath[1]);
}

runCLI();
