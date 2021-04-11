import { EnhancedDirectory } from "./enhanced-directory.js"

export default function initJournalSheet() {
    return class EnhancedJournalSheet extends CONFIG.JournalEntry.sheetClass {
        tabs = [];
        bookmarks = [];

        constructor() {
            super({
                id: "MonksEnhancedJournal",
                template: "modules/monks-enhanced-journal/templates/main.html",
                title: "Monk's Enhanced Journal",
                classes: [`${game.system.id}`],
                popOut: true,
                resizable: true,
                width: 850,
                height: 600,
            });

            this.tabs = game.users.getFlag('monks-enhanced-journal', 'tabs');
            this.current
            this.bookmarks = game.users.getFlag('monks-enhanced-journal', 'bookmarks');


            this.directory = new EnhancedDirectory(this);
            this._collapsed = false;
        }

        get element() {
            return super.element;
        }

        get document() {
            return this.element.get(0).ownerDocument;
        }

        expandSidebar() {

        }

        collapseSidebar() {

        }

        activateListeners(html) {
            this.directory.render(true);

            $('#sidebar-toggle').on('click', function () { if (this._collapsed) this.expandSidebar(); else this.collapseSidebar(); });
        }
    }
}