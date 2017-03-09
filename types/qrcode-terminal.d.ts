declare module "qrcode-terminal" {
  namespace qrCodeTerminal {
    function setErrorLevel(text: string): void;
    function generate(text: string): void;
    function generate(text: string, callback: Function): void;
    function generate(text: string, options: { [key: string]: any }): void;
    function generate(text: string, options: { [key: string]: any }, callback: Function): void;
  }

  export = qrCodeTerminal;
}
