import { MapleLocale } from './maple-locale';
import { GMS2_RECV_OP, GMS2_SEND_OP } from '../constants/gms2-opcodes';
import { KMS2_RECV_OP, KMS2_SEND_OP } from '../constants/kms2-opcodes';

export type ServerVersion = 'GMS2' | 'KMS2';

/**
 * Determines the server version from a MapleLocale value.
 * Korea and KoreaTest use KMS2 opcodes; all other locales use GMS2.
 */
export function getServerVersion(locale: number): ServerVersion {
  return locale === MapleLocale.Korea || locale === MapleLocale.KoreaTest ? 'KMS2' : 'GMS2';
}

/**
 * Resolves an opcode number to its name given direction and locale.
 *
 * @param opcode   - The numeric opcode value
 * @param outbound - true = client→server (RecvOp), false = server→client (SendOp)
 * @param locale   - The locale value from MsbMetadata (used to pick GMS2 vs KMS2 table)
 * @returns The opcode name, or undefined if not found
 */
export function resolveOpcodeName(opcode: number, outbound: boolean, locale: number): string | undefined {
  const version = getServerVersion(locale);
  if (version === 'KMS2') {
    return outbound ? KMS2_RECV_OP[opcode] : KMS2_SEND_OP[opcode];
  }
  return outbound ? GMS2_RECV_OP[opcode] : GMS2_SEND_OP[opcode];
}

/**
 * Resolves an opcode name to its numeric value by searching the appropriate table.
 * Searches both SendOp and RecvOp tables unless direction is specified.
 *
 * @param name     - The opcode name to look up (e.g. "Skill", "UserEnv")
 * @param locale   - The locale value from MsbMetadata
 * @param outbound - Optional direction filter. If omitted, searches both tables.
 * @returns The opcode number, or undefined if not found
 */
export function resolveOpcodeNumber(
  name: string,
  locale: number,
  outbound?: boolean,
): number | undefined {
  const version = getServerVersion(locale);
  const sendOp = version === 'KMS2' ? KMS2_SEND_OP : GMS2_SEND_OP;
  const recvOp = version === 'KMS2' ? KMS2_RECV_OP : GMS2_RECV_OP;

  if (outbound !== false) {
    // search RecvOp (client→server)
    const found = Object.entries(recvOp).find(([, v]) => v === name);
    if (found) return Number(found[0]);
  }
  if (outbound !== true) {
    // search SendOp (server→client)
    const found = Object.entries(sendOp).find(([, v]) => v === name);
    if (found) return Number(found[0]);
  }

  return undefined;
}
