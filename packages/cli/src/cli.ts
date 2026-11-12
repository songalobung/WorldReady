import './polyfill.js';
import { Command } from 'commander';
import { auditCommand } from './commands/audit.js';
import { ciCommand } from './commands/ci.js';
import { initCommand } from './commands/init.js';
import { rulesCommand } from './commands/rules.js';
import { doctorCommand } from './commands/doctor.js';

export interface CliOptions {
  cwd?: string;
  exitOverride?: boolean;
  stdout?: (msg: string) => void;
  stderr?: (msg: string) => void;
}

export function createProgram(options: CliOptions = {}): Command {
  const program = new Command();
  const cwd = options.cwd ?? process.cwd();

  if (options.exitOverride) {
    program.exitOverride();
  }

  if (options.stdout || options.stderr) {
    program.configureOutput({
      writeOut: options.stdout,
      writeErr: options.stderr,
    });
  }

  program
    .name('worldready')
    .description('WorldReady command-line interface — i18n audit engine')
    .version('0.1.0');

  program
    .command('audit')
    .description('Audit source code and translation files for internationalisation issues')
    .option('-c, --config <path>', 'path to config file')
    .option('-l, --locales <locales>', 'comma-separated list of target locales')
    .option(
      '-f, --format <format>',
      'reporter format (console, json, markdown, sarif)',
      'console',
    )
    .option('-o, --output <file>', 'write report to file instead of stdout')
    .option('--baseline <file>', 'path to baseline file to suppress existing findings')
    .option('--save-baseline <file>', 'path to save current findings as baseline')
    .action(async (opts) => {
      await auditCommand({
        ...opts,
        cwd,
        stdout: options.stdout,
      });
    });

  program
    .command('ci')
    .description('Run audit in CI mode (defaults to SARIF output, exits 1 on errors)')
    .option('-c, --config <path>', 'path to config file')
    .option('-l, --locales <locales>', 'comma-separated list of target locales')
    .option(
      '-f, --format <format>',
      'reporter format (console, json, markdown, sarif)',
      'sarif',
    )
    .option('-o, --output <file>', 'write report to file instead of stdout')
    .option('--baseline <file>', 'path to baseline file to suppress existing findings')
    .option('--save-baseline <file>', 'path to save current findings as baseline')
    .action(async (opts) => {
      await ciCommand({
        ...opts,
        cwd,
        stdout: options.stdout,
      });
    });

  program
    .command('init')
    .description('Detect project framework and create worldready.config.json')
    .action(async () => {
      await initCommand({
        cwd,
        stdout: options.stdout,
      });
    });

  program
    .command('rules')
    .description('List all available audit rules')
    .option('--json', 'output rules as JSON')
    .option('-c, --category <category>', 'filter rules by category')
    .action(async (opts) => {
      await rulesCommand({
        ...opts,
        stdout: options.stdout,
      });
    });

  program
    .command('doctor')
    .description('Diagnose project configuration, locales directory, and translation coverage')
    .option('-c, --config <path>', 'path to config file')
    .action(async (opts) => {
      await doctorCommand({
        ...opts,
        cwd,
        stdout: options.stdout,
      });
    });

  return program;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}
