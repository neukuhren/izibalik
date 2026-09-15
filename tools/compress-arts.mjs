// Сжать PNG-арты в webp (512px), удалить исходники.
// Запуск из корня: node tools/compress-arts.mjs
import { readdirSync, statSync, unlinkSync } from 'fs';
import { createRequire } from 'module';
const sharp = createRequire('file:///' + process.cwd().replace(/\\/g, '/') + '/app/package.json')('sharp');

const dirs = ['app/public/products', 'app/public/art'];
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter(f => f.endsWith('.png'))) {
    const src = `${dir}/${f}`;
    const out = src.replace(/\.png$/, '.webp');
    await sharp(src).resize(512, 512, { fit: 'inside' }).webp({ quality: 84 }).toFile(out);
    console.log(out, Math.round(statSync(out).size / 1024) + 'KB (was ' + Math.round(statSync(src).size / 1024) + 'KB)');
    unlinkSync(src);
  }
}
