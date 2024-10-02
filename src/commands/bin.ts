#!/usr/bin/env node

import { existsSync } from "fs";
import duplicateFinder from "./duplicate-finder";
import { createMetadataCache } from "./metadata-builder";
import versionFinder from "./version-finder";

interface Command {
  description: string;
  howTo: string;
  execute: (folderPath: string, args: string[]) => Promise<void>;
}

const commands: { [key: string]: Command } = {
  "metadata-builder": {
    description: "Build metadata cache for the given folder",
    howTo: "metadata-builder <folder-path>",
    execute: async (folderPath: string) =>
      await createMetadataCache(folderPath),
  },
  "duplicate-finder": {
    description:
      "Find and optionally delete duplicate files in the given folder",
    howTo: "duplicate-finder <folder-path> [--delete]",
    execute: async (folderPath: string, args: string[]) => {
      const deleteDuplicates = args.includes("--delete");
      await duplicateFinder(folderPath, deleteDuplicates);
    },
  },
  "version-finder": {
    description:
      "Find files matching the given version in the folder, version can be negated with !",
    howTo: "version-finder <folder-path> <version>",
    execute: async (folderPath: string, args: string[]) => {
      const version = args.shift();

      if (!version) {
        console.log("Please provide a version");
        return;
      }

      await versionFinder(folderPath, version);
    },
  },
};

function printHelp() {
  console.log("Use one of the following commands:");
  Object.keys(commands).forEach((cmd) => {
    console.log(`${cmd} - ${commands[cmd].description}`);
    console.log(`\t${commands[cmd].howTo}`);
  });
}

async function runCLI() {
  const args = process.argv.slice(2);

  const commandArg = args.shift();

  if (!commandArg) {
    printHelp();
    return;
  }

  const command = commandArg as keyof typeof commands;

  if (!commands[command]) {
    console.log("Invalid command");
    printHelp();
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

  await commands[command].execute(folderPath, args);

  process.exit(0);
}

runCLI();
