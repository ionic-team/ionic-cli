import { readFile, writeFile, unlink } from "@ionic/utils-fs";
import { parse, build } from "plist";

export const IOS_INFO_FILE = "Info.plist";

export class CapacitorIosInfo {
  protected _doc?: any;
  protected origInfoPlistContent?: string;
  protected saving = false;

  constructor(readonly plistPath: string) {}

  get origPlistPath(): string {
      return `${this.plistPath}.orig`;
  }

  get doc(): any {
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
    if (this.doc["NSAppTransportSecurity"]) {
      this.doc["NSAllowsArbitraryLoads"] = true
    } else {
      this.doc["NSAppTransportSecurity"] = {
        "NSAllowsArbitraryLoads": true
      }
    }
  }

  async reset(): Promise<void> {
    const origInfoPlistContent = await readFile(this.origPlistPath, { encoding: 'utf8' });

    if (!this.saving) {
      this.saving = true;
      await writeFile(this.plistPath, origInfoPlistContent, { encoding: 'utf8' });
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
      this._doc = parse(this.origInfoPlistContent!) as object;
    } catch (e: any) {
      throw new Error(`Cannot parse ${IOS_INFO_FILE} file: ${e.stack ?? e}`);
    }
  }

  protected write(): string {
    const contents = build(this.doc, {
       pretty: true,
    })

    return contents;
  }
}
