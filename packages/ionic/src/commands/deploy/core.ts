import { CommandLineOptions, combine, contains, validators } from '@ionic/cli-framework';
import { pathExists, pathWritable, readFile, writeFile } from '@ionic/utils-fs';
import * as et from 'elementtree';
import * as path from 'path';

import { input, strong } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

export abstract class DeployConfCommand extends Command {

  protected readonly optionsToPlistKeys = {
    'app-id': 'IonAppId',
    'channel-name': 'IonChannelName',
    'update-method': 'IonUpdateMethod',
    'max-store': 'IonMaxVersions',
    'min-background-duration': 'IonMinBackgroundDuration',
    'update-api': 'IonApi',
  };
  protected readonly optionsToStringXmlKeys = {
    'app-id': 'ionic_app_id',
    'channel-name': 'ionic_channel_name',
    'update-method': 'ionic_update_method',
    'max-store': 'ionic_max_versions',
    'min-background-duration': 'ionic_min_background_duration',
    'update-api': 'ionic_update_api',
  };

  protected async getAppIntegration(): Promise<string | undefined> {
    if (this.project) {
      if (this.project.getIntegration('capacitor') !== undefined) {
        return 'capacitor';
      }
      if (this.project.getIntegration('cordova') !== undefined) {
        return 'cordova';
      }
    }
    return undefined;
  }

  protected async requireNativeIntegration(): Promise<void> {
    const integration = await this.getAppIntegration();

    if (!integration) {
      throw new FatalException(
        `It looks like your app isn't integrated with Capacitor or Cordova.\n` +
        `In order to add the Appflow Deploy plugin, you will need to integrate your app with Capacitor or Cordova. See the docs for setting up native projects:\n\n` +
        `iOS: ${strong('https://ionicframework.com/docs/building/ios')}\n` +
        `Android: ${strong('https://ionicframework.com/docs/building/android')}\n`
      );
    }
  }

  protected async getAppId(): Promise<string | undefined> {
    if (this.project) {
      return this.project.config.get('id');
    }
    return undefined;
  }

  protected async checkDeployInstalled(): Promise<boolean> {
    if (!this.project) {
      return false;
    }
    const packageJson = await this.project.requirePackageJson();
    return packageJson.dependencies ? 'cordova-plugin-ionic' in packageJson.dependencies : false;
  }

  protected printPlistInstructions(options: CommandLineOptions): void {
    let outputString = `You will need to manually modify the Info.plist for your iOS project.\n Please add the following content to your Info.plist file:\n`;
    for (const [optionKey, pKey] of Object.entries(this.optionsToPlistKeys)) {
      outputString = `${outputString}<key>${pKey}</key>\n<string>${options[optionKey]}</string>\n`;
    }
    this.env.log.warn(outputString);
  }

  protected printStringXmlInstructions(options: CommandLineOptions): void {
    let outputString = `You will need to manually modify the string.xml for your Android project.\n Please add the following content to your string.xml file:\n`;
    for (const [optionKey, pKey] of Object.entries(this.optionsToPlistKeys)) {
      outputString = `${outputString}<string name="${pKey}">${options[optionKey]}</string>\n`;
    }
    this.env.log.warn(outputString);
  }

  protected async getIosCapPlist(): Promise<string> {
    if (!this.project) {
      return '';
    }
    const capIntegration = this.project.getIntegration('capacitor');
    if (!capIntegration) {
      return '';
    }
    // check first if iOS exists
    if (!await pathExists(path.join(capIntegration.root, 'ios'))) {
      return '';
    }
    const assumedPlistPath = path.join(capIntegration.root, 'ios', 'App', 'App', 'Info.plist');
    if (!await pathWritable(assumedPlistPath)) {
      throw new Error('The iOS Info.plist could not be found.');
    }
    return assumedPlistPath;
  }

  protected async getAndroidCapString(): Promise<string> {
    if (!this.project) {
      return '';
    }
    const capIntegration = this.project.getIntegration('capacitor');
    if (!capIntegration) {
      return '';
    }
    // check first if iOS exists
    if (!await pathExists(path.join(capIntegration.root, 'android'))) {
      return '';
    }
    const assumedStringXmlPath = path.join(capIntegration.root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
    if (!await pathWritable(assumedStringXmlPath)) {
      throw new Error('The Android string.xml could not be found.');
    }
    return assumedStringXmlPath;
  }

  protected async addConfToIosPlist(options: CommandLineOptions): Promise<boolean> {
    let plistPath;
    try {
      plistPath = await this.getIosCapPlist();
    } catch (e) {
      this.env.log.warn(e.message);
      this.printPlistInstructions(options);
      return false;
    }
    if (!plistPath) {
      this.env.log.info(`No Capacitor iOS project found.`);
      return false;
    }
    // try to load the plist file first
    let plistData;
    try {
      const plistFile = await readFile(plistPath);
      plistData = plistFile.toString();
    } catch (e) {
      this.env.log.error(`The iOS Info.plist could not be read.`);
      this.printPlistInstructions(options);
      return false;
    }
    // parse it with elementtree
    let etree;
    try {
      etree = et.parse(plistData);
    } catch (e) {
      this.env.log.error(`Impossible to parse the XML in the Info.plist`);
      this.printPlistInstructions(options);
      return false;
    }
    // check that it is an actual plist file (root tag plist and first child dict)
    const root = etree.getroot();
    if (root.tag !== 'plist') {
      this.env.log.error(`Info.plist is not a valid plist file because the root is not a <plist> tag`);
      this.printPlistInstructions(options);
      return false;
    }
    const pdict = root.find('./dict');
    if (!pdict) {
      this.env.log.error(`Info.plist is not a valid plist file because the first child is not a <dict> tag`);
      this.printPlistInstructions(options);
      return false;
    }
    // check which options are set (configure might not have all of them set)
    const setOptions: { [key: string]: string } = {};
    for (const [optionKey, plistKey] of Object.entries(this.optionsToPlistKeys)) {
      if (options[optionKey]) {
        setOptions[optionKey] = plistKey;
      }
    }
    if (Object.entries(setOptions).length === 0) {
      this.env.log.warn(`No new options detected for Info.plist`);
      return false;
    }

    // because elementtree has limited XPath support we cannot just run a smart selection, so we need to loop over all the elements
    const pdictChildren = pdict.getchildren();
    // there is no way to refer to a first right sibling in elementtree, so we use flags
    let removeNextStringTag = false;
    for (const element of pdictChildren) {
      // we remove all the existing element if there
      if ((element.tag === 'key') && (element.text) && Object.values(setOptions).includes(element.text as string)) {
        pdict.remove(element);
        removeNextStringTag = true;
        continue;
      }
      // and remove the first right sibling (this will happen at the next iteration of the loop
      if ((element.tag === 'string') && removeNextStringTag) {
        pdict.remove(element);
        removeNextStringTag = false;
      }
    }
    // add again the new settings
    for (const [optionKey, plistKey] of Object.entries(setOptions)) {
      const plistValue = options[optionKey];
      if (!plistValue) {
        throw new FatalException(`This should never have happened: a parameter is missing so we cannot write the Info.plist`);
      }
      const pkey = et.SubElement(pdict, 'key');
      pkey.text = plistKey;
      const pstring = et.SubElement(pdict, 'string');
      pstring.text = plistValue;
    }
    // finally write back the modified plist
    const newXML = etree.write({
      encoding: 'utf-8',
      indent: 2,
      xml_declaration: false,
    });
    // elementtree cannot write a doctype, so little hack
    const xmlToWrite = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
      newXML;
    try {
      await writeFile(plistPath, xmlToWrite, { encoding: 'utf-8' });
    } catch (e) {
      this.env.log.error(`Changes to Info.plist could not be written.`);
      this.printPlistInstructions(options);
    }
    this.env.log.ok(`cordova-plugin-ionic variables correctly added to the iOS project`);
    return true;
  }

  protected async addConfToAndroidString(options: CommandLineOptions): Promise<boolean> {
    let stringXmlPath;
    try {
      stringXmlPath = await this.getAndroidCapString();
    } catch (e) {
      this.env.log.warn(e.message);
      this.printPlistInstructions(options);
      return false;
    }
    if (!stringXmlPath) {
      this.env.log.info(`No Capacitor Android project found.`);
      return false;
    }
    // try to load the plist file first
    let stringData;
    try {
      const stringFile = await readFile(stringXmlPath);
      stringData = stringFile.toString();
    } catch (e) {
      this.env.log.error(`The Android string.xml could not be read.`);
      this.printStringXmlInstructions(options);
      return false;
    }
    // parse it with elementtree
    let etree;
    try {
      etree = et.parse(stringData);
    } catch (e) {
      this.env.log.error(`Impossible to parse the XML in the string.xml`);
      this.printStringXmlInstructions(options);
      return false;
    }
    // check that it is an actual string.xml file (root tag is resources)
    const root = etree.getroot();
    if (root.tag !== 'resources') {
      this.env.log.error(`string.xml is not a valid android string.xml file because the root is not a <resources> tag`);
      this.printStringXmlInstructions(options);
      return false;
    }
    // check which options are set (configure might not have all of them set)
    const setOptions: { [key: string]: string } = {};
    for (const [optionKey, plistKey] of Object.entries(this.optionsToStringXmlKeys)) {
      if (options[optionKey]) {
        setOptions[optionKey] = plistKey;
      }
    }
    if (Object.entries(setOptions).length === 0) {
      this.env.log.warn(`No new options detected for string.xml`);
      return false;
    }
    for (const [optionKey, stringKey] of Object.entries(setOptions)) {
      let element = root.find(`./string[@name="${stringKey}"]`);
      // if the tag already exists, just update the content
      if (element) {
        element.text = options[optionKey] as string;
      } else {
        // otherwise create the tag
        element = et.SubElement(root, 'string');
        element.set('name', stringKey);
        element.text = options[optionKey] as string;
      }
    }
    // write back the modified plist
    const newXML = etree.write({
      encoding: 'utf-8',
      indent: 2,
    });
    try {
      await writeFile(stringXmlPath, newXML, { encoding: 'utf-8' });
    } catch (e) {
      this.env.log.error(`Changes to string.xml could not be written.`);
      this.printStringXmlInstructions(options);
    }
    this.env.log.ok(`cordova-plugin-ionic variables correctly added to the Android project`);
    return true;
  }

  protected async preRunCheckInputs(options: CommandLineOptions): Promise<void> {
    const updateMethodList: string[] = ['auto', 'background', 'none'];
    const defaultUpdateMethod = 'background';
    // handle the app-id option in case the user wants to override it
    if (!options['app-id'] && this.env.flags.interactive) {
      const appId = await this.getAppId();
      if (!appId) {
        this.env.log.warn(
          `No app ID found in the project.\n` +
          `Consider running ${input('ionic link')} to connect local apps to Ionic.\n`
        );
      }
      const appIdOption = await this.env.prompt({
        type: 'input',
        name: 'app-id',
        message: `Appflow App ID:`,
        default: appId,
      });
      options['app-id'] = appIdOption;
    }

    if (!options['channel-name'] && this.env.flags.interactive) {
      options['channel-name'] = await this.env.prompt({
        type: 'input',
        name: 'channel-name',
        message: `Channel Name:`,
        validate: v => validators.required(v),
      });
    }

    // validate that the update-method is allowed
    let overrideUpdateMethodChoice = false;
    if (options['update-method'] && !updateMethodList.includes(options['update-method'] as string)) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(
          `${input(options['update-method'] as string)} is not a valid update method.\n` +
          `Please choose a different value for ${input('--update-method')}. Valid update methods are: ${updateMethodList.map(m => input(m)).join(', ')}\n`
        );
      }
      overrideUpdateMethodChoice = true;
    }
    if ((!options['update-method'] || overrideUpdateMethodChoice) && this.env.flags.interactive) {
      options['update-method'] = await this.env.prompt({
        type: 'list',
        name: 'update-method',
        choices: updateMethodList,
        message: `Update Method:`,
        default: defaultUpdateMethod,
        validate: v => combine(validators.required, contains(updateMethodList, {}))(v),
      });
    }

    // check advanced options if present
    if (options['max-store'] && validators.numeric(options['max-store'] as string) !== true) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(
          `${input(options['max-store'] as string)} is not a valid value for the maximum number of versions to store.\n` +
          `Please specify an integer for ${input('--max-store')}.\n`
        );
      }
      options['max-store'] = await this.env.prompt({
        type: 'input',
        name: 'max-store',
        message: `Max Store:`,
        validate: v => combine(validators.required, validators.numeric)(v),
      });
    }

    if (options['min-background-duration'] && validators.numeric(options['min-background-duration'] as string) !== true) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(
          `${input(options['min-background-duration'] as string)} is not a valid value for the number of seconds to wait before checking for updates in the background.\n` +
          `Please specify an integer for ${input('--min-background-duration')}.\n`
        );
      }
      options['min-background-duration'] = await this.env.prompt({
        type: 'input',
        name: 'min-background-duration',
        message: `Min Background Duration:`,
        validate: v => combine(validators.required, validators.numeric)(v),
      });
    }
    if (options['update-api'] && validators.url(options['update-api'] as string) !== true) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(
          `${input(options['update-api'] as string)} is not a valid value for the URL of the API to use.\n` +
          `Please specify a valid URL for ${input('--update-api')}.\n`
        );
      }
      options['update-api'] = await this.env.prompt({
        type: 'input',
        name: 'update-api',
        message: `Update Url:`,
        validate: v => combine(validators.required, validators.url)(v),
      });
    }
  }

}
