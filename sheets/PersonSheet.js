import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { MakeOffering } from "../apps/make-offering.js";

export class PersonSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.person"),
            template: "modules/monks-enhanced-journal/templates/person.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".person-container" },
                { dragSelector: ".actor-img img", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".tab.entry-details .tab-inner", ".tab.description .tab-inner", ".relationships .items-list"]
        });
    }

    /*
    get allowedRelationships() {
        return ['organization', 'person', 'place', 'shop', 'quest', 'poi'];
    }*/

    get type() {
        return 'person';
    }

    static get defaultObject() {
        return { relationships: [], attributes: {} };
    }

    async getData() {
        let data = await super.getData();

        let needsAttributes = data?.data?.flags['monks-enhanced-journal']?.attributes == undefined;
        if (!needsAttributes) {
            for (let value of Object.values(data?.data?.flags['monks-enhanced-journal']?.attributes || {})) {
                if (typeof value != "object") {
                    needsAttributes = true;
                    break;
                }
            }
        }
        if (needsAttributes) {
            let fields = data?.data?.flags['monks-enhanced-journal']?.fields || {};
            let attributes = {};
            let flags = data?.data?.flags['monks-enhanced-journal'] || {};
            for (let attr of ['race','gender','age','eyes','skin','hair', 'life','profession','voice',  'faction','height','weight','traits','ideals','bonds', 'flaws','longterm','shortterm','beliefs','secret']) {
                attributes[attr] = { value: flags[attr] || ""};
                if (fields[attr] != undefined)
                    attributes[attr].hidden = !fields[attr]?.value;
                //delete data?.data?.flags['monks-enhanced-journal'][attr]
            }
            data.data.flags['monks-enhanced-journal'].attributes = attributes;
            this.object.flags['monks-enhanced-journal'].attributes = attributes;
            this.object.setFlag('monks-enhanced-journal', 'attributes', data.data.flags['monks-enhanced-journal'].attributes);
        }

        data.relationships = await this.getRelationships();

        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = actorLink.id ? game.actors.find(a => a.id == actorLink.id) : await fromUuid(actorLink);

            if (actor && actor.testUserPermission(game.user, "OBSERVER")) {
                data.actor = { uuid: actor.uuid, name: actor.name, img: actor.img };
            }
        }
        data.canViewActor = !!data.actor

        data.fields = this.fieldlist();

        let currency = (data.data.flags['monks-enhanced-journal'].currency || []);
        data.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: currency[c.id] ?? 0 };
        });

        data.offerings = this.getOfferings();

        data.has = {
            relationships: Object.keys(data.relationships || {})?.length,
            offerings: data.offerings?.length
        }

        return data;
    }

    fieldlist() {
        let fields = duplicate(setting("person-attributes"));
        let attributes = this.object.flags['monks-enhanced-journal'].attributes;
        for (let field of fields) {
            if (attributes[field.id]) {
                field = mergeObject(field, attributes[field.id]);
            }
        }
        return fields;
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            /*{ id: 'random', text: 'Generate Random Character', icon: 'fa-exchange-alt', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal._randomizePerson },*/
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'sound', text: i18n("MonksEnhancedJournal.AddSound"), icon: 'fa-music', conditional: this.isEditable, callback: () => { this.onAddSound(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //if (game.modules.get("VoiceActor")?.active) {

        //}
        return ctrls.concat(super._documentControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        $('.journal-header .actor-img img', html).click(this.openActor.bind(this));
        html.on('dragstart', ".actor-img img", TextEditor._onDragContentLink);

        //onkeyup="textAreaAdjust(this)" style="overflow:hidden"
        $('.document-details textarea', html).keyup(this.textAreaAdjust.bind(this));

        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.item-action', html).on('click', this.alterItem.bind(this));

        $('.item-hide', html).on('click', this.alterItem.bind(this));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);

        $('.relationships .items-list h4', html).click(this.openRelationship.bind(this));
        $('.offerings .items-list .actor-icon', html).click(this.openOfferingActor.bind(this));

        //$('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));

        $('.item-private', html).on('click', this.alterItem.bind(this));
        $('.make-offering', html).on('click', this.makeOffer.bind(this));
        $('.item-cancel', html).on('click', this.cancelOffer.bind(this));
        $('.item-accept', html).on('click', this.acceptOffer.bind(this));
        $('.item-reject', html).on('click', this.rejectOffer.bind(this));
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

        if (data.flags['monks-enhanced-journal']?.attributes) {
            data.flags['monks-enhanced-journal'].attributes = mergeObject((this.object?.flags['monks-enhanced-journal']?.attributes || {}), (data.flags['monks-enhanced-journal']?.attributes || {}));
        }

        return flattenObject(data);
    }

    _onDragStart(event) {
        if ($(event.currentTarget).hasClass("sheet-icon"))
            return super._onDragStart(event);

        const target = event.currentTarget;

        if (target.dataset.document == "Actor") {
            const dragData = {
                uuid: target.dataset.uuid,
                type: target.dataset.document
            };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        }
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

        if (data.type == 'Actor') {
            this.addActor(data);
        } else if (data.type == 'JournalEntry') {
            this.addRelationship(data);
        } else if (data.type == 'JournalEntryPage') {
            let doc = await fromUuid(data.uuid);
            data.id = doc?.parent.id;
            data.uuid = doc?.parent.uuid;
            data.type = "JournalEntry";
            this.addRelationship(data);
        } else if (data.type == 'Item') {
            let item = await fromUuid(data.uuid);
            new MakeOffering(this.object, this, {
                offering: {
                    actor: {
                        id: item.parent.id,
                        name: item.parent.name,
                        img: item.parent.img
                    },
                    items: [{
                        id: item.id,
                        itemName: item.name,
                        actorId: item.parent.id,
                        actorName: item.parent.name,
                        qty: 1
                    }]
                }
            }).render(true);
        }

        log('drop data', event, data);
    }

    async render(data) {
        let html = super.render(data);

        let that = this;
        $('.document-details textarea', html).each(function () {
            that.textAreaAdjust({ currentTarget: this });
        })

        return html;
    }

    textAreaAdjust(event) {
        let element = event.currentTarget;
        element.style.height = "1px";
        element.style.height = (25 + element.scrollHeight) + "px";
    }

    async addActor(data) {
        let actor = await this.getItemData(data);

        if (actor) {
            this.object.setFlag("monks-enhanced-journal", "actor", actor);
        }
    }

    openActor(event) {
        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        let actor = game.actors.find(a => a.id == actorLink.id);
        if (!actor)
            return;

        if (event.newtab == true || event.altKey)
            actor.sheet.render(true);
        else
            this.open(actor);
    }

    removeActor() {
        this.object.unsetFlag('monks-enhanced-journal', 'actor');
        $('.actor-img', this.element).remove();
    }

    _getPersonActorContextOptions() {
        return [
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.data("id");
                    Dialog.confirm({
                        title: `${game.i18n.localize("SIDEBAR.Delete")} Actor Link`,
                        content: i18n("MonksEnhancedJournal.ConfirmRemoveLink"),
                        yes: this.removeActor.bind(this)
                    });
                }
            },
            {
                name: i18n("MonksEnhancedJournal.OpenActorSheet"),
                icon: '<i class="fas fa-user fa-fw"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    this.openActor.call(this, { newtab: true });
                }
            }
        ];
    }
}
