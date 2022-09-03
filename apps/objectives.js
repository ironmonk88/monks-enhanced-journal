import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class Objectives extends FormApplication {
    constructor(object, journalentry, options = {}) {
        super(object, options);
        this.journalentry = journalentry;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "objectives",
            classes: ["form", "objective-sheet"],
            title: i18n("MonksEnhancedJournal.Objectives"),
            template: "modules/monks-enhanced-journal/templates/objectives.html",
            width: 500,
            resizable: true
        });
    }

    async getData() {
        let data = await super.getData();

        //this._convertFormats(data);
        data.enrichedText = await TextEditor.enrichHTML(data.object.content, {
            relativeTo: this.object,
            secrets: this.object.isOwner,
            async: true
        });

        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        log('updating objective', event, formData, this.object);
        mergeObject(this.object, formData);
        let objectives = duplicate(this.journalentry.object.flags["monks-enhanced-journal"].objectives || []);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            objectives.push(this.object);
        }

        this.journalentry.object.setFlag('monks-enhanced-journal', 'objectives', objectives);
    }
}