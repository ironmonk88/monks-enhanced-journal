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
        let fields = mergeObject({}, formData);
        //mergeObject(this.object.data.flags['monks-enhanced-journal'], fields);
        this.object.setFlag('monks-enhanced-journal', 'fields', fields)
        this.change = true;
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                fields: this.fields
            }
        );
    }
}