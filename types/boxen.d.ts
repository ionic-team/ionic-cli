declare module 'boxen' {
  function boxen(input: string, options?: boxen.BoxenOptions): string;

  namespace boxen {
    interface TopRightBottomLeft {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    }

    interface BoxenBorderStyle {
      topLeft: string;
      topRight: string;
      bottomLeft: string;
      bottomRight: string;
      horizontal: string;
      vertical: string;
    }

    interface BoxenOptions {
      borderColor?: string;
      borderStyle?: 'single' | 'double' | 'round' | 'single-double' | 'double-single' | 'classic' | BoxenBorderStyle;
      dimBorder?: boolean;
      padding?: number | TopRightBottomLeft;
      margin?: number | TopRightBottomLeft;
      float?: 'right' | 'center' | 'left';
      backgroundColor?: 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';
      align?: 'right' | 'center' | 'left';
    }
  }

  export = boxen;
}
