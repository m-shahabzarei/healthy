import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDirectory = join(process.cwd(), 'public');
const manifest = JSON.parse(readFileSync(join(publicDirectory, 'manifest.webmanifest'), 'utf8'));

assert.equal(manifest.id, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.start_url, '/dashboard');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.name && manifest.short_name);

for (const purpose of ['any', 'maskable']) {
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((item) => item.purpose === purpose && item.sizes === `${size}x${size}`);
    assert.ok(icon, `Missing ${purpose} ${size}px manifest icon`);
    assert.equal(icon.type, 'image/png');
    assert.ok(icon.src.startsWith('/') && !icon.src.includes('..'));

    const png = readFileSync(join(publicDirectory, icon.src.slice(1)));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${icon.src} must be PNG`);
    assert.equal(png.readUInt32BE(16), size, `${icon.src} has wrong width`);
    assert.equal(png.readUInt32BE(20), size, `${icon.src} has wrong height`);
    assert.equal(png[25], 2, `${icon.src} must be an opaque RGB icon`);
  }
}

readFileSync(join(publicDirectory, 'favicon.ico'));
readFileSync(join(publicDirectory, 'apple-touch-icon.png'));
readFileSync(join(publicDirectory, 'sw.js'));
readFileSync(join(publicDirectory, 'offline.html'));

console.log('PWA manifest, install icons, and offline assets are valid.');
