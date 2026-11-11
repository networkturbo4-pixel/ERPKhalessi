// Genera la carpeta versionada `release/` (build listo para cPanel) + version.json + deploy_cpanel.zip.
// Uso: npm run release   -> compila, escribe version.json, copia dist -> release y empaqueta zip
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const release = path.join(root, 'release');
const serverDir = path.join(root, 'server');
const zipFile = path.join(root, 'deploy_cpanel.zip');

execSync('npm run build', { stdio: 'inherit' });

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
let message = '';
try {
  message = execSync('git log -1 --format=%s', { cwd: root }).toString().trim();
} catch { /* sin git */ }

const version = { buildId, builtAt: new Date().toISOString(), message };
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify(version, null, 2));

fs.rmSync(release, { recursive: true, force: true });
fs.cpSync(dist, release, { recursive: true });

// Incluir realtime server de Node.js en release
if (fs.existsSync(serverDir)) {
  fs.cpSync(serverDir, path.join(release, 'server'), { recursive: true });
}

// Las credenciales secretas viven en config.local.php (nunca viajan en release)
fs.rmSync(path.join(release, 'api', 'config.local.php'), { force: true });

// Generar deploy_cpanel.zip
try {
  if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
  }
  execSync('powershell -Command "Start-Sleep -Milliseconds 800; Compress-Archive -Path release\\* -DestinationPath deploy_cpanel.zip -Force"', { cwd: root, stdio: 'inherit' });
  console.log(`✔ Paquete ZIP generado: ${zipFile}`);
} catch (err) {
  console.warn('Advertencia al comprimir ZIP:', err);
}

console.log(`\n✔ Release ${buildId} generado en /release y deploy_cpanel.zip`);
