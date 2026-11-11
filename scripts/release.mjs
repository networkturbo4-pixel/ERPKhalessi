// Genera la carpeta versionada `release/` (build listo para cPanel) + version.json.
// Uso: npm run release   -> compila, escribe version.json y copia dist -> release
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const release = path.join(root, 'release');

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

// Las credenciales secretas viven en config.local.php (nunca viajan en release)
fs.rmSync(path.join(release, 'api', 'config.local.php'), { force: true });

console.log(`\n✔ Release ${buildId} generado en /release`);
