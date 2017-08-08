import * as path from 'path';

import * as et from 'elementtree';

import { ResourcesPlatform } from '../../definitions';
import { fsReadFile, fsWriteFile } from '../utils/fs';

export interface PlatformEngine {
  name: string;
  spec: string;
  [key: string]: string;
}

export class ConfigXml {
  protected _filePath?: string;
  protected _doc?: et.ElementTree;

  get doc() {
    if (!this._doc) {
      throw new Error('No doc loaded. Call load() properly.');
    }

    return this._doc;
  }

  get filePath() {
    if (!this._filePath) {
      throw new Error('No file path given. Call load() properly.');
    }

    return this._filePath;
  }

  static async load(projectDir: string): Promise<ConfigXml> {
    if (!projectDir) {
      throw new Error('Must supply project directory.');
    }

    const conf = new ConfigXml();
    conf._filePath = path.join(projectDir, 'config.xml');
    const configFileContents = await fsReadFile(conf.filePath, { encoding: 'utf8' });

    conf._doc = et.parse(configFileContents);

    return conf;
  }

  async save(): Promise<void> {
    // Cordova hard codes an indentation of 4 spaces, so we'll follow.
    const contents = this.doc.write({ indent: 4 });

    await fsWriteFile(this.filePath, contents, { encoding: 'utf8' });
  }

  /**
   * Update config.xml content src to be a dev server url. As part of this
   * backup the original content src for a reset to occur at a later time.
   */
  async writeContentSrc(newSrc: string) {
    const root = this.doc.getroot();
    let contentElement = root.find('content');

    if (!contentElement) {
      contentElement = et.SubElement(root, 'content', { src: 'index.html' });
    }

    contentElement.set('original-src', contentElement.get('src'));
    contentElement.set('src', newSrc);

    let navElement = root.find(`allow-navigation[@href='${newSrc}']`);

    if (!navElement) {
      navElement = et.SubElement(root, 'allow-navigation', { href: newSrc });
    }
  }

  /**
   * Set config.xml src url back to its original url
   */
  async resetContentSrc() {
    const root = this.doc.getroot();
    let contentElement = root.find('content');

    if (!contentElement) {
      contentElement = et.SubElement(root, 'content', { src: 'index.html' });
    }

    const originalSrc = contentElement.get('original-src');

    if (originalSrc) {
      contentElement.set('src', originalSrc);
      delete contentElement.attrib['original-src'];
    }
  }

  async getPreference(prefName: string): Promise<string | undefined> {
    const root = this.doc.getroot();

    const preferenceElement = root.find(`preference[@name='${prefName}']`);

    if (!preferenceElement) {
      return undefined;
    }

    const value = preferenceElement.get('value');

    if (!value) {
      return undefined;
    }

    return value;
  }

  async getProjectInfo(): Promise<{ id: string; name: string; version: string; }> {
    const root = this.doc.getroot();

    let id = root.get('id');

    if (!id) {
      id = '';
    }

    let version = root.get('version');

    if (!version) {
      version = '';
    }

    let nameElement = root.find('name');

    if (!nameElement) {
      nameElement = et.SubElement(root, 'name', {});
    }

    if (!nameElement.text) {
      nameElement.text = 'MyApp';
    }

    const name = nameElement.text;

    return { id, name, version };
  }

  async getPlatformEngines(): Promise<PlatformEngine[]> {
    const root = this.doc.getroot();
    const engines = root.findall('engine');

    return engines.map(engine => this.engineElementToPlatformEngine(engine));
  }

  async getPlatformEngine(platform: string): Promise<PlatformEngine | undefined> {
    const root = this.doc.getroot();
    const engine = root.find(`engine[@name='${platform}']`);

    if (!engine) {
      return undefined;
    }

    return this.engineElementToPlatformEngine(engine);
  }

  async ensurePlatformImages(platform: string, resourcesPlatform: ResourcesPlatform) {
    const root = this.doc.getroot();
    const orientation = await this.getPreference('Orientation') || 'default';

    for (let imgName in resourcesPlatform) {
      const imgType = resourcesPlatform[imgName];
      let platformElement = root.find(`platform[@name='${platform}']`);

      if (!platformElement) {
        platformElement = et.SubElement(root, 'platform', { name: platform });
      }

      const images = imgType.images.filter(img => orientation === 'default' || typeof img.orientation === 'undefined' || img.orientation === orientation);

      for (let image of images) {
        const imgPath = ['resources', platform, imgType.nodeName, image.name].join('/'); // TODO: hard-coded 'resources' dir
        let imgElement = platformElement.find(`${imgType.nodeName}[@src='${imgPath}']`);

        if (!imgElement) {
          const attrs: { [key: string]: string } = {};

          for (let attr of imgType.nodeAttributes) {
            let v = (<any>image)[attr]; // TODO

            if (attr === 'src') {
              v = imgPath;
            }

            attrs[attr] = v;
          }

          imgElement = et.SubElement(platformElement, imgType.nodeName, attrs);
        }
      }
    }
  }

  async ensureSplashScreenPreferences() {
    const root = this.doc.getroot();

    let splashScreenPrefElement = root.find(`preference[@name='SplashScreen']`);

    if (!splashScreenPrefElement) {
      splashScreenPrefElement = et.SubElement(root, 'preference', { name: 'SplashScreen', value: 'screen' });
    }

    let splashShowOnlyFirstTimePrefElement = root.find(`preference[@name='SplashShowOnlyFirstTime']`);

    if (!splashShowOnlyFirstTimePrefElement) {
      splashShowOnlyFirstTimePrefElement = et.SubElement(root, 'preference', { name: 'SplashShowOnlyFirstTime', value: 'false' });
    }

    let splashScreenDelayPrefElement = root.find(`preference[@name='SplashScreenDelay']`);

    if (!splashScreenDelayPrefElement) {
      splashScreenDelayPrefElement = et.SubElement(root, 'preference', { name: 'SplashScreenDelay', value: '3000' });
    }
  }

  protected engineElementToPlatformEngine(engine: et.IElement): PlatformEngine {
    const name = engine.get('name');
    const spec = engine.get('spec');

    return { name: name ? name : '', spec: spec ? spec : '', ...engine.attrib };
  }
}
