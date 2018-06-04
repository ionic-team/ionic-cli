export const PLATFORM_IOS = 'ios';
export const PLATFORM_ANDROID = 'android';
export const PLATFORM_WINDOWS = 'windows';

export const AVAILABLE_PLATFORMS = [PLATFORM_IOS, PLATFORM_ANDROID, PLATFORM_WINDOWS];

export function platformPrettyName(platform: string): string {
  if (platform === 'ios') {
    return 'iOS';
  } else if (platform === 'android') {
    return 'Android';
  } else if (platform === 'windows') {
    return 'Windows';
  }

  return 'Unknown';
}

export function platformIoniconClass(platform: string): string {
  let key = platform;

  if (platform === 'ios') {
    key = 'apple';
  }

  return `ion-social-${key}`;
}

export function platformMode(platform: string): string {
  if (platform === 'android') {
    return 'md';
  }

  return platform;
}
