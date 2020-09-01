import { NO_COLORS } from './colors';
import { Logger, createTaggedFormatter, StreamHandler, CreateTaggedFormatterOptions } from './logger';
import { OutputStrategy, StreamOutputStrategy } from './output';

export * from './colors';
export * from './format';
export * from './logger';
export * from './output';
export * from './tasks';

export interface CreateDefaultLoggerOptions {
  /**
   * Specify a custom output strategy to use for the logger.
   *
   * By default, the logger uses a output strategy with process.stdout and no colors.
   */
  output?: OutputStrategy;

  /**
   * Specify custom logger formatter options.
   */
  formatterOptions?: CreateTaggedFormatterOptions;
}

/**
 * Creates a logger instance with good defaults.
 */
export function createDefaultLogger({ output = new StreamOutputStrategy({ colors: NO_COLORS, stream: process.stdout }), formatterOptions }: CreateDefaultLoggerOptions = {}): Logger {
  const { weak } = output.colors;
  const prefix = process.argv.includes('--log-timestamps') ? () => `${weak('[' + new Date().toISOString() + ']')}` : '';
  const formatter = createTaggedFormatter({ colors: output.colors, prefix, titleize: true, wrap: true, ...formatterOptions });
  const handlers = new Set([new StreamHandler({ stream: output.stream, formatter })]);

  return new Logger({ handlers });
}
