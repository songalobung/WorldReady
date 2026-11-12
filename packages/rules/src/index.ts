export * from './types.js';

export {
  WRD001HardcodedText,
  wrd001HardcodedText,
  WRD001_META,
} from './wrd001-hardcoded-text.js';

export {
  WRD002TextConcatenation,
  wrd002TextConcatenation,
  WRD002_META,
} from './wrd002-text-concatenation.js';

export {
  WRD101MissingTranslationKey,
  wrd101MissingTranslationKey,
  WRD101_META,
} from './wrd101-missing-translation-key.js';

export {
  WRD102UnusedTranslationKey,
  wrd102UnusedTranslationKey,
  WRD102_META,
} from './wrd102-unused-translation-key.js';

export {
  WRD103PlaceholderMismatch,
  wrd103PlaceholderMismatch,
  WRD103_META,
  extractPlaceholders,
} from './wrd103-placeholder-mismatch.js';

export {
  WRD301RtlDeclaration,
  wrd301RtlDeclaration,
  WRD301_META,
} from './wrd301-rtl-declaration.js';

export {
  WRD302PhysicalCss,
  wrd302PhysicalCss,
  WRD302_META,
} from './wrd302-physical-css.js';

export {
  WRD401LocaleInsensitiveFormatting,
  wrd401LocaleInsensitiveFormatting,
  WRD401_META,
} from './wrd401-locale-insensitive-formatting.js';

import type { Rule } from './types.js';
import { wrd001HardcodedText } from './wrd001-hardcoded-text.js';
import { wrd002TextConcatenation } from './wrd002-text-concatenation.js';
import { wrd101MissingTranslationKey } from './wrd101-missing-translation-key.js';
import { wrd102UnusedTranslationKey } from './wrd102-unused-translation-key.js';
import { wrd103PlaceholderMismatch } from './wrd103-placeholder-mismatch.js';
import { wrd301RtlDeclaration } from './wrd301-rtl-declaration.js';
import { wrd302PhysicalCss } from './wrd302-physical-css.js';
import { wrd401LocaleInsensitiveFormatting } from './wrd401-locale-insensitive-formatting.js';

export const allRules: Rule[] = [
  wrd001HardcodedText,
  wrd002TextConcatenation,
  wrd101MissingTranslationKey,
  wrd102UnusedTranslationKey,
  wrd103PlaceholderMismatch,
  wrd301RtlDeclaration,
  wrd302PhysicalCss,
  wrd401LocaleInsensitiveFormatting,
];
