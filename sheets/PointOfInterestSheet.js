import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class PointOfInterestSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.PointOfInterest"),
            template: "modules/monks-enhanced-journal/templates/poi.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dropSelector: ".poi-container" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".tab.description .tab-inner"]
        });
    }

    async getData() {
        let data = await super.getData();

        data.relationships = {};
        for (let item of (data.data.flags['monks-enhanced-journal']?.relationships || [])) {
            let entity = await this.getDocument(item, "JournalEntry", false);
            if (!(entity instanceof JournalEntry || entity instanceof JournalEntryPage))
                continue;
            if (entity && entity.testUserPermission(game.user, "LIMITED") && (game.user.isGM || !item.hidden)) {
                let page = (entity instanceof JournalEntryPage ? entity : entity.pages.contents[0]);
                let type = getProperty(page, "flags.monks-enhanced-journal.type");
                if (!data.relationships[type])
                    data.relationships[type] = { type: type, name: i18n(`MonksEnhancedJournal.${type.toLowerCase()}`), documents: [] };

                item.name = page.name;
                item.img = page.src;
                item.type = type;

                data.relationships[type].documents.push(item);
            }
        }

        for (let [k, v] of Object.entries(data.relationships)) {
            v.documents = v.documents.sort((a, b) => a.name.localeCompare(b.name));
        }

        data.has = {
            relationships: Object.keys(data.relationships || {})?.length
        }

        return data;
    }

    get type() {
        return 'poi';
    }

    /*
    get allowedRelationships() {
        return ['person', 'place'];
    }*/

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);
        $('.item-hide', html).on('click', this.alterItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.relationships .items-list h4', html).click(this.openRelationship.bind(this));
        //$('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'sound', text: i18n("MonksEnhancedJournal.AddSound"), icon: 'fa-music', conditional: this.isEditable, callback: () => { this.onAddSound(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
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

        return flattenObject(data);
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'JournalEntry') {
            this.addRelationship(data);
        } else if (data.type == 'JournalEntryPage') {
            let doc = await fromUuid(data.uuid);
            data.id = doc?.parent.id;
            data.uuid = doc?.parent.uuid;
            data.type = "JournalEntry";
            this.addRelationship(data);
        }

        log('drop data', event, data);
    }
}
