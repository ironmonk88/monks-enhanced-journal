import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class CustomisePage extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "customise-page",
            classes: ["form"],
            title: "Customise Page",
            template: "modules/monks-enhanced-journal/templates/customise/customise-page.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "tabs" }],
            scrollY: [".item-list"],
            width: 600,
            height: 400,
        });
    }

    async _renderInner(...args) {
        delete Handlebars.partials[`modules/monks-enhanced-journal/templates/customise/${this.object.constructor.type}.html`];
        await loadTemplates({
            page: `modules/monks-enhanced-journal/templates/customise/${this.object.constructor.type}.html`,
        });
        const html = await super._renderInner(...args);
        return html;
    }

    getData(options) {
        let data = super.getData(options);
        data.generalEdit = false;
        let settings = this.object.sheetSettings();
        let sheetSettings = {};
        sheetSettings[this.object.constructor.type] = settings;

        sheetSettings[this.object.constructor.type] = MonksEnhancedJournal.convertObjectToArray(sheetSettings[this.object.constructor.type]);
        data.sheetSettings = sheetSettings;

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find("button.reset-all").click(this._onResetDefaults.bind(this));
        html.find("button.convert-button").click(this._onResetDefaults.bind(this));

        $('.sell-field', html).on("blur", this.validateField.bind(this));
    };

    validateField(event) {
        let val = parseFloat($(event.currentTarget).val());
        if (!isNaN(val) && val < 0) {
            $(event.currentTarget).val('');
        }
    }

    async _updateObject(event, formData) {
        let data = foundry.utils.expandObject(formData);

        let defaultSettings = this.object.constructor.sheetSettings() || {};
        let settings = data.sheetSettings[this.object.constructor.type] || {};

        // find all values in settings that are not the same as the default
        let changed = {};
        for (let [k, v] of Object.entries(settings)) {
            for (let [k2, v2] of Object.entries(v)) {
                for (let [k3, v3] of Object.entries(v2)) {
                    if (defaultSettings[k][k2][k3] != v3) {
                        changed[k] = changed[k] || {};
                        changed[k][k2] = v2;
                    }
                }
            }
        }

        await this.object.object.unsetFlag("monks-enhanced-journal", "sheet-settings");
        await this.object.object.setFlag("monks-enhanced-journal", "sheet-settings", changed, { diff: false });
        this.object.render(true);
    }

    async _onResetDefaults(event) {
        await this.object.object.unsetFlag("monks-enhanced-journal", "sheet-settings");
        this.object.render(true);
        this.render(true);
    }

    async convertItems(html, event) {
        event.stopPropagation();
        event.preventDefault();

        const fd = new FormDataExtended(html[0]);
        let data = foundry.utils.expandObject(fd.object);

        let dataAdjustment = data.sheetSettings.shop.adjustment;

        for (let [k, v] of Object.entries(dataAdjustment)) {
            if (v.sell == undefined)
                delete dataAdjustment[k].sell;
            if (v.buy == undefined)
                delete dataAdjustment[k].buy;

            if (Object.keys(dataAdjustment[k]).length == 0)
                delete dataAdjustment[k];
        }

        let defaultSettings = this.object.constructor.sheetSettings() || {};
        let adjustment = Object.assign({}, defaultSettings, { adjustment: dataAdjustment });

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