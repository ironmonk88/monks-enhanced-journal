import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';
import { MEJHelpers } from '../helpers.js';

export class AdjustPrice extends FormApplication {
    constructor(object, options = {}) {
        super(options);

        this.object = object;
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "adjust-price",
            classes: ["adjust-price", "monks-journal-sheet", "dialog"],
            title: i18n("MonksEnhancedJournal.AdjustPrices"),
            template: "modules/monks-enhanced-journal/templates/adjust-price.html",
            width: 400,
            height: 'auto',
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false
        });
    }

    getData(options) {
        const original = Object.keys(game.system?.documentTypes?.Item || {});
        let types = original.filter(x => MonksEnhancedJournal.includedTypes.includes(x));
        types = types.reduce((obj, t) => {
            const label = CONFIG.Item?.typeLabels?.[t] ?? t;
            obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
            return obj;
        }, {});
        let defaultAdjustment = setting("adjustment-defaults");
        let adjustment = foundry.utils.duplicate(defaultAdjustment);
        if (this.object)
            adjustment = this.object.getFlag('monks-enhanced-journal', 'adjustment') || {};
        else
            defaultAdjustment = {};
        let data = {
            adjustment,
            types,
            defaultAdjustment
        }
        data.showConvert = !!this.object;

        return foundry.utils.mergeObject(super.getData(options), data );
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.convert-button', html).on("click", this.convertItems.bind(this, html));
        $('.cancel', html).on("click", this.close.bind(this));
        $('.reset', html).on("click", this.resetValues.bind(this));

        $('.sell-field', html).on("blur", this.validateField.bind(this));
    }

    resetValues(event) {
        event.stopPropagation();
        event.preventDefault();

        $('.sell-field', this.element).val('');
        $('.buy-field', this.element).val('');
    }

    validateField(event) {
        let val = parseFloat($(event.currentTarget).val());
        if (!isNaN(val) && val < 0) {
            $(event.currentTarget).val('');
        }
    }

    async _updateObject(event, formData) {
        let data = foundry.utils.expandObject(formData);

        for (let [k,v] of Object.entries(data.adjustment)) {
            if (v.sell == undefined)
                delete data.adjustment[k].sell;
            if (v.buy == undefined)
                delete data.adjustment[k].buy;

            if (Object.keys(data.adjustment[k]).length == 0)
                delete data.adjustment[k];
        }

        if (this.object) {
            await this.object.unsetFlag('monks-enhanced-journal', 'adjustment');
            await this.object.setFlag('monks-enhanced-journal', 'adjustment', data.adjustment);
        } else
            await game.settings.set("monks-enhanced-journal", "adjustment-defaults", data.adjustment, { diff: false });
    }

    async convertItems(html, event) {
        event.stopPropagation();
        event.preventDefault();

        const fd = new FormDataExtended(html[0]);
        let data = foundry.utils.expandObject(fd.object);

        for (let [k, v] of Object.entries(data.adjustment)) {
            if (v.sell == undefined)
                delete data.adjustment[k].sell;
            if (v.buy == undefined)
                delete data.adjustment[k].buy;

            if (Object.keys(data.adjustment[k]).length == 0)
                delete data.adjustment[k];
        }

        let adjustment = Object.assign({}, setting("adjustment-defaults"), data.adjustment || {});

        let items = this.object.getFlag('monks-enhanced-journal', 'items') || [];

        for (let item of items) {
            let sell = adjustment[item.type]?.sell ?? adjustment.default.sell ?? 1;
            let price = MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
            let cost = Math.max(Math.ceil((price.value * sell), 1)) + " " + price.currency;
            foundry.utils.setProperty(item, "flags.monks-enhanced-journal.cost", cost);
        }

        await this.object.update({ "flags.monks-enhanced-journal.items": items }, { focus: false });
    }
}