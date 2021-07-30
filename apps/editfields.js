import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class EditFields extends FormApplication {
    constructor(object, fields) {
        super(object);
        this.fields = fields;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "edit-fields",
            classes: ["form", "edit-fields"],
            title: i18n("MonksEnhancedJournal.EditFields"),
            template: "modules/monks-enhanced-journal/templates/editfields.html",
            width: 400,
            submitOnChange: true,
            closeOnSubmit: false
        });
    }

    async _updateObject(event, formData) {
        mergeObject(this.object, formData);
        MonksEnhancedJournal.journal.saveData();
        this.change = true;
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                fields: this.fields
            }
        );
    }

    async close(options) {
        if (this.change)
            MonksEnhancedJournal.journal.subsheet.refresh();
        return super.close(options);
    }
}