import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const processes = [
  spawn(npmCommand, ['run', 'dev:api'], { stdio: 'inherit' }),
  spawn(npmCommand, ['run', 'dev:web'], { stdio: 'inherit' }),
];
let stopping = false;

const stop = (exitCode) => {
  if (stopping) return;
  stopping = true;

  for (const child of processes) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exitCode = exitCode;
};

for (const child of processes) {
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    stop(signal ? 1 : (code ?? 0));
  });
}

process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));
