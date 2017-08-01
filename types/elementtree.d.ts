declare module 'elementtree' {
  namespace et {
    class ElementTree {
      getroot(): IElement;
      find(p: string): IElement | null;
      findall(p: string): IElement[];
      write(opts?: { indent?: number }): string;
    }

    interface IElement {
      tag: string;
      attrib: { [key: string]: string };
      text: null | string;
      tail: null | string;

      find(p: string): IElement | null;
      findall(p: string): IElement[];
      getchildren(): IElement[];
      append(e: IElement): void;
      remove(e: IElement): void;
      extend(e: IElement[]): void;
      clear(): void;
      get(k: string): string | undefined;
      set(k: string, v?: string): string;
      keys(): string[];
      items(): [string, string][];
    }

    function Element(tag: string, attrib: { [key: string]: string }): IElement;
    function SubElement(parent: IElement, tag: string, attrib: { [key: string]: string }): IElement;
    function parse(data: string): ElementTree;
  }

  export = et;
}
