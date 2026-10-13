// Startet Backend (Port 3000) und Frontend (Port 5173) gemeinsam im Entwicklungsmodus.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [
  ['backend', ['run', 'dev', '--prefix', 'backend'], '\x1b[36m'],
  ['frontend', ['run', 'dev', '--prefix', 'frontend'], '\x1b[35m'],
].map(([name, args, color]) => {
  const p = spawn(npm, args, { stdio: ['inherit', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (d) => out.write(d.toString().replace(/^(?=.)/gm, prefix)));
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    console.log(`${prefix}beendet (${code})`);
    shutdown(code ?? 0);
  });
  return p;
});

function shutdown(code) {
  for (const p of procs) if (!p.killed) p.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
