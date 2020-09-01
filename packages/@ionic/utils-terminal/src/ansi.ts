const ESC = '\u001B[';

/**
 * ANSI escape codes (WIP)
 *
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code
 */
export class EscapeCode {
  static readonly cursorLeft = (): string => `${ESC}G`;
  static readonly cursorUp = (count = 1): string => `${ESC}${count}A`;
  static readonly cursorDown = (count = 1): string => `${ESC}${count}B`;
  static readonly cursorForward = (count = 1): string => `${ESC}${count}C`;
  static readonly cursorBackward = (count = 1): string => `${ESC}${count}D`;
  static readonly cursorHide = (): string => `${ESC}?25l`;
  static readonly cursorShow = (): string => `${ESC}?25h`;

  static readonly eraseLine = (): string => `${ESC}2K`;
  static readonly eraseLines = (count: number): string => {
    let seq = '';

    for (let i = 0; i < count; i++) {
      seq += EscapeCode.eraseLine();

      if (i < count - 1) {
        seq += EscapeCode.cursorUp();
      }
    }

    return `${seq}${EscapeCode.cursorLeft()}`;
  }
  static readonly eraseUp = (): string => `${ESC}1J`;
  static readonly eraseDown = (): string => `${ESC}J`;
  static readonly eraseScreen = (): string => `${ESC}2J`;
}
