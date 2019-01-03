class FileUtils {
  private filenameReservedRegex = (/[<>:"\/\\|?*\x00-\x1F]/g);
  private filenameReservedRegexWindows = (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i);

  isValidFileName(fileName: any): boolean {
    if (!fileName || fileName.length > 255) {
      return false;
    }

    if (this.filenameReservedRegex.test(fileName) || this.filenameReservedRegexWindows.test(fileName)) {
      return false;
    }

    if (/^\.\.?$/.test(fileName)) {
      return false;
    }

    return true;
  }
}

export const fileUtils = new FileUtils();
