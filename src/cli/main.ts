import {readFileSync} from 'node:fs';
import {Argument, Command, CommanderError, InvalidArgumentError, Option} from 'commander';
import {CapabilitySchema, ControlResultSchema, QueryResultSchema, ServiceSchema} from '../core/contracts.js';
import type {CliDependencies, Failure} from '../core/contracts.js';
import {DEFAULT_CAPABILITIES, requireCapability} from '../core/capabilities.js';
import {classifyError, CliFailure} from '../core/errors.js';
import {COMMANDS, type CommandDefinition} from './commands.js';
import {renderOutput, type Output} from './render.js';
import {resolveDateRange} from '../core/policy.js';

const {version} = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {version: string};
const nonEmpty = (value: string): string => {
  if (!value.trim()) throw new InvalidArgumentError('A non-empty value is required.');
  return value.trim();
};
const identifier = (value: string): string => {
  const text = nonEmpty(value);
  if (/[\/\\?#\u0000-\u001f]/.test(text)) throw new InvalidArgumentError('Use a school identifier, not a URL.');
  return text;
};
const limit = (value: string): number => {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2000) throw new CliFailure('INVALID_ARGUMENT', 'Use --limit with an integer from 1 to 2000.');
  return Number(value);
};
function validateArguments(definition: CommandDefinition, args: Record<string, unknown>): void {
  if (definition.path === 'portal notice' && !/^[\w-]+:[\w-]+$/.test(String(args.id))) throw new CliFailure('INVALID_ARGUMENT','Use a source-qualified notice id returned by portal notices.');
  if (['canvas assignments','canvas announcements'].includes(definition.path) && !/^\d+$/.test(String(args.course))) throw new CliFailure('INVALID_ARGUMENT');
  if (definition.path === 'auth status' && Boolean(args.service) === Boolean(args.all)) throw new CliFailure('INVALID_ARGUMENT');
  if (definition.path === 'browser use' && !['chrome', 'edge', 'chromium'].includes(String(args.browser))) throw new CliFailure('INVALID_ARGUMENT');
  if (definition.path === 'browser install' && args.browser !== 'chromium') throw new CliFailure('INVALID_ARGUMENT');
  const required = ['canvas announcements', 'canvas assignments'].includes(definition.path) ? ['course']
    : definition.path === 'booking availability' ? ['provider', 'room', 'date']
    : ['booking rooms', 'booking mine'].includes(definition.path) ? ['provider'] : [];
  if (required.some((key) => !args[key])) throw new CliFailure('INVALID_ARGUMENT');
}
export async function executeCommand(argv: string[], overrides: Partial<CliDependencies> = {}): Promise<{exitCode: number; stdout: string; stderr: string}> {
  const deps: CliDependencies = {now: Date.now, capabilities: DEFAULT_CAPABILITIES.map((item) => ({...item})), handlers: {},
    env: process.env,
    sessionRunner: async (...args) => {
      const [{createSessionRunner},{resolveDataPaths}]=await Promise.all([import('../session/browser.js'),import('../session/paths.js')]);
      return createSessionRunner(resolveDataPaths(deps.env??process.env),{env:deps.env??process.env})(...args);
    }, ...overrides};
  let stdout = ''; const stderr = ''; let commandName = 'hkustgz-cli'; let exitCode = 0;
  let outputFormat: 'json' | 'table' = 'json';
  const program = new Command('hkustgz-cli').description('Read-only HKUST(GZ) campus CLI — Catalog, SIS, Portal and Canvas queries available; consult capabilities for support.')
    .version(version).exitOverride().showHelpAfterError(false)
    .addOption(new Option('--format <format>', 'Output format').choices(['json', 'table']).default('json'))
    .configureOutput({writeOut: (text) => {stdout += text;}, writeErr: () => {}});
  const groups = new Map<string, Command>();
  const identities = new Map<Command, string>();
  let activeCommand = program;
  const trackCommand = (_parent: Command, child: Command): void => {
    activeCommand = child;
    commandName = identities.get(child) ?? 'hkustgz-cli';
  };
  program.hook('preSubcommand', trackCommand);
  try {
    for (const definition of COMMANDS) {
      const parts = definition.path.split(' ');
      let parent = program;
      if (parts.length === 2) {
        const group = parts[0]!;
        if (!groups.has(group)) {
          const child = program.command(group).description(`${group} commands`);
          child.hook('preSubcommand', trackCommand).action(() => {child.help();});
          groups.set(group, child); identities.set(child, group);
        }
        parent = groups.get(group)!;
      }
      const command = parent.command(parts.at(-1)!).description(definition.description)
        .addOption(new Option('--format <format>', 'Output format').choices(['json', 'table']));
      identities.set(command, definition.path);
      for (const argument of definition.args ?? []) {
        const arg = new Argument(argument.syntax);
        if (argument.kind === 'service') arg.choices(ServiceSchema.options);
        else arg.argParser(argument.kind === 'id' ? identifier : nonEmpty);
        command.addArgument(arg);
      }
      for (const option of definition.options ?? []) {
        const parsed = new Option(option.flags, option.description);
        if (option.kind === 'provider') parsed.choices(['library']);
        else if (option.kind === 'id') parsed.argParser(identifier);
        else if (option.flags.includes('<')) parsed.argParser(nonEmpty);
        command.addOption(parsed);
      }
      if (definition.headed) command.option('--headed', 'Use a visible dedicated browser when implemented');
      if (definition.refresh) command.option('--refresh', 'Skip the local public-data cache');
      if (definition.limit) command.addOption(new Option('--limit <n>', 'Maximum returned records, 1–2000').argParser(limit));
      command.action(async () => {
        commandName = definition.path;
        const args = {...command.optsWithGlobals<Record<string, unknown>>()};
        outputFormat = args.format as 'json' | 'table';
        for (const [index, argument] of (definition.args ?? []).entries()) {
          const value: unknown = command.processedArgs[index];
          if (value !== undefined) args[argument.key] = value;
        }
        validateArguments(definition, args);
        if(definition.capabilityId){
          const now=deps.now();args.deadlineMs=now+90000;
          if(['portal agenda','canvas agenda','booking mine'].includes(definition.path)){
            const range=resolveDateRange({...typeof args.from==='string'?{from:args.from}:{},...typeof args.to==='string'?{to:args.to}:{}},now);
            args.from=range.from;args.to=range.to;
          }
          if(['sis today','booking availability'].includes(definition.path))args.date=resolveDateRange(typeof args.date==='string'?{from:args.date}:{},now).from;
        }
        if (definition.path === 'capabilities') {
          const items = deps.capabilities.map((item) => {const result = CapabilitySchema.safeParse(item); if (!result.success) throw new CliFailure('ADAPTER_CHANGED'); return result.data;});
          stdout += renderOutput({ok: true, data: {items}, meta: {schemaVersion: '1', command: commandName}}, args.format as 'json' | 'table');
          return;
        }
        if (definition.capabilityId && requireCapability(deps.capabilities, definition.capabilityId).service !== definition.service) throw new CliFailure('ADAPTER_CHANGED');
        const id = definition.capabilityId ?? definition.path.replace(' ', '.');
        let handler = Object.hasOwn(deps.handlers, id) ? deps.handlers[id] : undefined;
        if(!handler&&definition.service==='portal')handler=(await import('../adapters/portal/index.js')).createPortalHandlers()[id];
        if(!handler&&definition.service==='canvas')handler=(await import('../adapters/canvas/index.js')).createCanvasHandlers()[id];
        if(!handler&&definition.service==='sis')handler=(await import('../adapters/sis/index.js')).createSisHandlers()[id];
        if(!handler&&definition.service==='catalog')handler=(await import('../adapters/catalog/index.js')).createCatalogHandlers()[id];
        if(!handler&&definition.path==='doctor')handler=(await import('./doctor.js')).createDoctorHandler();
        if(!handler&&definition.path.startsWith('skill '))handler=(await import('./skill/handlers.js')).createSkillHandlers()[id];
        if(!handler&&!definition.capabilityId&&definition.path!=='doctor')handler=(await import('../session/auth.js')).createControlHandlers()[id];
        if (!handler) throw new CliFailure(definition.capabilityId ? 'ADAPTER_CHANGED' : 'CAPABILITY_PENDING');
        const parsed = (definition.capabilityId ? QueryResultSchema : ControlResultSchema).safeParse(await handler(args, deps));
        if (!parsed.success || parsed.data.meta.command !== commandName) throw new CliFailure('ADAPTER_CHANGED');
        if ('service' in parsed.data.meta && parsed.data.meta.service !== definition.service) throw new CliFailure('ADAPTER_CHANGED');
        exitCode = parsed.data.ok ? 0 : 7;
        stdout += renderOutput(parsed.data as Output, args.format as 'json' | 'table');
      });
    }
    if (!argv.length) program.help();
    await program.parseAsync(argv, {from: 'user'});
  } catch (cause) {
    if (cause instanceof CommanderError && cause.exitCode === 0) return {exitCode: 0, stdout, stderr};
    const parsedFormat: unknown = activeCommand.optsWithGlobals().format;
    if (parsedFormat === 'json' || parsedFormat === 'table') outputFormat = parsedFormat;
    const {error, exitCode: failedCode} = classifyError(cause instanceof CommanderError
      ? new CliFailure('INVALID_ARGUMENT', `Run hkustgz-cli ${commandName === 'hkustgz-cli' ? '' : `${commandName} `}--help to check arguments and required options.`)
      : cause);
    exitCode = failedCode;
    const failure: Failure = {ok: false, error, meta: {schemaVersion: '1', command: commandName}};
    stdout = renderOutput(failure, outputFormat);
  }
  return {exitCode, stdout, stderr};
}
export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  const result = await executeCommand(argv);
  process.stdout.write(result.stdout); process.stderr.write(result.stderr); process.exitCode = result.exitCode;
}
