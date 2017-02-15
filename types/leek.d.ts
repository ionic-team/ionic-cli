declare module 'leek' {
  namespace Leek {
    interface LeekOptions {
      name: string;
      trackingCode: string;
      globalName: string;
      version: string;
      adapterUrls?: string[];
      adapterServers?: string[];
      silent?: boolean;
    }
    interface TrackOptions {
      name: string;
      message: string;
    }
    interface TrackErrorOptions {
      description: string;
      isFatal: boolean;
    }
    interface TrackTimingOptions {
      category: string;
      variable: string;
      value: string;
      label: string;
    }
    interface TrackEventOptions {
      name: string;
      category: string;
      label: string;
      value: string;
    }
  }
  class Leek {
    constructor(options: Leek.LeekOptions);
    setName(value: string): void;
    track(meta: Leek.TrackOptions): Promise<void>;
    trackError(meta: Leek.TrackErrorOptions): Promise<void>;
    trackTiming(meta: Leek.TrackTimingOptions): Promise<void>
    trackEvent(meta: Leek.TrackEventOptions): Promise<void>;
  }

  export = Leek;
}
