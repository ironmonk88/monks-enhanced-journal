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
        let fd = mergeObject({}, formData);
        for (let attr of Object.values(fd.attributes)) {
            attr.hidden = !attr.shown;
            delete attr.shown;
        }
        let attributes = mergeObject(this.object.flags['monks-enhanced-journal'].attributes, fd.attributes);
        this.object.setFlag('monks-enhanced-journal', 'attributes', attributes)
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