import { BackendFlag } from '../definitions';

export const BACKEND_LEGACY: BackendFlag = 'legacy';
export const BACKEND_PRO: BackendFlag = 'pro';
export const KNOWN_BACKENDS: BackendFlag[] = [BACKEND_PRO, BACKEND_LEGACY];
