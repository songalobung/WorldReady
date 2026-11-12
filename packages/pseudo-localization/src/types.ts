export type PseudoLocale = 'en-XA' | 'ar-XB' | string;

export interface PseudoOptions {
  expansionFactor?: number;
  delimiters?: [string, string];
  preservePlaceholders?: boolean;
}
