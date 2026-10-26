// Minimal reader for the gzipped, base64 NBT blobs Hypixel uses for inventories
// and auction items. Only reading is supported; longs become Numbers.
import { gunzipSync } from 'node:zlib';

const TAG = {
  END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6,
  BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12,
};

class Reader {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }

  byte() { const v = this.buf.readInt8(this.pos); this.pos += 1; return v; }
  ubyte() { const v = this.buf.readUInt8(this.pos); this.pos += 1; return v; }
  short() { const v = this.buf.readInt16BE(this.pos); this.pos += 2; return v; }
  ushort() { const v = this.buf.readUInt16BE(this.pos); this.pos += 2; return v; }
  int() { const v = this.buf.readInt32BE(this.pos); this.pos += 4; return v; }
  long() { const v = this.buf.readBigInt64BE(this.pos); this.pos += 8; return Number(v); }
  float() { const v = this.buf.readFloatBE(this.pos); this.pos += 4; return v; }
  double() { const v = this.buf.readDoubleBE(this.pos); this.pos += 8; return v; }

  string() {
    const len = this.ushort();
    const v = this.buf.toString('utf8', this.pos, this.pos + len);
    this.pos += len;
    return v;
  }

  payload(type) {
    switch (type) {
      case TAG.BYTE: return this.byte();
      case TAG.SHORT: return this.short();
      case TAG.INT: return this.int();
      case TAG.LONG: return this.long();
      case TAG.FLOAT: return this.float();
      case TAG.DOUBLE: return this.double();
      case TAG.STRING: return this.string();
      case TAG.BYTE_ARRAY: {
        const len = this.int();
        const out = Array.from(this.buf.subarray(this.pos, this.pos + len));
        this.pos += len;
        return out;
      }
      case TAG.INT_ARRAY: {
        const len = this.int();
        const out = new Array(len);
        for (let i = 0; i < len; i++) out[i] = this.int();
        return out;
      }
      case TAG.LONG_ARRAY: {
        const len = this.int();
        const out = new Array(len);
        for (let i = 0; i < len; i++) out[i] = this.long();
        return out;
      }
      case TAG.LIST: {
        const itemType = this.ubyte();
        const len = this.int();
        const out = new Array(Math.max(len, 0));
        for (let i = 0; i < len; i++) out[i] = this.payload(itemType);
        return out;
      }
      case TAG.COMPOUND: {
        const out = {};
        for (;;) {
          const t = this.ubyte();
          if (t === TAG.END) break;
          const name = this.string();
          out[name] = this.payload(t);
        }
        return out;
      }
      default:
        throw new Error(`Unknown NBT tag type ${type} at byte ${this.pos}`);
    }
  }

  root() {
    const t = this.ubyte();
    if (t !== TAG.COMPOUND) throw new Error('NBT root is not a compound');
    this.string(); // root name, always empty for Hypixel data
    return this.payload(TAG.COMPOUND);
  }
}

export function parseNbt(buffer) {
  return new Reader(buffer).root();
}

/** Decode a base64 gzipped NBT string into a JS object. */
export function decodeNbtBase64(data) {
  if (!data) return null;
  const raw = Buffer.from(data, 'base64');
  // Most blobs are gzipped, but a few endpoints return raw NBT.
  const buf = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw;
  return parseNbt(buf);
}

/**
 * Decode an inventory blob ({ type, data }) into a list of item stacks.
 * Empty slots are dropped.
 */
export function decodeInventory(blob) {
  const data = typeof blob === 'string' ? blob : blob?.data;
  if (!data) return [];
  try {
    const root = decodeNbtBase64(data);
    return (root?.i ?? []).filter((item) => item && Object.keys(item).length > 0);
  } catch {
    return [];
  }
}
