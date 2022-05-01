import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class EditAttributes extends FormApplication {
    constructor(object) {
        super(object);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "edit-attributes",
            classes: ["form", "edit-attributes"],
            title: i18n("MonksEnhancedJournal.EditAttributes"),
            template: "modules/monks-enhanced-journal/templates/editattributes.html",
            width: 600,
            submitOnChange: false,
            closeOnSubmit: true,
            scrollY: [".item-list"]
        });
    }

    addAttribute(event) {
        this.attributes.push({ id: "", name: "", hidden: false, full: false });
        this.refresh();
    }

    changeData(event) {
        let attrid = event.currentTarget.closest('li.item').dataset.id;
        let prop = $(event.currentTarget).attr("name");

        let attr = this.attributes.find(c => c.id == attrid);
        if (attr) {
            let val = $(event.currentTarget).val();
            if (prop == "hidden" || prop == "full") {
                val = $(event.currentTarget).prop('checked');
            }
            else if (prop == "id") {
                val = val.replace(/[^a-z]/gi, '');
                $(event.currentTarget).val(val);
                if (!!this.attributes.find(c => c.id == val)) {
                    $(event.currentTarget).val(attrid)
                    return;
                }
                $(event.currentTarget.closest('li.item')).attr("data-id", val);
            }

            attr[prop] = val;
        }
    }

    removeAttribute() {
        let attrid = event.currentTarget.closest('li.item').dataset.id;
        this.attributes.findSplice(s => s.id === attrid);
        this.refresh();
    }

    refresh() {
        this.render(true);
        let that = this;
        window.setTimeout(function () { that.setPosition(); }, 500);
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('button[name="submit"]', html).click(this._onSubmit.bind(this));
        $('button[name="reset"]', html).click(this.resetAttributes.bind(this));

        $('input[name]', html).change(this.changeData.bind(this));

        $('.item-delete', html).click(this.removeAttribute.bind(this));
        $('.item-add', html).click(this.addAttribute.bind(this));
    };
}

export class EditPersonAttributes extends EditAttributes {
    constructor(object) {
        super(object);
    }

    getData(options) {
        this.attributes = this.attributes || setting("person-attributes");
        return mergeObject(super.getData(options),
            {
                fields: this.attributes
            }
        );
    }

    _updateObject() {
        let data = this.attributes.filter(c => !!c.id && !!c.name);
        game.settings.set('monks-enhanced-journal', 'person-attributes', data);
        this.submitting = true;
    }

    resetAttributes() {
        this.attributes = game.settings.settings.get('monks-enhanced-journal.person-attributes').default;
        this.refresh();
    }
}

export class EditPlaceAttributes extends EditAttributes {
    constructor(object) {
        super(object);
    }

    getData(options) {
        this.attributes = this.attributes || setting("place-attributes");
        return mergeObject(super.getData(options),
            {
                fields: this.attributes
            }
        );
    }

    _updateObject() {
        let data = this.attributes.filter(c => !!c.id && !!c.name);
        game.settings.set('monks-enhanced-journal', 'place-attributes', data);
        this.submitting = true;
    }

    resetAttributes() {
        this.attributes = game.settings.settings.get('monks-enhanced-journal.place-attributes').default;
        this.refresh();
    }
}