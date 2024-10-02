# Maple2-PacketLib-TS

Maple2-PacketLib-TS is a TypeScript library designed to read and parse MapleShark2 Sniffs and MapleStory2 packet data.

## Features

- **MSB File Reading**: Read and parse MSB files to extract metadata and packets.
- **CLI Commands**:
  - `metadata-builder`: Build metadata cache for the given folder
  - `duplicate-finder`: Find and optionally delete duplicate files in the given folder
  - `version-finder`: Find files matching the given version in the folder

## NPM

`pnpm install maple2-packetlib-ts`

## Installation

To install the dependencies, run:

```sh
pnpm install
```

## Building the Project

To build the project, run:

```sh
pnpm run build
```

## Usage

### Reading MSB Files

To read and parse an MSB file, use the `MsbReader` class:

The `MsbReader` class automatically extracts metadata upon initialization:

```typescript
const msbReader = new MsbReader("path/to/file.msb");
console.log(msbReader.metadata);
```

To read the packets, use the function `readPackets`:

```typescript
import { MsbReader } from "./src/tools/file-loader";

const msbReader = new MsbReader("path/to/file.msb");
const packets = msbReader.readPackets();
console.log(packets);
```

### CLI Commands

`metadata-builder`
Build metadata cache for the given folder:

```bash
maple2-packetlib-ts metadata-builder .
```

`duplicate-finder`
Find and optionally delete duplicate files in the given folder:

```bash
maple2-packetlib-ts duplicate-finder .
```

`version-finder`
Find files matching the given version in the folder:

```bash
maple2-packetlib-ts version-finder . 12
```
