// Minimal reader for the gzipped, base64 NBT blobs Hypixel uses for inventories
// and auction items. Runs in Node and in the browser. Only reading is
// supported; longs become Numbers.
import { gunzipSync } from 'fflate';

const TAG = {
  END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6,
  BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12,
};

const utf8 = new TextDecoder();

class Reader {
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.pos = 0;
  }

  byte() { const v = this.view.getInt8(this.pos); this.pos += 1; return v; }
  ubyte() { const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
  short() { const v = this.view.getInt16(this.pos); this.pos += 2; return v; }
  ushort() { const v = this.view.getUint16(this.pos); this.pos += 2; return v; }
  int() { const v = this.view.getInt32(this.pos); this.pos += 4; return v; }
  long() { const v = this.view.getBigInt64(this.pos); this.pos += 8; return Number(v); }
  float() { const v = this.view.getFloat32(this.pos); this.pos += 4; return v; }
  double() { const v = this.view.getFloat64(this.pos); this.pos += 8; return v; }

  string() {
    const len = this.ushort();
    const v = utf8.decode(this.bytes.subarray(this.pos, this.pos + len));
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
        const out = Array.from(this.bytes.subarray(this.pos, this.pos + len));
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

export function parseNbt(bytes) {
  return new Reader(bytes).root();
}

function base64ToBytes(data) {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Decode a base64 gzipped NBT string into a JS object. */
export function decodeNbtBase64(data) {
  if (!data) return null;
  const raw = base64ToBytes(data);
  // Most blobs are gzipped, but a few endpoints return raw NBT.
  const bytes = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw;
  return parseNbt(bytes);
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
