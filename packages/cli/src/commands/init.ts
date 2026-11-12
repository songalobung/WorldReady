import { initConfig } from '@worldready/config';

export interface InitCommandOptions {
  cwd?: string;
  stdout?: (msg: string) => void;
}

export async function initCommand(options: InitCommandOptions = {}): Promise<string> {
  const cwd = options.cwd ?? process.cwd();
  const filePath = await initConfig(cwd);

  const print = options.stdout ?? console.log;
  print(`Initialized WorldReady configuration at ${filePath}`);

  return filePath;
}

