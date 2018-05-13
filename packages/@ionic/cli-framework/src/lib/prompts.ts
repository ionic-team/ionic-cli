import * as Debug from 'debug';
import * as inquirer from 'inquirer'; // type import
import { Inquirer, Question, objects as InquirerObjects } from 'inquirer'; // type import

import { Logger, LoggerOptions, StreamHandler, StreamHandlerOptions } from './logger';
import { TERMINAL_INFO } from '../utils/terminal';

const debug = Debug('ionic:cli-framework:lib:prompts');

let _inquirer: Inquirer | undefined;

export interface PromptQuestionBase extends Question {
  /**
   * The prompt type for this question.
   *    - 'confirm': Y/n
   *    - 'checkbox': Multi-value selection.
   *    - 'input': Text input.
   *    - 'password': Masked text input.
   *    - 'list': Single-value selection.
   */
  type: PromptType;

  /**
   * The question to print.
   */
  message: string;

  /**
   * The fallback value to use in non-TTY mode.
   */
  fallback?: PromptValue;

  /**
   * Default value to use if nothing is entered.
   */
  default?: PromptValue;
}

export type PromptTypeConfirm = 'confirm';
export type PromptTypeCheckbox = 'checkbox';
export type PromptTypeOther = 'input' | 'password' | 'list';
export type PromptType = PromptTypeConfirm | PromptTypeCheckbox | PromptTypeOther;

export type PromptValueConfirm = boolean;
export type PromptValueCheckbox = string[];
export type PromptValueOther = string;
export type PromptValue = PromptValueConfirm | PromptValueCheckbox | PromptValueOther;

export interface PromptQuestionConfirm extends PromptQuestionBase {
  type: PromptTypeConfirm;
  fallback?: PromptValueConfirm;
  default?: PromptValueConfirm;
}

export interface PromptQuestionCheckbox extends PromptQuestionBase {
  type: PromptTypeCheckbox;
  fallback?: PromptValueCheckbox;
  default?: PromptValueCheckbox;
}

export interface PromptQuestionOther extends PromptQuestionBase {
  type: PromptTypeOther;
  fallback?: PromptValueOther;
  default?: PromptValueOther;
}

export type PromptQuestion = PromptQuestionConfirm | PromptQuestionCheckbox | PromptQuestionOther;

export interface PromptModule {
  (question: PromptQuestionConfirm): Promise<PromptValueConfirm>;
  (question: PromptQuestionCheckbox): Promise<PromptValueCheckbox>;
  (question: PromptQuestionOther): Promise<PromptValueOther>;

  open(): void;
  close(): void;
  createLogger(options?: Partial<LoggerOptions>): Logger;
  createLoggerHandlers(options?: Partial<StreamHandlerOptions>): Set<StreamHandler>;
  updatePromptBar(message: string): void;
}

async function loadInquirer(): Promise<Inquirer> {
  if (!_inquirer) {
    _inquirer = await import('inquirer');
  }

  return _inquirer;
}

export interface CreatePromptModuleOptions {
  readonly interactive?: boolean;
  readonly onFallback?: (question: PromptQuestion) => PromptValue | void;
}

/**
 * Create a reusable CLI prompt module.
 *
 * A prompt module is a function that generates prompts. A prompt opens an
 * interactive session with the user to gather input. When a prompt is
 * resolved, the user has finished providing input.
 *
 * If non-TTY mode is detected, a system of fallbacks goes into effect:
 *      1. If the question provided 'fallback', the fallback value is resolved.
 *      2. If the prompt module has 'onFallback', it is used to generate a
 *         fallback for the question.
 *      3. If the question provided 'default', the default value is resolved.
 *      4. Finally, a falsy value suitable for the question type is resolved.
 *
 * @param options.interactive Force non-TTY mode by providing 'false'. TTY mode
 *                            cannot be forced if non-TTY mode is detected.
 * @param options.onFallback Generate a non-TTY fallback for a question without
 *                           a 'fallback'.
 */
export async function createPromptModule({ interactive, onFallback }: CreatePromptModuleOptions = {}): Promise<PromptModule> {
  const inq = await loadInquirer();
  const promptModule = inq.createPromptModule();
  let bottomBar: inquirer.ui.BottomBar | undefined;

  async function createPrompter(question: PromptQuestionConfirm): Promise<PromptValueConfirm>;
  async function createPrompter(question: PromptQuestionCheckbox): Promise<PromptValueCheckbox>;
  async function createPrompter(question: PromptQuestionOther): Promise<PromptValueOther>;
  async function createPrompter(question: PromptQuestion): Promise<PromptValue> {
    const { fallback, ...promptQuestion } = question;

    if (!TERMINAL_INFO.tty || interactive === false) {
      if (typeof fallback !== 'undefined') {
        debug('Answering with provided fallback value for non-tty mode: %o', fallback);
        return fallback;
      } else if (onFallback) {
        const generatedFallback = onFallback(question);

        if (typeof generatedFallback !== 'undefined') {
          debug(`Answering with fallback value from 'onFallback' for non-tty mode: %o`, generatedFallback);
          return generatedFallback;
        }
      }

      if (typeof promptQuestion.default !== 'undefined') {
        return promptQuestion.default;
      }

      if (question.type === 'confirm') {
        return false;
      } else if (question.type === 'checkbox') {
        return [];
      }

      return '';
    }

    const name = 'name';
    const prompt = promptModule({ ...promptQuestion, name });
    const result = (await prompt)[name];

    if (typeof result === 'undefined' || result === null) {
      return '';
    }

    if (typeof result !== 'string' && typeof result !== 'boolean' && !Array.isArray(result)) {
      return String(result);
    }

    return result;
  }

  function getBottomBar(): inquirer.ui.BottomBar {
    if (!bottomBar) {
      bottomBar = new inq.ui.BottomBar();

      try {
        // the mute() call appears to be necessary, otherwise when answering
        // inquirer prompts upon pressing enter, a copy of the prompt is
        // printed to the screen and looks gross
        (<any>bottomBar).rl.output.mute();
      } catch (e) {
        debug('Error while muting bottomBar output: %o', e);
      }
    }

    return bottomBar;
  }

  function open() {
    getBottomBar();
  }

  function close() {
    if (bottomBar) {
      // instantiating inquirer.ui.BottomBar hangs, so when close() is called,
      // close BottomBar streams
      bottomBar.close();
      bottomBar = undefined;
    }
  }

  function createLogger(options: Partial<LoggerOptions> = {}): Logger {
    return new Logger({ ...options, handlers: createLoggerHandlers() });
  }

  function createLoggerHandlers(options: Partial<StreamHandlerOptions> = {}): Set<StreamHandler> {
    const bottomBar = getBottomBar();

    return new Set([
      new StreamHandler({ ...options, stream: bottomBar.log }),
    ]);
  }

  function updatePromptBar(message: string) {
    const bottomBar = getBottomBar();
    bottomBar.updateBottomBar(message);
  }

  Object.defineProperties(createPrompter, {
    open: { value: open },
    close: { value: close },
    createLogger: { value: createLogger },
    createLoggerHandlers: { value: createLoggerHandlers },
    updatePromptBar: { value: updatePromptBar },
  });

  return <any>createPrompter;
}

export function createPromptChoiceSeparator(): InquirerObjects.Separator {
  if (!_inquirer) {
    throw new Error(`Prompt module not initialized. Call 'createPromptModule' first.`);
  }

  return new _inquirer.Separator();
}
