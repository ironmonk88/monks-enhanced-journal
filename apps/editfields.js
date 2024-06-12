import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class EditFields extends FormApplication {
    constructor(object, fields) {
        super(object);
        this.fields = fields;
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
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
        let fd = foundry.utils.mergeObject({}, formData);
        for (let attr of Object.values(fd.attributes)) {
            attr.hidden = !attr.shown;
            delete attr.shown;
        }
        let attributes = foundry.utils.mergeObject(this.object.flags['monks-enhanced-journal'].attributes, fd.attributes);
        this.object.update({ "flags.monks-enhanced-journal.attributes": attributes }, { focus: false });
        this.change = true;
    }

    getData(options) {
        return foundry.utils.mergeObject(super.getData(options),
            {
                fields: this.fields
            }
        );
    }
}