import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class Objectives extends FormApplication {
    constructor(object, options = {}) {
        super(object, options);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "objectives",
            classes: ["form", "objective-sheet"],
            title: "Objectives",
            template: "modules/monks-enhanced-journal/templates/objectives.html",
            width: 500
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                statusOptions : {
                    inactive: "MonksEnhancedJournal.inactive",
                    available: "MonksEnhancedJournal.available",
                    inprogress: "MonksEnhancedJournal.inprogress",
                    completed: "MonksEnhancedJournal.completed",
                    failed: "MonksEnhancedJournal.failed"
                }
            }
        );
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        log('updating objective', event, formData, this.object);
        mergeObject(this.object, formData);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            MonksEnhancedJournal.journal.object.data.flags["monks-enhanced-journal"].objectives.push(this.object);
        }
            
        MonksEnhancedJournal.journal.saveData().then(() => {
            MonksEnhancedJournal.journal.display(MonksEnhancedJournal.journal.object);
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}