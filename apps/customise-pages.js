import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class CustomisePages extends FormApplication {

    constructor(object, options) {
        super(object, options);

        this.sheetSettings = {};
        let types = MonksEnhancedJournal.getDocumentTypes();
        for (let page of CustomisePages.typeList) {
            this.sheetSettings[page] = {};
            let cls = types[page];
            if (!cls) continue;
            if (cls.sheetSettings != undefined) {
                let settings = cls.sheetSettings();
                this.sheetSettings[page] = settings;
            }
        }
    }
    get activeCategory() {
        return this._tabs[0].active;
    }

    static get typeList() {
        return ["encounter", "event", "organization", "person", "picture", "place", "poi", "quest", "shop"];
    }
    static get defaultOptions() {
        let tabs = [{ navSelector: ".page-tabs", contentSelector: ".categories > div", initial: "encounter" }];
        for (let page of CustomisePages.typeList) {
            tabs.push({ navSelector: `.${page}-tabs`, contentSelector: `.${page}-body`, initial: "tabs" });
        }

        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "customise-pages",
            classes: ["form"],
            title: "Customise Pages",
            template: "modules/monks-enhanced-journal/templates/customise/customise-pages.html",
            tabs,
            width: 800,
            resizable: true,
            scrollY: [".sidebar .tabs", ".item-list"],
            dragDrop: [{ dragSelector: ".reorder-attribute", dropSelector: ".item-list" }]
        });
    }

    async _renderInner(...args) {
        let load_templates = {};
        for (let page of CustomisePages.typeList) {
            let template = `modules/monks-enhanced-journal/templates/customise/${page}.html`;
            load_templates[page] = template;
            delete Handlebars.partials[template];
        }
        await loadTemplates(load_templates);
        const html = await super._renderInner(...args);
        return html;
    }

    getData(options) {
        let data = super.getData(options);
        data.generalEdit = true;
        data.sheetSettings = foundry.utils.duplicate(this.sheetSettings);

        for (let page of CustomisePages.typeList) {
            data.sheetSettings[page] = MonksEnhancedJournal.convertObjectToArray(data.sheetSettings[page]);
        }

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find("button.reset-all").click(this._onResetDefaults.bind(this));

        $('input[name]', html).change(this.changeData.bind(this));

        $('.item-delete-attribute', html).click(this.removeAttribute.bind(this));
        $('.item-add-attribute', html).click(this.addAttribute.bind(this));
    };

    get currentType() {
        return this._tabs[0].active;
    }

    addAttribute(event) {
        let attribute = event.currentTarget.dataset.attribute;
        let attributes = foundry.utils.getProperty(this, attribute);

        if (!attributes) return;

        // find the maximum order
        let maxOrder = 0;
        for (let attr of Object.values(attributes)) {
            maxOrder = Math.max(maxOrder, attr.order);
        }

        attributes[foundry.utils.randomID()] = { id: foundry.utils.randomID(), name: "", shown: true, full: false, order: maxOrder + 1 };

        this.render(true);
    }

    changeData(event) {
        let prop = $(event.currentTarget).attr("name");
        if (foundry.utils.hasProperty(this, prop)) {
            let val = $(event.currentTarget).attr("type") == "checkbox" ? $(event.currentTarget).prop('checked') : $(event.currentTarget).val();
            foundry.utils.setProperty(this, prop, val);
        }
    }

    removeAttribute(event) {
        let key = event.currentTarget.closest('li.item').dataset.id;

        let target = this;
        let parts = key.split('.');
        for (let i = 0; i < parts.length; i++) {
            let p = parts[i];
            const t = getType(target);
            if (!((t === "Object") || (t === "Array"))) break;
            if (i === parts.length - 1) {
                delete target[p];
                break;
            }
            if (p in target) target = target[p];
            else {
                target = undefined;
                break;
            }
        }

        this.render(true);
    }

    _onDragStart(event) {
        let li = event.currentTarget.closest(".item");
        const dragData = { id: li.dataset.id };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    _canDragStart(selector) {
        return true;
    }

    _onDrop(event) {
        // Try to extract the data
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        // Identify the drop target
        const target = event.target.closest(".item") || null;

        // Call the drop handler
        if (target && target.dataset.id) {
            if (data.id === target.dataset.id) return; // Don't drop on yourself

            let property = event.target.dataset.attribute;
            let attributes = foundry.utils.getProperty(this, property);

            let from = (foundry.utils.getProperty(this, data.id) || {}).order ?? 0;
            let to = (foundry.utils.getProperty(this, target.dataset.id) || {}).order ?? 0;
            log('from', from, 'to', to);

            if (from < to) {
                for (let attr of Object.values(attributes)) {
                    if (attr.order > from && attr.order <= to) {
                        attr.order--;
                    }
                }
                $('.item-list .item[data-id="' + data.id + '"]', this.element).insertAfter(target);
            } else {
                for (let attr of Object.values(attributes)) {
                    if (attr.order < from && attr.order >= to) {
                        attr.order++;
                    }
                }
                $('.item-list .item[data-id="' + data.id + '"]', this.element).insertBefore(target);
            }
            (foundry.utils.getProperty(this, data.id) || {}).order = to;
        }
    }

    _updateObject(event, formData) {
        game.settings.set("monks-enhanced-journal", "sheet-settings", this.sheetSettings, { diff: false });
    }

    async _onResetDefaults(event) {
        let sheetSettings = game.settings.settings.get("monks-enhanced-journal.sheet-settings");
        await game.settings.set("monks-enhanced-journal", "sheet-settings", sheetSettings.default);
        this.sheetSettings = sheetSettings.default;

        this.render(true);
    }
}