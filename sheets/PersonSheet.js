import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

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
                { dragSelector: ".actor-img img", dropSelector: "null" }
            ],
            scrollY: [".tab.details .tab-inner", ".tab.description .tab-inner", ".relationships .items-list"]
        });
    }

    get allowedRelationships() {
        return ['organization', 'person', 'place', 'shop', 'quest', 'poi'];
    }

    get type() {
        return 'person';
    }

    static get defaultObject() {
        return { relationships: [] };
    }

    async getData() {
        let data = super.getData();

        data.relationships = {};
        for (let item of (data.data.flags['monks-enhanced-journal']?.relationships || [])) {
            let entity = await this.getDocument(item, "JournalEntry", false);
            if (entity && entity.testUserPermission(game.user, "LIMITED") && (game.user.isGM || !item.hidden)) {
                if (!data.relationships[entity.type])
                    data.relationships[entity.type] = { type: entity.type, name: i18n(`MonksEnhancedJournal.${entity.type.toLowerCase()}`), documents: [] };

                item.name = entity.name;
                item.img = entity.data.img;

                data.relationships[entity.type].documents.push(item);
            }
        }

        for (let [k, v] of Object.entries(data.relationships)) {
            v.documents = v.documents.sort((a, b) => a.name.localeCompare(b.name));
        }

        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = game.actors.find(a => a.id == actorLink.id);

            if (actor) {
                data.actor = { id: actor.id, name: actor.name, img: actor.img };
            }
        }

        return data;
    }

    fieldlist() {
        return {
            'race': { name: "MonksEnhancedJournal.Race", value: true },
            'gender': { name: "MonksEnhancedJournal.Gender", value: false },
            'age': { name: "MonksEnhancedJournal.Age", value: true },
            'eyes': { name: "MonksEnhancedJournal.Eyes", value: true },
            'skin': { name: "MonksEnhancedJournal.Skin", value: false },
            'hair': { name: "MonksEnhancedJournal.Hair", value: true },
            'pronoun': { name: "MonksEnhancedJournal.Pronoun", value: false },
            'profession': { name: "MonksEnhancedJournal.Profession", value: false },
            'voice': { name: "MonksEnhancedJournal.Voice", value: true },
            'faction': { name: "MonksEnhancedJournal.Faction", value: false },
            'height': { name: "MonksEnhancedJournal.Height", value: false },
            'weight': { name: "MonksEnhancedJournal.Weight", value: false },
            'traits': { name: "MonksEnhancedJournal.Traits", value: true },
            'ideals': { name: "MonksEnhancedJournal.Ideals", value: true },
            'bonds': { name: "MonksEnhancedJournal.Bonds", value: true },
            'flaws': { name: "MonksEnhancedJournal.Flaws", value: true },
            'longterm': { name: "MonksEnhancedJournal.LongTermGoal", value: false },
            'shortterm': { name: "MonksEnhancedJournal.ShortTermGoal", value: false },
            'beliefs': { name: "MonksEnhancedJournal.Beliefs", value: false },
            'secret': { name: "MonksEnhancedJournal.Secret", value: false }
        };
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            /*{ id: 'random', text: 'Generate Random Character', icon: 'fa-exchange-alt', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal._randomizePerson },*/
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
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

        $('.items-list .actor-icon', html).click(this.openRelationship.bind(this));

        $('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        data.flags['monks-enhanced-journal'].relationships = duplicate(this.object.getFlag("monks-enhanced-journal", "relationships") || []);
        for (let relationship of data.flags['monks-enhanced-journal'].relationships) {
            let dataRel = data.relationships[relationship.id];
            if (dataRel)
                relationship = mergeObject(relationship, dataRel);
        }
        delete data.relationships;

        return flattenObject(data);
    }

    _onDragStart(event) {
        const target = event.currentTarget;

        if (target.dataset.document == "Actor") {
            const dragData = { id: target.dataset.id, type: target.dataset.document };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        }
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

        if (data.type == 'Actor') {
            this.addActor(data);
        } else if (data.type == 'JournalEntry') {
            this.addRelationship(data);
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
            }
        ];
    }
}
