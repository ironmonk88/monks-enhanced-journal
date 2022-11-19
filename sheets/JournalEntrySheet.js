import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";

export class JournalEntrySheet extends DocumentSheet {
    constructor(data, options) {
        super(data, options);

        this.enhancedjournal = options.enhancedjournal;
        this.editing = false;
    }

    static get defaultOptions() {
        let defOptions = super.defaultOptions;
        let classes = defOptions.classes.concat(['monks-journal-sheet', 'monks-enhanced-journal', `${game.system.id}`]);
        return mergeObject(defOptions, {
            title: i18n("MonksEnhancedJournal.journalentry"),
            template: "modules/monks-enhanced-journal/templates/journalentry.html",
            classes: classes,
            scrollY: [".journal-pages"]
        });
    }

    async getData() {
        let data = await super.getData();

        return data;
    }

    get isEditable() {
        let editable = this.object._editing && this.document.isOwner;
        return editable;
    }

    async close(options) {
        this.object._editing = false;
        return super.close(options);
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html);
    }

}
