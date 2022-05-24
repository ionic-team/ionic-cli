import { readFile, writeFile, unlink } from "@ionic/utils-fs";
import * as et from "elementtree";

export const IOS_INFO_FILE = "Info.plist";

export class CapacitorIosInfo {
  protected _doc?: et.ElementTree;
  protected origInfoPlistContent?: string;
  protected saving = false;

  constructor(readonly plistPath: string) {}

  get origPlistPath(): string {
    return `${this.plistPath}.orig`;
  }

  get doc(): et.ElementTree {
    if (!this._doc) {
      throw new Error("No doc loaded.");
    }

    return this._doc;
  }

  static async load(plistPath: string): Promise<CapacitorIosInfo> {
    if (!plistPath) {
      throw new Error(`Must supply file path for ${IOS_INFO_FILE}.`);
    }

    const conf = new CapacitorIosInfo(plistPath);
    await conf.reload();

    return conf;
  }

  disableAppTransportSecurity() {
    const rootDict = this.getDictRoot();

    let valueDict = this.getValueForKey(rootDict,"NSAppTransportSecurity");
    if (valueDict) {
        const value = this.getValueForKey(valueDict, "NSAllowsArbitraryLoads")
        if (value) {
          value.tag = "true"
        } else {
          et.SubElement(valueDict, "true")
        }
    } else {
      const newKey = et.SubElement(rootDict, "key");
      newKey.text = "NSAppTransportSecurity";

      const newDict = et.SubElement(rootDict, "dict");
      const newDictKey = et.SubElement(newDict, "key")
      newDictKey.text = "NSAllowsArbitraryLoads";
      et.SubElement(newDict, "true")
    }
  }


  private getValueForKey(root: et.Element, key: string): et.Element | null {
    const children = root.getchildren();
    let keyFound = false;

    for (const element of children) {
      if (keyFound) {
        keyFound = false;
      
        return element;
      }

      if ((element.tag === 'key') && element.text === key) {
        keyFound = true;
      }
    }

    return null;
  }

  private getDictRoot(): et.Element {
    const root = this.doc.getroot();

    if (root.tag !== "plist") {
      throw new Error(`Info.plist is not a valid plist file because the root is not a <plist> tag`);
    }

    const rootDict = root.find('./dict');
    if (!rootDict) {
      throw new Error(`Info.plist is not a valid plist file because the first child is not a <dict> tag`);
    }

    return rootDict;
  }

  async reset(): Promise<void> {
    const origInfoPlistContent = await readFile(this.origPlistPath, {
      encoding: "utf8",
    });

    if (!this.saving) {
      this.saving = true;
      await writeFile(this.plistPath, origInfoPlistContent, {
        encoding: "utf8",
      });
      await unlink(this.origPlistPath);
      this.saving = false;
    }
  }

  async save(): Promise<void> {
    if (!this.saving) {
      this.saving = true;

      if (this.origInfoPlistContent) {
        await writeFile(this.origPlistPath, this.origInfoPlistContent, {
          encoding: "utf8",
        });
        this.origInfoPlistContent = undefined;
      }

      await writeFile(this.plistPath, this.write(), { encoding: "utf8" });

      this.saving = false;
    }
  }

  protected async reload(): Promise<void> {
    this.origInfoPlistContent = await readFile(this.plistPath, {
      encoding: "utf8",
    });

    try {
      this._doc = et.parse(this.origInfoPlistContent);
    } catch (e: any) {
      throw new Error(`Cannot parse ${IOS_INFO_FILE} file: ${e.stack ?? e}`);
    }
  }

  protected write(): string {
    const contents = this.doc.write({ indent: 4 });

    return contents;
  }
}
