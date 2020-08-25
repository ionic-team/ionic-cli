import { Logger } from '@ionic/cli-framework-output';

export {
  DEFAULT_LOGGER_HANDLERS,
  ICON_FAILURE,
  ICON_SUCCESS,
  LOGGER_LEVELS,
  LOGGER_LEVEL_NAMES,
  LogRecord,
  LogUpdateOutputStrategy,
  LogUpdateOutputStrategyOptions,
  Logger,
  LoggerColors,
  LoggerFormatter,
  LoggerHandler,
  LoggerLevel,
  LoggerLevelWeight,
  OutputStrategy,
  RedrawLine,
  Spinner,
  StreamHandler,
  StreamHandlerOptions,
  StreamOutputStrategy,
  StreamOutputStrategyOptions,
  Task,
  TaskChain,
  TaskChainOptions,
  TaskOptions,
  getLoggerLevelColor,
  getLoggerLevelName,
} from '@ionic/cli-framework-output';

export * from './colors';
export * from './command';
export * from './completion';
export * from './config';
export * from './executor';
export * from './help';
export * from './logger';
export * from './options';
export * from './validators';

export const logger = new Logger();
