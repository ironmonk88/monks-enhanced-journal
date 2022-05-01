import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class PlaceSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.place"),
            template: "modules/monks-enhanced-journal/templates/place.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".place-container" },
                { dragSelector: ".document.item", dropSelector: ".place-container" }],
            scrollY: [".tab.entry-details .tab-inner", ".tab.townsfolk .tab-inner", ".tab.shops .tab-inner", ".tab.description .tab-inner"]
        });
    }

    get type() {
        return 'place';
    }

    fieldlist() {
        let fields = duplicate(setting("place-attributes"));
        let attributes = this.object.data.flags['monks-enhanced-journal'].attributes;
        for (let field of fields) {
            if (attributes[field.id]) {
                field = mergeObject(field, attributes[field.id]);
            }
        }

        return fields;
    }

    static get defaultObject() {
        return { shops: [], townsfolk: [], attributes: {} };
    }

    get allowedRelationships() {
        return ['organization', 'person', 'shop', 'poi'];
    }

    async getData() {
        let data = super.getData();

        if (data?.data?.flags['monks-enhanced-journal']?.townsfolk) {
            data.data.flags['monks-enhanced-journal'].relationships = data?.data?.flags['monks-enhanced-journal']?.townsfolk;
            this.object.setFlag('monks-enhanced-journal', 'relationships', data.data.flags['monks-enhanced-journal'].relationships);
            this.object.unsetFlag('monks-enhanced-journal', 'townsfolk');
        }

        if (true || data?.data?.flags['monks-enhanced-journal']?.attributes == undefined) {
            let fields = data?.data?.flags['monks-enhanced-journal']?.fields || {};
            let attributes = {};
            for (let attr of ['age','size','government','alignment','faction','inhabitants','districts','agricultural','cultural','educational','indistrial','mercantile','military']) {
                attributes[attr] = { value: data?.data?.flags['monks-enhanced-journal'][attr] || "" };
                if (fields[attr] != undefined)
                    attributes[attr].hidden = !fields[attr]?.value;
                //delete data?.data?.flags['monks-enhanced-journal'][attr]
            }
            data.data.flags['monks-enhanced-journal'].attributes = attributes;
            this.object.data.flags['monks-enhanced-journal'].attributes = attributes;
            this.object.setFlag('monks-enhanced-journal', 'attributes', data.data.flags['monks-enhanced-journal'].attributes);
        }

        if (data?.data?.flags['monks-enhanced-journal']?.shops) {
            let relationships = data.data.flags['monks-enhanced-journal'].relationships || [];
            relationships = relationships.concat(data?.data?.flags['monks-enhanced-journal']?.shops);
            this.object.setFlag('monks-enhanced-journal', 'relationships', relationships);
            this.object.unsetFlag('monks-enhanced-journal', 'shops');
        }

        data.shops = [];
        data.organizations = [];
        data.townsfolk = [];
        for (let item of (data.data.flags['monks-enhanced-journal'].relationships || [])) {
            let entity = await this.getDocument(item, "JournalEntry", false);
            if (entity && entity.testUserPermission(game.user, "LIMITED") && (game.user.isGM || !item.hidden)) {
                item.name = entity.name;
                item.img = entity.data.img;

                if (entity.getFlag('monks-enhanced-journal', 'type') == "shop" || entity.getFlag('monks-enhanced-journal', 'type') == "poi") {
                    item.shoptype = entity.getFlag("monks-enhanced-journal", "shoptype");
                    data.shops.push(item);
                } else if (entity.getFlag('monks-enhanced-journal', 'type') == "organization") {
                    data.organizations.push(item);
                } else {
                    item.role = entity.getFlag("monks-enhanced-journal", "role");
                    data.townsfolk.push(item);
                }
            }
        }

        data.shops = data.shops.sort((a, b) => a.name.localeCompare(b.name));
        data.organizations = data.organizations.sort((a, b) => a.name.localeCompare(b.name));
        data.townsfolk = data.townsfolk.sort((a, b) => a.name.localeCompare(b.name));

        data.fields = this.fieldlist();

        return data;
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        $('.townsfolk .actor-icon', html).click(this.openRelationship.bind(this));
        $('.shop-icon', html).click(this.openRelationship.bind(this));
        $('.organization-icon', html).click(this.openRelationship.bind(this));

        $('.item-action', html).on('click', this.alterItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.item-hide', html).on('click', this.alterItem.bind(this));

        $('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        if (data.relationships) {
            data.flags['monks-enhanced-journal'].relationships = duplicate(this.object.getFlag("monks-enhanced-journal", "relationships") || []);
            for (let relationship of data.flags['monks-enhanced-journal'].relationships) {
                let dataRel = data.relationships[relationship.id];
                if (dataRel)
                    relationship = mergeObject(relationship, dataRel);
            }
            delete data.relationships;
        }

        if (data.attributes) {
            data.attributes = mergeObject((this.object.data?.flags['monks-enhanced-journal']?.attributes || {}), data.attributes);
        }

        return flattenObject(data);
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'JournalEntry') {
            this.addRelationship(data);
        }

        log('drop data', event, data);
    }
}
