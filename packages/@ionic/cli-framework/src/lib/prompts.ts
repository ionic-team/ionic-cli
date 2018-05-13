import * as Debug from 'debug';
import * as inquirerType from 'inquirer';

import { TERMINAL_INFO } from '../utils/terminal';

const debug = Debug('ionic:cli-framework:lib:prompts');

let _inquirer: inquirerType.Inquirer | undefined;

export interface PromptQuestionBase extends inquirerType.Question {
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
}

async function loadInquirer(): Promise<inquirerType.Inquirer> {
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
  const inquirer = await loadInquirer();
  const promptModule = inquirer.createPromptModule();

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

  return createPrompter;
}

export function createPromptChoiceSeparator() {
  if (!_inquirer) {
    throw new Error(`Prompt module not initialized. Call 'createPromptModule' first.`);
  }

  return new _inquirer.Separator();
}
