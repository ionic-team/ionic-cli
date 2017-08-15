const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email?: any): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  return EMAIL_REGEX.test(email);
}

export function strcmp(a: string | undefined, b: string | undefined): number {
  if (!a) {
    a = '';
  }

  if (!b) {
    b = '';
  }

  return +(a > b) || +(a === b) - 1;
}

export function str2num(value: any, defaultValue: number = -1): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return defaultValue;
  }

  const result = parseInt(value, 10);

  if (isNaN(result)) {
    return defaultValue;
  }

  return result;
}
