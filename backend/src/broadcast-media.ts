import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const UPLOAD_DIR = resolve(process.cwd(), 'data/broadcast-uploads');
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

mkdirSync(UPLOAD_DIR, { recursive: true });

export function saveBroadcastImage(buf: Buffer, mime: string): { id: string; path: string } {
  if (buf.length > MAX_BYTES) throw new Error('Файл больше 10 МБ');
  const ext = extFromMime(mime);
  if (!ext) throw new Error('Допустимы JPEG, PNG, GIF, WebP');
  const id = randomUUID();
  const file = resolve(UPLOAD_DIR, id + ext);
  writeFileSync(file, buf);
  return { id, path: file };
}

function extFromMime(mime: string): string | null {
  const m = (mime || '').toLowerCase();
  if (m.includes('jpeg') || m === 'image/jpg') return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('gif')) return '.gif';
  if (m.includes('webp')) return '.webp';
  return null;
}

export function broadcastImagePath(imageId: string): string | null {
  const safe = String(imageId || '').replace(/[^a-f0-9-]/gi, '');
  if (!safe) return null;
  for (const ext of ALLOWED) {
    const p = resolve(UPLOAD_DIR, safe + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

export function broadcastImageBuffer(imageId: string): Buffer | null {
  const p = broadcastImagePath(imageId);
  if (!p) return null;
  return readFileSync(p);
}
