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
            dragDrop: [{ dragSelector: ".entity.actor", dropSelector: ".person-container" }],
            scrollY: [".tab.details", ".description"]
        });
    }

    get type() {
        return 'person';
    }

    static get defaultObject() {
        return { actors: [] };
    }

    async getData() {
        let data = super.getData();

        data.relationships = {};
        for (let item of (data.data.flags['monks-enhanced-journal']?.actors || [])) {
            if (!data.relationships[item.type])
                data.relationships[item.type] = { type: item.type, name: i18n(`MonksEnhancedJournal.${item.type.toLowerCase()}`), actors: [] };

            data.relationships[item.type].actors.push(item);
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

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            /*{ id: 'random', text: 'Generate Random Character', icon: 'fa-exchange-alt', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal._randomizePerson },*/
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        $('.journal-header .actor-img img', html).click(this.openActor.bind(this));
        html.on('dragstart', ".actor-img img", TextEditor._onDragEntityLink);

        //onkeyup="textAreaAdjust(this)" style="overflow:hidden"
        $('.entity-details textarea', html).keyup(this.textAreaAdjust.bind(this));

        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);

        let that = this;
        $('.item-relationship input', html).on('change', function (event) {
            let id = $(event.currentTarget).closest('li').attr('data-id');
            let items = that.object.data.flags['monks-enhanced-journal'].actors;
            let item = items.find(i => i.id == id);
            if (item) {
                item.relationship = $(this).val();
                that.object.setFlag('monks-enhanced-journal', 'actors', items);
            }
        });
        $('.items-list .actor-icon', html).click(this.openRelationship.bind(this));
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
        $('.entity-details textarea', html).each(function () {
            that.textAreaAdjust({ currentTarget: this });
        })

        return html;
    }

    textAreaAdjust(event) {
        let element = event.currentTarget;
        element.style.height = "1px";
        element.style.height = (25 + element.scrollHeight) + "px";
    }

    async addRelationship(data) {
        let relationship = await this.getEntity(data);

        if (relationship.entity) {
            let type = relationship.entity.data.flags['monks-enhanced-journal']?.type
            relationship.data.type = type;
            if (['organization','person','place'].includes(type)) {
                let actors = duplicate(this.object.data.flags["monks-enhanced-journal"].actors || []);

                //only add one item
                if (actors.find(t => t.id == relationship.data.id) != undefined)
                    return;

                actors.push(relationship.data);
                this.object.setFlag("monks-enhanced-journal", "actors", actors);
            }
        }
    }

    openRelationship(event) {
        let item = event.currentTarget.closest('.item');
        let relationship = game.journal.find(s => s.id == item.dataset.id);
        this.open(relationship);
    }

    async addActor(data) {
        let actor = await this.getEntity(data);

        if (actor.entity) {
            this.object.setFlag("monks-enhanced-journal", "actor", actor.data);
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
                    //const slide = this.object.data.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
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
