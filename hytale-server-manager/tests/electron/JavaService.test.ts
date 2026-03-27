import { describe, it, expect, vi } from 'vitest';
import { JavaService } from '../../electron/services/JavaService';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'child_process';

describe('JavaService', () => {
  it('should detect Java 25', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd: any, _args: any, callback: any) => {
      callback(null, '', 'openjdk 25.0.1 2025-10-21 LTS\nOpenJDK Runtime Environment Temurin-25.0.1+8');
      return {} as any;
    });
    const result = await JavaService.checkJava();
    expect(result.found).toBe(true);
    expect(result.version).toBe(25);
    expect(result.supported).toBe(true);
  });

  it('should report missing Java', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd: any, _args: any, callback: any) => {
      callback(new Error('not found'), '', '');
      return {} as any;
    });
    const result = await JavaService.checkJava();
    expect(result.found).toBe(false);
  });

  it('should reject old Java version', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd: any, _args: any, callback: any) => {
      callback(null, '', 'openjdk 17.0.1 2021-10-19');
      return {} as any;
    });
    const result = await JavaService.checkJava();
    expect(result.found).toBe(true);
    expect(result.version).toBe(17);
    expect(result.supported).toBe(false);
  });
});
