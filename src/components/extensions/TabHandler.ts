import { Extension } from '@tiptap/core';

export const TabHandler = Extension.create({
  name: 'tabHandler',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { from } = this.editor.state.selection;
        const pos = this.editor.state.doc.resolve(from);
        const paragraphStart = pos.before(pos.depth);
        
        this.editor.chain()
          .setTextSelection(paragraphStart + 1)
          .insertContent('\t')
          .setTextSelection(from + 1)
          .run();
        
        return true;
      },
      'Shift-Tab': () => {
        const { from } = this.editor.state.selection;
        const pos = this.editor.state.doc.resolve(from);
        const paragraphStart = pos.before(pos.depth);
        const paragraph = pos.node(pos.depth);
        
        if (paragraph && paragraph.textContent.startsWith('\t')) {
          const tabPos = paragraphStart + 1;
          const newFrom = from <= tabPos ? from : from - 1;
          this.editor.chain()
            .deleteRange({ from: tabPos, to: tabPos + 1 })
            .setTextSelection(newFrom)
            .run();
          return true;
        }
        
        if (this.editor.can().liftListItem('listItem')) {
          this.editor.chain().liftListItem('listItem').run();
          return true;
        }
        
        this.editor.chain().outdent().run();
        return true;
      },
    };
  },
});

export default TabHandler;
