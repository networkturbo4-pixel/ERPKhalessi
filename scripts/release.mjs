// Genera la carpeta versionada `release/` (con version.json + manifest.json SHA-256 para actualización en caliente)
// y también empaqueta `deploy_cpanel.zip` con rutas POSIX (/) listo para producción en cPanel / Linux.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { execSync } from 'child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const release = path.join(root, 'release');
const serverDir = path.join(root, 'server');
const outputZip = path.join(root, 'deploy_cpanel.zip');

// Limpiar artefactos antiguos antes de compilar
for (const legacyZip of ['deploy_cpanel.zip', 'dist-pizzakhalessi.zip']) {
  const fullZip = path.join(root, legacyZip);
  if (fs.existsSync(fullZip)) {
    fs.rmSync(fullZip, { force: true });
  }
}

execSync('npm run build', { stdio: 'inherit' });

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const builtAt = new Date().toISOString();
let message = '';
let commitSha = '';
try {
  message = execSync('git log -1 --format=%s', { cwd: root }).toString().trim();
  commitSha = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
} catch {
  /* sin git */
}

fs.rmSync(release, { recursive: true, force: true });
fs.cpSync(dist, release, { recursive: true });

// Incluir realtime server de Node.js en release
if (fs.existsSync(serverDir)) {
  fs.cpSync(serverDir, path.join(release, 'server'), { recursive: true });
}

// Las credenciales y secretos locales nunca viajan en release
fs.rmSync(path.join(release, 'api', 'config.local.php'), { force: true });
fs.rmSync(path.join(release, 'api', '.token_secret.php'), { force: true });
fs.rmSync(path.join(release, 'api', '.rate_limit'), { recursive: true, force: true });

function buildManifestEntries(dir, baseDir = dir) {
  const entries = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === '.rate_limit') continue;
      entries.push(...buildManifestEntries(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      if (
        relPath === 'api/config.local.php' ||
        relPath === 'api/.token_secret.php' ||
        relPath === 'manifest.json' ||
        relPath === 'version.json'
      ) {
        continue;
      }
      const buf = fs.readFileSync(fullPath);
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      entries.push({
        path: relPath,
        sha256,
        size: buf.length,
      });
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

const files = buildManifestEntries(release);
const manifestPayload = {
  buildId,
  builtAt,
  commitSha,
  message,
  totalFiles: files.length,
  files,
};

const manifestJson = JSON.stringify(manifestPayload, null, 2);
const manifestSha256 = crypto.createHash('sha256').update(manifestJson).digest('hex');

const versionPayload = {
  buildId,
  builtAt,
  commitSha,
  message,
  totalFiles: files.length,
  manifestSha256,
};
const versionJson = JSON.stringify(versionPayload, null, 2);

fs.writeFileSync(path.join(release, 'manifest.json'), manifestJson);
fs.writeFileSync(path.join(release, 'version.json'), versionJson);
fs.writeFileSync(path.join(dist, 'manifest.json'), manifestJson);
fs.writeFileSync(path.join(dist, 'version.json'), versionJson);

// Generador ZIP estándar con rutas POSIX (/) compatible con Linux/cPanel (incluye .htaccess)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function collectAllFilesPosix(dir, baseDir = dir) {
  const list = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      list.push(...collectAllFilesPosix(fullPath, baseDir));
    } else {
      const relPosix = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      list.push({ fullPath, relPosix });
    }
  }
  return list.sort((a, b) => a.relPosix.localeCompare(b.relPosix));
}

function createPosixZip(sourceDir, zipFilePath) {
  const allFiles = collectAllFilesPosix(sourceDir);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { fullPath, relPosix } of allFiles) {
    const rawData = fs.readFileSync(fullPath);
    const compressedData = zlib.deflateRawSync(rawData, { level: 9 });
    const useDeflate = compressedData.length < rawData.length;
    const payload = useDeflate ? compressedData : rawData;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(rawData);
    const nameBuf = Buffer.from(relPosix, 'utf8');

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x5821, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x031e, 4); // UNIX creator
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5821, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38); // rw-r--r-- permissions
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);

    localParts.push(localHeader, payload);
    centralParts.push(centralHeader);
    offset += localHeader.length + payload.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(allFiles.length, 8);
  eocd.writeUInt16LE(allFiles.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  const finalZip = Buffer.concat([...localParts, centralDirBuf, eocd]);
  fs.writeFileSync(zipFilePath, finalZip);
  return { count: allFiles.length, sizeBytes: finalZip.length };
}

const zipInfo = createPosixZip(release, outputZip);
const zipSizeKb = (zipInfo.sizeBytes / 1024).toFixed(1);

console.log(
  `\n✔ Release ${buildId} generado en /release (${files.length} archivos en manifest.json) y empaquetado en deploy_cpanel.zip (${zipInfo.count} archivos, ${zipSizeKb} KB)`
);
