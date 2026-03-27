import { execFile } from 'child_process';

interface JavaCheckResult {
  found: boolean;
  version: number | null;
  supported: boolean;
  path: string | null;
  rawOutput: string;
}

const MIN_JAVA_VERSION = 25;

export class JavaService {
  static checkJava(javaPath = 'java'): Promise<JavaCheckResult> {
    return new Promise((resolve) => {
      execFile(javaPath, ['--version'], (error, stdout, stderr) => {
        if (error) {
          resolve({ found: false, version: null, supported: false, path: null, rawOutput: '' });
          return;
        }
        const output = stdout || stderr;
        // Match both "openjdk 25" and "java 25" (Oracle JDK)
        const match = output.match(/(?:openjdk|java)\s+(\d+)/i);
        const version = match ? parseInt(match[1], 10) : null;
        resolve({
          found: true,
          version,
          supported: version !== null && version >= MIN_JAVA_VERSION,
          path: javaPath,
          rawOutput: output,
        });
      });
    });
  }
}
