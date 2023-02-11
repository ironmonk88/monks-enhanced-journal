import { setting, i18n, log, makeid, MonksEnhancedJournal, quantityname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { MakeOffering } from "../apps/make-offering.js";

export class OrganizationSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.organization"),
            template: "modules/monks-enhanced-journal/templates/organization.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dropSelector: ".organization-container" },
                { dragSelector: ".actor-img img", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".tab.description .tab-inner"]
        });
    }

    async getData() {
        let data = await super.getData();

        data.relationships = await this.getRelationships();

        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = actorLink.id ? game.actors.find(a => a.id == actorLink.id) : await fromUuid(actorLink);

            if (actor && actor.testUserPermission(game.user, "OBSERVER")) {
                data.actor = { uuid: actor.uuid, name: actor.name, img: actor.img };
            }
        }
        data.canViewActor = !!data.actor;

        data.offerings = this.getOfferings();

        data.has = {
            relationships: Object.keys(data.relationships || {})?.length,
            offerings: data.offerings?.length
        }

        return data;
    }

    get type() {
        return 'organization';
    }

    /*
    get allowedRelationships() {
        return ['person', 'place', 'organization'];
    }*/

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);
        
        $('.item-hide', html).on('click', this.alterItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.relationships .items-list h4', html).click(this.openRelationship.bind(this));
        $('.offerings .items-list .actor-icon', html).click(this.openOfferingActor.bind(this));
        //$('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);

        $('.item-private', html).on('click', this.alterItem.bind(this));
        $('.make-offering', html).on('click', this.makeOffer.bind(this));
        $('.item-cancel', html).on('click', this.cancelOffer.bind(this));
        $('.item-accept', html).on('click', this.acceptOffer.bind(this));
        $('.item-reject', html).on('click', this.rejectOffer.bind(this));
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
            if (!(item?.parent instanceof Actor)) {
                ui.notifications.warn("Offerings must come from an Actor");
                return;
            }

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
