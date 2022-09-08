import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class TrapConfig extends FormApplication {
    constructor(object, journalentry, options = {}) {
        super(object, options);
        this.journalentry = journalentry;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "trap-config",
            classes: ["form", "trap-sheet"],
            title: i18n("MonksEnhancedJournal.TrapConfiguration"),
            template: "modules/monks-enhanced-journal/templates/trap-config.html",
            width: 400
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {}, { recursive: false }
        );
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        log('updating trap', event, formData, this.object);

        mergeObject(this.object, formData);
        let traps = duplicate(this.journalentry.object.flags["monks-enhanced-journal"].traps || []);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            traps.push(this.object);
        }

        this.journalentry.object.setFlag('monks-enhanced-journal', 'traps', traps);
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}