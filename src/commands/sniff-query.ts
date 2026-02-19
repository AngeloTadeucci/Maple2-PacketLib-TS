import { existsSync } from 'fs';
import MsbReader from '../tools/file-loader';
import MaplePacket from '../tools/maple-packet';
import { getServerVersion, resolveOpcodeName, resolveOpcodeNumber } from '../tools/opcode-resolver';

interface QueryOptions {
  summary: boolean;
  opcodeArgs: string[]; // raw args: hex, decimal, or name — resolved after locale is known
  direction: 'IN' | 'OUT' | null;
  limit: number;
  noHex: boolean;
  hexLimit: number;
  index: number | null;
  range: { start: number; end: number } | null;
  searchHex: Uint8Array | null;
}

interface PacketEntry {
  index: number;
  timestamp: string;
  direction: 'IN' | 'OUT';
  opcode: string;
  opcodeName: string;
  length: number;
  hexBytes?: string;
}

interface SummaryEntry {
  direction: 'IN' | 'OUT';
  opcode: string;
  opcodeName: string;
  count: number;
}

export function parseSniffQueryArgs(args: string[]): { filePath: string; options: QueryOptions } {
  const options: QueryOptions = {
    summary: false,
    opcodeArgs: [],
    direction: null,
    limit: 20,
    noHex: false,
    hexLimit: 64,
    index: null,
    range: null,
    searchHex: null,
  };

  let filePath = '';
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === '--summary' || arg === '-s') {
      options.summary = true;
    } else if ((arg === '--opcode' || arg === '-o') && i + 1 < args.length) {
      options.opcodeArgs.push(args[++i]);
    } else if ((arg === '--direction' || arg === '-d') && i + 1 < args.length) {
      const dir = args[++i].toUpperCase();
      if (dir === 'IN' || dir === 'OUT') options.direction = dir;
    } else if ((arg === '--limit' || arg === '-l') && i + 1 < args.length) {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--no-hex') {
      options.noHex = true;
    } else if (arg === '--hex-limit' && i + 1 < args.length) {
      options.hexLimit = parseInt(args[++i], 10);
    } else if ((arg === '--index' || arg === '-i') && i + 1 < args.length) {
      options.index = parseInt(args[++i], 10);
    } else if ((arg === '--range' || arg === '-r') && i + 1 < args.length) {
      const parts = args[++i].split('-');
      options.range = { start: parseInt(parts[0], 10), end: parseInt(parts[1], 10) };
    } else if (arg === '--search-hex' && i + 1 < args.length) {
      const bytes = args[++i]
        .trim()
        .split(/\s+/)
        .map(b => parseInt(b, 16));
      if (!bytes.some(isNaN)) options.searchHex = new Uint8Array(bytes);
    } else if (!arg.startsWith('-') && !filePath) {
      filePath = arg;
    }
    i++;
  }

  return { filePath, options };
}

function resolveOpcodeFilter(opcodeArgs: string[], locale: number): number[] {
  return opcodeArgs
    .map(raw => {
      const hexMatch = raw.match(/^(?:0x)?([0-9a-fA-F]+)$/);
      if (hexMatch) return parseInt(hexMatch[1], 16);
      const dec = parseInt(raw, 10);
      if (!isNaN(dec) && String(dec) === raw) return dec;
      // name lookup — search both directions
      return resolveOpcodeNumber(raw, locale) ?? null;
    })
    .filter((n): n is number => n !== null);
}

function formatHex(packet: MaplePacket, hexLimit: number): string {
  const buffer = packet.getSegment(0, packet.length);
  const count = Math.min(buffer.length, hexLimit);
  const bytes: string[] = [];
  for (let i = 0; i < count; i++) {
    bytes.push(buffer[i].toString(16).toUpperCase().padStart(2, '0'));
  }
  let result = bytes.join(' ');
  if (buffer.length > hexLimit) result += ` ... (+${buffer.length - hexLimit} bytes)`;
  return result;
}

function matchesFilters(packet: MaplePacket, opcodeFilter: number[], options: QueryOptions): boolean {
  if (options.direction) {
    const outbound = options.direction === 'OUT';
    if (packet.outbound !== outbound) return false;
  }
  if (opcodeFilter.length > 0 && !opcodeFilter.includes(packet.opcode)) {
    return false;
  }
  if (options.searchHex && packet.search(options.searchHex) === -1) {
    return false;
  }
  return true;
}

export async function sniffQuery(filePath: string, args: string[]): Promise<void> {
  const { options } = parseSniffQueryArgs(args);
  await runQuery(filePath, options);
}

async function runQuery(filePath: string, options: QueryOptions): Promise<void> {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const reader = new MsbReader(filePath);
  const locale = reader.metadata?.Locale ?? 0;
  const opcodeFilter = resolveOpcodeFilter(options.opcodeArgs, locale);

  const metadata = {
    build: reader.metadata?.Build ?? 0,
    locale,
    serverVersion: getServerVersion(locale),
    localEndpoint: `${reader.metadata?.LocalEndpoint}:${reader.metadata?.LocalPort}`,
    remoteEndpoint: `${reader.metadata?.RemoteEndpoint}:${reader.metadata?.RemotePort}`,
  };

  if (options.summary) {
    const counts = new Map<string, SummaryEntry>();
    let total = 0;

    for (const packet of reader.readPacketsLazy()) {
      if (!matchesFilters(packet, opcodeFilter, options)) continue;
      total++;
      const key = `${packet.outbound ? 1 : 0}_${packet.opcode}`;
      if (!counts.has(key)) {
        counts.set(key, {
          direction: packet.outbound ? 'OUT' : 'IN',
          opcode: '0x' + packet.opcode.toString(16).toUpperCase().padStart(4, '0'),
          opcodeName: resolveOpcodeName(packet.opcode, packet.outbound, locale) ?? 'Unknown',
          count: 0,
        });
      }
      counts.get(key)!.count++;
    }

    const opcodes = [...counts.values()].sort((a, b) => b.count - a.count);
    console.log(JSON.stringify({ metadata, matchedPackets: total, opcodes }, null, 2));
    return;
  }

  const output: PacketEntry[] = [];
  let totalMatched = 0;
  let globalIndex = 0;

  for (const packet of reader.readPacketsLazy()) {
    const index = globalIndex++;

    if (options.index !== null && index !== options.index) continue;
    if (options.range && (index < options.range.start || index > options.range.end)) continue;
    if (!matchesFilters(packet, opcodeFilter, options)) continue;

    totalMatched++;

    if (options.limit === 0 || output.length < options.limit) {
      const entry: PacketEntry = {
        index,
        timestamp: packet.timestamp.toISOString(),
        direction: packet.outbound ? 'OUT' : 'IN',
        opcode: '0x' + packet.opcode.toString(16).toUpperCase().padStart(4, '0'),
        opcodeName: resolveOpcodeName(packet.opcode, packet.outbound, locale) ?? 'Unknown',
        length: packet.length,
      };
      if (!options.noHex) entry.hexBytes = formatHex(packet, options.hexLimit);
      output.push(entry);
    }

    if (options.index !== null) break;
  }

  console.log(JSON.stringify({ metadata, totalMatched, showing: output.length, packets: output }, null, 2));
}
