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
            scrollY: [".tab.details"]
        });
    }

    get type() {
        return 'person';
    }

    fieldlist() {
        return {
            'race': { name: "MonksEnhancedJournal.Race", value: true },
            'gender': { name: "MonksEnhancedJournal.Gender", value: false },
            'age': { name: "MonksEnhancedJournal.Age", value: true },
            'eyes': { name: "MonksEnhancedJournal.Eyes", value: true },
            'skin': { name: "MonksEnhancedJournal.Skin", value: false },
            'hair': { name: "MonksEnhancedJournal.Hair", value: true },
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

        $('.actor-img img', html).click(this.openActor.bind(this));
        html.on('dragstart', ".actor-img img", TextEditor._onDragEntityLink);

        //onkeyup="textAreaAdjust(this)" style="overflow:hidden"
        $('.entity-details textarea', html).keyup(this.textAreaAdjust.bind(this));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);
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

    async addActor(data) {
        let actor = await this.getEntity(data);

        if (actor.entity) {
            this.object.setFlag("monks-enhanced-journal", "actor", actor.data);
        }


        /*
        let actor;
        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            actor = id ? await pack.getDocument(id) : null;
        } else {
            actor = game.actors.get(data.id);
            if (actor.documentName === "Scene" && actor.journal) actor = actor.journal;
            if (!actor.testUserPermission(game.user, "LIMITED")) {
                return ui.notifications.warn(`You do not have permission to view this ${actor.entity} sheet.`);
            }
        }

        if (actor) {
            let actorLink = {
                id: actor.id,
                img: actor.img,
                name: actor.name
            };

            if (data.pack)
                actorLink.pack = data.pack;

            this.object.data.flags["monks-enhanced-journal"].actor = actorLink;
            MonksEnhancedJournal.journal.saveData();
            this.render();
        }*/
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
                        content: 'Are you sure you want to remove a link to this Actor?',
                        yes: this.removeActor.bind(this)
                    });
                }
            }
        ];
    }
}
