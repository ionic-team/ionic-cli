import * as onExit from 'signal-exit';

import { EscapeCode } from './ansi';

export class Cursor {
  static stream: NodeJS.WriteStream = process.stderr;
  private static _isVisible = true;
  private static _listenerAttached = false;

  static show() {
    if (Cursor.stream.isTTY) {
      Cursor._isVisible = true;
      Cursor.stream.write(EscapeCode.cursorShow());
    }
  }

  static hide() {
    if (Cursor.stream.isTTY) {
      if (!Cursor._listenerAttached) {
        onExit(() => {
          Cursor.show();
        });

        Cursor._listenerAttached = true;
      }

      Cursor._isVisible = false;
      Cursor.stream.write(EscapeCode.cursorHide());
    }
  }

  static toggle() {
    if (Cursor._isVisible) {
      Cursor.hide();
    } else {
      Cursor.show();
    }
  }
}
