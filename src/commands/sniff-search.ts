import MsbReader from '../tools/file-loader';
import { getServerVersion, resolveOpcodeName } from '../tools/opcode-resolver';
import { getAllFiles } from '../utils/helpers';
import {
  formatHex,
  matchesFilters,
  PacketEntry,
  parseSniffQueryArgs,
  QueryOptions,
  resolveLocale,
  resolveOpcodeFilter,
} from './sniff-query';

interface FileResult {
  filePath: string;
  metadata: {
    build: number;
    locale: number;
    serverVersion: string;
    localEndpoint: string;
    remoteEndpoint: string;
  };
  totalMatched: number;
  packets: PacketEntry[];
}

interface SearchResult {
  folderPath: string;
  totalFiles: number;
  filesWithMatches: number;
  totalMatched: number;
  files: FileResult[];
}

export async function sniffSearch(folderPath: string, args: string[]): Promise<void> {
  const { options } = parseSniffQueryArgs(args);

  const allFiles = await getAllFiles(folderPath);
  const msbFiles = allFiles.filter(file => file.endsWith('.msb'));

  if (msbFiles.length === 0) {
    console.error(`Error: No MSB files found in: ${folderPath}`);
    process.exit(1);
  }

  const result: SearchResult = {
    folderPath,
    totalFiles: msbFiles.length,
    filesWithMatches: 0,
    totalMatched: 0,
    files: [],
  };

  for (const filePath of msbFiles) {
    const fileResult = queryFile(filePath, options);
    if (fileResult === null) continue;

    if (fileResult.totalMatched > 0) {
      result.filesWithMatches++;
      result.totalMatched += fileResult.totalMatched;
      result.files.push(fileResult);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

function queryFile(filePath: string, options: QueryOptions): FileResult | null {
  try {
    const reader = new MsbReader(filePath);
    const locale = resolveLocale(options.localeOverride, reader.metadata?.Locale ?? 0);
    const opcodeFilter = resolveOpcodeFilter(options.opcodeArgs, locale);

    const metadata = {
      build: reader.metadata?.Build ?? 0,
      locale,
      serverVersion: getServerVersion(locale),
      localEndpoint: `${reader.metadata?.LocalEndpoint}:${reader.metadata?.LocalPort}`,
      remoteEndpoint: `${reader.metadata?.RemoteEndpoint}:${reader.metadata?.RemotePort}`,
    };

    const packets: PacketEntry[] = [];
    let totalMatched = 0;
    let globalIndex = 0;

    for (const packet of reader.readPacketsLazy()) {
      const index = globalIndex++;

      if (options.index !== null && index !== options.index) continue;
      if (options.range && (index < options.range.start || index > options.range.end)) continue;
      if (!matchesFilters(packet, opcodeFilter, options)) continue;

      totalMatched++;

      if (options.limit === 0 || packets.length < options.limit) {
        const entry: PacketEntry = {
          index,
          timestamp: packet.timestamp.toISOString(),
          direction: packet.outbound ? 'OUT' : 'IN',
          opcode: '0x' + packet.opcode.toString(16).toUpperCase().padStart(4, '0'),
          opcodeName: resolveOpcodeName(packet.opcode, packet.outbound, locale) ?? 'Unknown',
          length: packet.length,
        };
        if (!options.noHex) entry.hexBytes = formatHex(packet, options.hexLimit);
        packets.push(entry);
      }

      if (options.index !== null) break;
    }

    return { filePath, metadata, totalMatched, packets };
  } catch {
    return null;
  }
}
