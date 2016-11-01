import * as child_process from 'cross-spawn';

export function runcmd(command: string, args?: string[], options?: child_process.SpawnOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const p = child_process.spawn(command, args, options);
    let stdoutBuf = Buffer.from([]);
    let stderrBuf = Buffer.from([]);

    if (p.stdout) {
      p.stdout.on('data', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          stdoutBuf = Buffer.concat([stdoutBuf, chunk]);
        } else {
          stdoutBuf.write(chunk);
        }
      });
    }

    if (p.stderr) {
      p.stderr.on('data', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          stderrBuf = Buffer.concat([stderrBuf, chunk]);
        } else {
          stderrBuf.write(chunk);
        }
      });
    }

    p.on('error', (err: Error) => {
      reject(err);
    });

    p.on('close', (code: number) => {
      if (code === 0) {
        resolve(stdoutBuf.toString());
      } else {
        reject([code, stderrBuf.toString()]);
      }
    });
  });
}
