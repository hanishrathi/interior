/**
 * Packs site-dist/ into clawed-design-preview.zip for upload through cPanel's File Manager
 * (Upload, then Extract into public_html or a subfolder).
 *
 *   npm run package:site
 *
 * Dependency-free: a minimal ZIP writer (deflate) using Node's zlib.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { ROOT } from './lib/reporter';

const SOURCE = resolve(ROOT, 'site-dist');
const TARGET = resolve(ROOT, 'clawed-design-preview.zip');

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function u16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function zip(files: readonly string[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  // Fixed timestamp (1980-01-01) keeps the archive reproducible.
  const time = u16(0);
  const date = u16((0 << 9) | (1 << 5) | 1);

  for (const file of files) {
    const name = Buffer.from(relative(SOURCE, file).split('\\').join('/'));
    const data = readFileSync(file);
    const packed = deflateRawSync(data);
    const crc = u32(crc32(data));
    const common = [u16(20), u16(0x0800), u16(8), time, date, crc, u32(packed.length), u32(data.length), u16(name.length), u16(0)];
    const header = Buffer.concat([u32(0x04034b50), ...common, name]);
    local.push(header, packed);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), ...common, u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += header.length + packed.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(directory.length), u32(offset), u16(0)]);
  return Buffer.concat([...local, directory, end]);
}

const files = listFiles(SOURCE).sort();
if (files.length === 0) throw new Error('site-dist/ is empty — run "npm run build:site" first.');
writeFileSync(TARGET, zip(files));
console.log(`Wrote ${relative(ROOT, TARGET)} (${files.length} files, ${statSync(TARGET).size} bytes).`);
