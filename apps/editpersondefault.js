import { MonksEnhancedJournal, i18n } from "../monks-enhanced-journal.js";

export class EditPersonDefault extends FormApplication {
    constructor(object, options) {
        super(object, options);

        this.fields = game.settings.get('monks-enhanced-journal', 'person-default-fields');
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "journal-editcurrency",
            title: 'Edit Person Default Fields',
            classes: ["edit-person-default-fields"],
            template: "./modules/monks-enhanced-journal/templates/editdefaultfields.html",
            width: 400,
            height: "auto",
            closeOnSubmit: true,
            popOut: true,
        });
    }

    getData(options) {
        return {
            fields: this.fields
        };
    }

    _updateObject(event, formData) {
        let fields = mergeObject(this.fields, formData);
        game.settings.set('monks-enhanced-journal', 'person-default-fields', fields);
        this.submitting = true;
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('button[name="submit"]', html).click(this._onSubmit.bind(this));
    };
}