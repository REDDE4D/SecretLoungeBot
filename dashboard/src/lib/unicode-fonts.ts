/**
 * Unicode Font Transformer
 * Converts text to various Unicode fancy fonts and styles
 * These are actual Unicode characters, not HTML/CSS styling
 */

export interface FontStyle {
  id: string;
  name: string;
  example: string;
  transform: (text: string) => string;
}

// Unicode character mappings for different styles
const MATH_BOLD_UPPER = 0x1D400;
const MATH_BOLD_LOWER = 0x1D41A;
const MATH_ITALIC_UPPER = 0x1D434;
const MATH_ITALIC_LOWER = 0x1D44E;
const MATH_BOLD_ITALIC_UPPER = 0x1D468;
const MATH_BOLD_ITALIC_LOWER = 0x1D482;
const MATH_SCRIPT_UPPER = 0x1D49C;
const MATH_SCRIPT_LOWER = 0x1D4B6;
const MATH_BOLD_SCRIPT_UPPER = 0x1D4D0;
const MATH_BOLD_SCRIPT_LOWER = 0x1D4EA;
const MATH_FRAKTUR_UPPER = 0x1D504;
const MATH_FRAKTUR_LOWER = 0x1D51E;
const MATH_BOLD_FRAKTUR_UPPER = 0x1D56C;
const MATH_BOLD_FRAKTUR_LOWER = 0x1D586;
const MATH_DOUBLE_STRUCK_UPPER = 0x1D538;
const MATH_DOUBLE_STRUCK_LOWER = 0x1D552;
const MATH_SANS_UPPER = 0x1D5A0;
const MATH_SANS_LOWER = 0x1D5BA;
const MATH_SANS_BOLD_UPPER = 0x1D5D4;
const MATH_SANS_BOLD_LOWER = 0x1D5EE;
const MATH_SANS_ITALIC_UPPER = 0x1D608;
const MATH_SANS_ITALIC_LOWER = 0x1D622;
const MATH_SANS_BOLD_ITALIC_UPPER = 0x1D63C;
const MATH_SANS_BOLD_ITALIC_LOWER = 0x1D656;
const MATH_MONO_UPPER = 0x1D670;
const MATH_MONO_LOWER = 0x1D68A;
const FULLWIDTH_UPPER = 0xFF21;
const FULLWIDTH_LOWER = 0xFF41;
const FULLWIDTH_DIGITS = 0xFF10;

// Exception characters for mathematical scripts
const SCRIPT_EXCEPTIONS: { [key: string]: number } = {
  'B': 0x212C, 'E': 0x2130, 'F': 0x2131, 'H': 0x210B,
  'I': 0x2110, 'L': 0x2112, 'M': 0x2133, 'R': 0x211B,
  'e': 0x212F, 'g': 0x210A, 'o': 0x2134,
};

// Exception characters for double-struck
const DOUBLE_STRUCK_EXCEPTIONS: { [key: string]: number } = {
  'C': 0x2102, 'H': 0x210D, 'N': 0x2115, 'P': 0x2119,
  'Q': 0x211A, 'R': 0x211D, 'Z': 0x2124,
};

/**
 * Helper function to transform text using Unicode offset
 */
function transformWithOffset(text: string, upperOffset: number, lowerOffset: number, digitOffset?: number): string {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);

    // Uppercase A-Z
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(upperOffset + (code - 65));
    }

    // Lowercase a-z
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(lowerOffset + (code - 97));
    }

    // Digits 0-9 (if digit offset provided)
    if (digitOffset && code >= 48 && code <= 57) {
      return String.fromCodePoint(digitOffset + (code - 48));
    }

    // Return original character if not in range
    return char;
  }).join('');
}

/**
 * Transform with exception handling
 */
function transformWithExceptions(
  text: string,
  upperOffset: number,
  lowerOffset: number,
  exceptions: { [key: string]: number }
): string {
  return text.split('').map(char => {
    // Check for exceptions first
    if (exceptions[char]) {
      return String.fromCodePoint(exceptions[char]);
    }

    const code = char.charCodeAt(0);

    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(upperOffset + (code - 65));
    }

    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(lowerOffset + (code - 97));
    }

    return char;
  }).join('');
}

/**
 * Small caps transformation
 */
function toSmallCaps(text: string): string {
  const smallCapsMap: { [key: string]: string } = {
    'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ',
    'H': 'ʜ', 'I': 'ɪ', 'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ',
    'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ', 'S': 'ꜱ', 'T': 'ᴛ', 'U': 'ᴜ',
    'V': 'ᴠ', 'W': 'ᴡ', 'Y': 'ʏ', 'Z': 'ᴢ',
  };

  return text.split('').map(char => {
    const upper = char.toUpperCase();
    return smallCapsMap[upper] || char.toLowerCase();
  }).join('');
}

/**
 * Circled letters
 */
function toCircled(text: string): string {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);

    // Uppercase A-Z
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(0x24B6 + (code - 65));
    }

    // Lowercase a-z
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(0x24D0 + (code - 97));
    }

    // Digits 0-9
    if (code >= 48 && code <= 57) {
      if (code === 48) return '⓪';
      return String.fromCodePoint(0x2460 + (code - 49));
    }

    return char;
  }).join('');
}

/**
 * Squared letters (negative/inverted)
 */
function toSquared(text: string): string {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);

    // Uppercase A-Z
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(0x1F130 + (code - 65));
    }

    return char;
  }).join('');
}

/**
 * Upside down text
 */
function toUpsideDown(text: string): string {
  const flipMap: { [key: string]: string } = {
    'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ',
    'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u',
    'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n',
    'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
    'A': '∀', 'B': 'q', 'C': 'Ɔ', 'D': 'p', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': '⅁',
    'H': 'H', 'I': 'I', 'J': 'ſ', 'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N',
    'O': 'O', 'P': 'Ԁ', 'Q': 'Ό', 'R': 'ɹ', 'S': 'S', 'T': '┴', 'U': '∩',
    'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
    '0': '0', '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ',
    '6': '9', '7': 'ㄥ', '8': '8', '9': '6',
    '!': '¡', '?': '¿', '.': '˙', ',': '\'', '\'': ',', '"': '„',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{',
  };

  return text.split('').reverse().map(char => flipMap[char] || char).join('');
}

/**
 * Bubble text (negative circled)
 */
function toBubble(text: string): string {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);

    // Uppercase A-Z
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(0x1F150 + (code - 65));
    }

    // Lowercase to uppercase bubble
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(0x1F150 + (code - 97));
    }

    return char;
  }).join('');
}

/**
 * Tiny text (superscript)
 */
function toTiny(text: string): string {
  const tinyMap: { [key: string]: string } = {
    'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ', 'E': 'ᴱ', 'F': 'ᶠ', 'G': 'ᴳ',
    'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ',
    'O': 'ᴼ', 'P': 'ᴾ', 'Q': 'ᵠ', 'R': 'ᴿ', 'S': 'ˢ', 'T': 'ᵀ', 'U': 'ᵁ',
    'V': 'ⱽ', 'W': 'ᵂ', 'X': 'ˣ', 'Y': 'ʸ', 'Z': 'ᶻ',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ',
    'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ',
    'o': 'ᵒ', 'p': 'ᵖ', 'q': 'ᑫ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
    '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  };

  return text.split('').map(char => tinyMap[char] || char).join('');
}

/**
 * Subscript text
 */
function toSubscript(text: string): string {
  const subscriptMap: { [key: string]: string } = {
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
    'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
    's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅',
    '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  };

  return text.split('').map(char => subscriptMap[char.toLowerCase()] || char).join('');
}

/**
 * Strikethrough with combining characters
 */
function toStrikethroughCombining(text: string): string {
  const COMBINING_SHORT_STROKE_OVERLAY = '\u0335';
  return text.split('').map(char => char + COMBINING_SHORT_STROKE_OVERLAY).join('');
}

/**
 * Double strikethrough
 */
function toDoubleStrikethrough(text: string): string {
  const COMBINING_DOUBLE_STROKE = '\u0338';
  return text.split('').map(char => char + COMBINING_DOUBLE_STROKE).join('');
}

/**
 * Mirror/Reverse text (not upside down, just backwards)
 */
function toMirror(text: string): string {
  const mirrorMap: { [key: string]: string } = {
    'A': 'A', 'B': 'ᙠ', 'C': 'Ɔ', 'D': 'ᗡ', 'E': 'Ǝ', 'F': 'ꟻ', 'G': 'Ꭾ',
    'H': 'H', 'I': 'I', 'J': 'Ⴑ', 'K': '⋊', 'L': '⅃', 'M': 'M', 'N': 'Ͷ',
    'O': 'O', 'P': 'ꟼ', 'Q': 'Ọ', 'R': 'Я', 'S': 'Ꙅ', 'T': 'T', 'U': 'U',
    'V': 'V', 'W': 'W', 'X': 'X', 'Y': 'Y', 'Z': 'Z',
    'a': 'ɒ', 'b': 'd', 'c': 'ɔ', 'd': 'b', 'e': 'ɘ', 'f': 'ʇ', 'g': 'ǫ',
    'h': 'ʜ', 'i': 'i', 'j': 'į', 'k': 'ʞ', 'l': 'l', 'm': 'm', 'n': 'n',
    'o': 'o', 'p': 'q', 'q': 'p', 'r': 'ɿ', 's': 'ꙅ', 't': 'ƚ', 'u': 'u',
    'v': 'v', 'w': 'w', 'x': 'x', 'y': 'y', 'z': 'z',
  };

  return text.split('').reverse().map(char => mirrorMap[char] || char).join('');
}

/**
 * Vaporwave/Aesthetic text (fullwidth with spaces)
 */
function toVaporwave(text: string): string {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);

    // Space becomes wider space
    if (code === 32) return '　'; // Fullwidth space

    // Uppercase A-Z
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(FULLWIDTH_UPPER + (code - 65));
    }

    // Lowercase a-z
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(FULLWIDTH_LOWER + (code - 97));
    }

    // Digits 0-9
    if (code >= 48 && code <= 57) {
      return String.fromCodePoint(FULLWIDTH_DIGITS + (code - 48));
    }

    return char;
  }).join('　'); // Add fullwidth space between each character
}

/**
 * Zalgo/Glitch text (combining diacritical marks)
 */
function toZalgo(text: string): string {
  const combiningMarks = [
    // Above
    '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307',
    '\u0308', '\u0309', '\u030A', '\u030B', '\u030C', '\u030D', '\u030E', '\u030F',
    '\u0310', '\u0311', '\u0312', '\u0313', '\u0314', '\u0315', '\u031A', '\u031B',
    '\u033D', '\u033E', '\u033F', '\u0340', '\u0341', '\u0342', '\u0343', '\u0344',
    '\u0346', '\u034A', '\u034B', '\u034C', '\u0350', '\u0351', '\u0352', '\u0357',
    '\u035B', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367', '\u0368', '\u0369',
    '\u036A', '\u036B', '\u036C', '\u036D', '\u036E', '\u036F',
  ];

  return text.split('').map(char => {
    if (char === ' ') return char;

    // Add 2-4 random combining marks per character
    const numMarks = Math.floor(Math.random() * 3) + 2;
    let result = char;
    for (let i = 0; i < numMarks; i++) {
      const mark = combiningMarks[Math.floor(Math.random() * combiningMarks.length)];
      result += mark;
    }
    return result;
  }).join('');
}

/**
 * All available font styles
 */
export const FONT_STYLES: FontStyle[] = [
  {
    id: 'normal',
    name: 'Normal',
    example: 'ABCabc123',
    transform: (text) => text,
  },
  {
    id: 'bold-sans',
    name: '𝗕𝗼𝗹𝗱 𝗦𝗮𝗻𝘀',
    example: '𝗔𝗕𝗖𝗮𝗯𝗰𝟭𝟮𝟯',
    transform: (text) => transformWithOffset(text, MATH_SANS_BOLD_UPPER, MATH_SANS_BOLD_LOWER),
  },
  {
    id: 'italic-sans',
    name: '𝘐𝘵𝘢𝘭𝘪𝘤 𝘚𝘢𝘯𝘴',
    example: '𝘈𝘉𝘊𝘢𝘣𝘤123',
    transform: (text) => transformWithOffset(text, MATH_SANS_ITALIC_UPPER, MATH_SANS_ITALIC_LOWER),
  },
  {
    id: 'bold-italic-sans',
    name: '𝘽𝙤𝙡𝙙 𝙄𝙩𝙖𝙡𝙞𝙘 𝙎𝙖𝙣𝙨',
    example: '𝘼𝘽𝘾𝙖𝙗𝙘123',
    transform: (text) => transformWithOffset(text, MATH_SANS_BOLD_ITALIC_UPPER, MATH_SANS_BOLD_ITALIC_LOWER),
  },
  {
    id: 'bold-serif',
    name: '𝐁𝐨𝐥𝐝 𝐒𝐞𝐫𝐢𝐟',
    example: '𝐀𝐁𝐂𝐚𝐛𝐜𝟏𝟐𝟑',
    transform: (text) => transformWithOffset(text, MATH_BOLD_UPPER, MATH_BOLD_LOWER),
  },
  {
    id: 'italic-serif',
    name: '𝐼𝑡𝑎𝑙𝑖𝑐 𝑆𝑒𝑟𝑖𝑓',
    example: '𝐴𝐵𝐶𝑎𝑏𝑐123',
    transform: (text) => transformWithOffset(text, MATH_ITALIC_UPPER, MATH_ITALIC_LOWER),
  },
  {
    id: 'bold-italic-serif',
    name: '𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄 𝑺𝒆𝒓𝒊𝒇',
    example: '𝑨𝑩𝑪𝒂𝒃𝒄123',
    transform: (text) => transformWithOffset(text, MATH_BOLD_ITALIC_UPPER, MATH_BOLD_ITALIC_LOWER),
  },
  {
    id: 'script',
    name: '𝒮𝒸𝓇𝒾𝓅𝓉',
    example: '𝒜ℬ𝒞𝒶𝒷𝒸123',
    transform: (text) => transformWithExceptions(text, MATH_SCRIPT_UPPER, MATH_SCRIPT_LOWER, SCRIPT_EXCEPTIONS),
  },
  {
    id: 'bold-script',
    name: '𝓑𝓸𝓵𝓭 𝓢𝓬𝓻𝓲𝓹𝓽',
    example: '𝓐𝓑𝓒𝓪𝓫𝓬123',
    transform: (text) => transformWithOffset(text, MATH_BOLD_SCRIPT_UPPER, MATH_BOLD_SCRIPT_LOWER),
  },
  {
    id: 'fraktur',
    name: '𝔉𝔯𝔞𝔨𝔱𝔲𝔯',
    example: '𝔄𝔅ℭ𝔞𝔟𝔠123',
    transform: (text) => transformWithExceptions(text, MATH_FRAKTUR_UPPER, MATH_FRAKTUR_LOWER, { 'C': 0x212D, 'H': 0x210C, 'I': 0x2111, 'R': 0x211C, 'Z': 0x2128 }),
  },
  {
    id: 'bold-fraktur',
    name: '𝕭𝖔𝖑𝖉 𝕱𝖗𝖆𝖐𝖙𝖚𝖗',
    example: '𝕬𝕭𝕮𝖆𝖇𝖈123',
    transform: (text) => transformWithOffset(text, MATH_BOLD_FRAKTUR_UPPER, MATH_BOLD_FRAKTUR_LOWER),
  },
  {
    id: 'double-struck',
    name: '𝔻𝕠𝕦𝕓𝕝𝕖-𝕊𝕥𝕣𝕦𝕔𝕜',
    example: '𝔸𝔹ℂ𝕒𝕓𝕔𝟙𝟚𝟛',
    transform: (text) => transformWithExceptions(text, MATH_DOUBLE_STRUCK_UPPER, MATH_DOUBLE_STRUCK_LOWER, DOUBLE_STRUCK_EXCEPTIONS),
  },
  {
    id: 'monospace',
    name: '𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎',
    example: '𝙰𝙱𝙲𝚊𝚋𝚌𝟷𝟸𝟹',
    transform: (text) => transformWithOffset(text, MATH_MONO_UPPER, MATH_MONO_LOWER),
  },
  {
    id: 'fullwidth',
    name: 'Ｆｕｌｌｗｉｄｔｈ',
    example: 'ＡＢＣａｂｃ１２３',
    transform: (text) => transformWithOffset(text, FULLWIDTH_UPPER, FULLWIDTH_LOWER, FULLWIDTH_DIGITS),
  },
  {
    id: 'small-caps',
    name: 'ꜱᴍᴀʟʟ ᴄᴀᴘꜱ',
    example: 'ᴀʙᴄᴀʙᴄ123',
    transform: toSmallCaps,
  },
  {
    id: 'circled',
    name: 'Ⓒⓘⓡⓒⓛⓔⓓ',
    example: 'ⒶⒷⒸⓐⓑⓒ①②③',
    transform: toCircled,
  },
  {
    id: 'squared',
    name: '🅂🅀🅄🄰🅁🄴🄳',
    example: '🅰🅱🅲abc123',
    transform: toSquared,
  },
  {
    id: 'upside-down',
    name: 'uʍop ǝpᴉsd∩',
    example: 'Ɔq∀ɔqɐƖᄅƐ',
    transform: toUpsideDown,
  },
  {
    id: 'bubble',
    name: '🅱🆄🅱🅱🅻🅴',
    example: '🅰🅱🅲abc123',
    transform: toBubble,
  },
  {
    id: 'tiny',
    name: 'ᵀᶦⁿʸ ᵀᵉˣᵗ',
    example: 'ᴬᴮᶜᵃᵇᶜ¹²³',
    transform: toTiny,
  },
  {
    id: 'subscript',
    name: 'Subscript',
    example: 'ₐₑₕᵢⱼₖ₁₂₃',
    transform: toSubscript,
  },
  {
    id: 'strikethrough-combining',
    name: 'S̵t̵r̵i̵k̵e̵t̵h̵r̵o̵u̵g̵h̵',
    example: 'A̵B̵C̵a̵b̵c̵1̵2̵3̵',
    transform: toStrikethroughCombining,
  },
  {
    id: 'double-strikethrough',
    name: 'D̸o̸u̸b̸l̸e̸ S̸t̸r̸i̸k̸e̸',
    example: 'A̸B̸C̸a̸b̸c̸1̸2̸3̸',
    transform: toDoubleStrikethrough,
  },
  {
    id: 'mirror',
    name: 'ɿoɿɿiM',
    example: 'ƆdAɔdɒ⁹⁸⁷',
    transform: toMirror,
  },
  {
    id: 'vaporwave',
    name: 'Ａ　Ｅ　Ｓ　Ｔ　Ｈ　Ｅ　Ｔ　Ｉ　Ｃ',
    example: 'Ａ　Ｂ　Ｃ　ａ　ｂ　ｃ',
    transform: toVaporwave,
  },
  {
    id: 'zalgo',
    name: 'Z̴̗̈́a̷͝l̶̓g̵̈o̶̐',
    example: 'G̴l̷i̶t̴c̷h̶y̵',
    transform: toZalgo,
  },
];

/**
 * Get a font style by ID
 */
export function getFontStyle(id: string): FontStyle | undefined {
  return FONT_STYLES.find(style => style.id === id);
}

/**
 * Apply a font style to text
 */
export function applyFontStyle(text: string, styleId: string): string {
  const style = getFontStyle(styleId);
  if (!style) return text;
  return style.transform(text);
}
