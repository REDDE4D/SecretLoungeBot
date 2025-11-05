import { Mark, mergeAttributes } from '@tiptap/core';

export interface SpoilerOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spoiler: {
      /**
       * Set a spoiler mark
       */
      setSpoiler: () => ReturnType;
      /**
       * Toggle a spoiler mark
       */
      toggleSpoiler: () => ReturnType;
      /**
       * Unset a spoiler mark
       */
      unsetSpoiler: () => ReturnType;
    };
  }
}

/**
 * Custom TipTap extension for Telegram spoiler text
 * Renders as <tg-spoiler> tag which Telegram recognizes as hidden/blurred text
 */
export const Spoiler = Mark.create<SpoilerOptions>({
  name: 'spoiler',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'tg-spoiler',
      },
      {
        tag: 'span',
        getAttrs: (node) => (node as HTMLElement).classList?.contains('tg-spoiler') && null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['tg-spoiler', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSpoiler:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleSpoiler:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetSpoiler:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => this.editor.commands.toggleSpoiler(),
    };
  },
});
