// Minimalny czytnik XLSX — bez zależności.
// ZIP: central directory -> lokalne nagłówki -> inflateRaw. XML: wyrażenia regularne.
import fs from 'node:fs';
import { inflateRawSync } from 'node:zlib';

function unzip(buf) {
  const files = {};
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('To nie jest plik ZIP/XLSX');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Uszkodzony katalog centralny');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    files[name] = method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const dec = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&amp;/g, '&');

// Zwraca { "Nazwa arkusza": { A1: "wartość", ... } }.
// Komórki z formułą dostają "=FORMUŁA" (openpyxl nie zapisuje wyników).
export function readWorkbook(path) {
  const z = unzip(fs.readFileSync(path));
  const txt = n => z[n].toString('utf8');

  const shared = [];
  if (z['xl/sharedStrings.xml']) {
    for (const m of txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => dec(x[1])).join(''));
    }
  }

  const relMap = {};
  for (const m of txt('xl/_rels/workbook.xml.rels').matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    relMap[m[1]] = m[2].replace(/^\/?xl\//, '');
  }

  const out = {};
  for (const m of txt('xl/workbook.xml').matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const name = dec(m[1]);
    const xml = txt('xl/' + relMap[m[2]]);
    const cells = {};
    // Uwaga: komórki puste są samozamykające (<c r="D6" s="5"/>). Gdyby traktować je
    // tak samo jak <c>...</c>, wyrażenie połknęłoby zawartość następnej komórki.
    for (const cm of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], inner = cm[2] || '';
      const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1];
      if (!ref) continue;
      const t = (attrs.match(/t="([^"]+)"/) || [])[1] || 'n';
      const f = (inner.match(/<f[^>]*>([\s\S]*?)<\/f>/) || [])[1];
      const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      const is = (inner.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
      let val = '';
      if (f !== undefined) val = '=' + dec(f);
      else if (t === 's' && v !== undefined) val = shared[+v] ?? '';
      else if (t === 'inlineStr' && is !== undefined) val = dec(is);
      else if (v !== undefined) val = dec(v);
      if (val !== '') cells[ref] = val;
    }
    out[name] = cells;
  }
  return out;
}
