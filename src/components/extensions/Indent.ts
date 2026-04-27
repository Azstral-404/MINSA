import { Extension } from '@tiptap/core';

export interface IndentOptions {
  types: string[];
  minLevel: number;
  maxLevel: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      /**
       * Increase indentation
       */
      indent: () => ReturnType;
      /**
       * Decrease indentation
       */
      outdent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem', 'bulletList', 'orderedList'],
      minLevel: 0,
      maxLevel: 8,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const indent = parseInt(element.getAttribute('data-indent') || '0', 10);
              return indent;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent <= 0) {
                return {};
              }
              return {
                'data-indent': String(attributes.indent),
                style: `margin-left: ${attributes.indent * 40}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const { $from, $to } = selection;
          const tr = state.tr;
          let updated = false;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent < this.options.maxLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent + 1,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) {
            dispatch(tr);
            return true;
          }
          return false;
        },
      outdent:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const { $from, $to } = selection;
          const tr = state.tr;
          let updated = false;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent > this.options.minLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent - 1,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) {
            dispatch(tr);
            return true;
          }
          return false;
        },
    };
  },
});

export default Indent;
