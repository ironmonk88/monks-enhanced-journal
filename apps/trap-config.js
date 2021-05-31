import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class TrapConfig extends FormApplication {
    constructor(object, options = {}) {
        super(object, options);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "trap-config",
            classes: ["form", "trap-sheet"],
            title: i18n("MonsEnhancedJournal.TrapConfiguration"),
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
        if (this.object.id == undefined) {
            this.object.id = makeid();
            MonksEnhancedJournal.journal.object.data.flags["monks-enhanced-journal"].traps.push(this.object);
        }

        MonksEnhancedJournal.journal.saveData().then(() => {
            MonksEnhancedJournal.journal.display(MonksEnhancedJournal.journal.object);
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}