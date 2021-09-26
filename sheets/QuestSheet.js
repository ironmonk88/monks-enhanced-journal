import { Objectives } from "../apps/objectives.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class QuestSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.quest"),
            template: "modules/monks-enhanced-journal/templates/quest.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".entity.actor", dropSelector: ".quest-container" },
                { dragSelector: ".entity.item", dropSelector: ".quest-container" },
                { dragSelector: ".reward-items .item-list .item", dropSelector: "null" },
                { dragSelector: ".objective-items .item-list .item", dropSelector: ".quest-container" }
            ],
            scrollY: [".objective-items", ".reward-items", ".description"]
        });
    }

    getData() {
        let data = super.getData();

        data.showtoplayers = this.object.data.permission["default"] >= CONST.ENTITY_PERMISSIONS.OBSERVER;

        data.currency = Object.entries(CONFIG[game.system.id.toUpperCase()]?.currencies).map(([k, v]) => {
            return { name: k, value: this.object.getFlag('monks-enhanced-journal', k) };
        });

        data.objectives = this.object.data.flags["monks-enhanced-journal"].objectives?.filter(o => {
            return this.object.isOwner || o.available;
        });

        data.useobjectives = setting('use-objectives');

        return data;
    }

    _onSubmit(ev) {
        //let type = this.entitytype;

        //if (type == 'encounter')
        //    $('.sheet-body', this.element).removeClass('editing');
        if ($(ev.currentTarget).hasClass('objective-status')) {
            let id = ev.currentTarget.closest('li').dataset.id;
            let objective = this.object.data.flags['monks-enhanced-journal'].objectives.find(o => o.id == id);
            if (objective) {
                objective.status = $(ev.currentTarget).is(':checked');
                return this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags['monks-enhanced-journal'] });
            }
        } else if ($(ev.currentTarget).hasClass('objective-available')) {
            let id = ev.currentTarget.closest('li').dataset.id;
            let objective = this.object.data.flags['monks-enhanced-journal'].objectives.find(o => o.id == id);
            if (objective) {
                objective.available = $(ev.currentTarget).is(':checked');
                return this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags['monks-enhanced-journal'] });
            }
        } else 
            return super._onSubmit(ev);
    }

    get defaultObject() {
        return { items: [], objectives: [], seen: false, completed: false };
    }

    get type() {
        return 'quest';
    }

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        $('.objective-create', html).on('click', $.proxy(this.createObjective, this));
        $('.objective-edit', html).on('click', $.proxy(this.editObjective, this));
        $('.objective-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.show-to-players', html).click(this.changePermissions.bind(this));

        let that = this;
        $('.item-assigned input', html).on('change', function (event) {
            let id = $(event.currentTarget).closest('li').attr('data-id');
            let items = that.object.data.flags['monks-enhanced-journal'].items;
            let item = items.find(i => i.id == id);
            if (item) {
                item.assigned = $(this).is(':checked');
                delete item.received;
                that.object.setFlag('monks-enhanced-journal', 'items', items);
                $(event.currentTarget).parent().siblings('.item-received').html('');
            }
        });

        $('.assign-xp', html).on('click', function (event) {
            if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
                game.MonksTokenBar.assignXP(null, { xp: that.object.getFlag('monks-enhanced-journal', 'xp') });
            }
        });

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    _onDragStart(event) {
        const li = event.currentTarget;
        let id = li.dataset.id;

        const dragData = { from: 'monks-enhanced-journal' };

        if (li.dataset.entity == 'Item') {
            let item = this.object.data.flags["monks-enhanced-journal"].items.find(i => i.id == id);
            if (!game.user.isGM && (this.object.data.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }

            dragData.id = id;
            dragData.pack = li.dataset.pack;
            dragData.type = "Item";
        } else if (li.dataset.entity == 'Objective') {
            dragData.id = id;
            dragData.type = "Objective";
        }

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        MonksEnhancedJournal._dragItem = id;
    }

    _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'Item') {
            if (data.from == 'monks-enhanced-journal')  //don't drop on yourself
                return;
            this.addItem(data);
        } else if (data.type == 'Actor') {
            this.addActor(data);
        } else if (data.type == 'Objective') {
            //re-order objectives
            let objectives = duplicate(this.object.data.flags['monks-enhanced-journal']?.objectives || []);

            let from = objectives.findIndex(a => a.id == data.id);
            let to = objectives.length - 1;
            if (!$(event.target).hasClass('objectives')) {
                const target = event.target.closest(".item") || null;
                if (data.id === target.dataset.id) return; // Don't drop on yourself
                to = objectives.findIndex(a => a.id == target.dataset.id);
            }
            if (from == to)
                return;

            objectives.splice(to, 0, objectives.splice(from, 1)[0]);

            this.object.data.flags['monks-enhanced-journal'].objectives = objectives;
            this.object.setFlag('monks-enhanced-journal', 'objectives', objectives);
        }

        log('drop data', event, data);
    }

    async addItem(data) {
        let item = await this.getEntity(data);

        if (item.entity) {
            let items = duplicate(this.object.data.flags["monks-enhanced-journal"].items || []);

            let olditem = items.find(i => i.id == item.data.id);
            if (olditem) {
                olditem.qty++;
            } else {
                items.push(mergeObject(item.data, { remaining: 1 }));
            }
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        }
    }

    changePermissions(event) {
        let show = $(event.currentTarget).prop('checked');
        let perms = this.object.data.permission;
        perms['default'] = (show ? CONST.ENTITY_PERMISSIONS.OBSERVER : CONST.ENTITY_PERMISSIONS.NONE);
        this.object.update({permission: perms});
    }

    clickItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        event.currentTarget = li;
        TextEditor._onClickEntityLink(event);
    }

    createObjective() {
        let objective = { status: false };
        if (this.object.data.flags["monks-enhanced-journal"].objectives == undefined)
            this.object.data.flags["monks-enhanced-journal"].objectives = [];
        new Objectives(objective, this).render(true);
    }

    editObjective(event) {
        let item = event.currentTarget.closest('.item');
        let objective = this.object.data.flags["monks-enhanced-journal"].objectives.find(obj => obj.id == item.dataset.id);
        if (objective != undefined)
            new Objectives(objective, this).render(true);
    }

    async addActor(data) {
        let actor = await this.getEntity(data);

        if (actor.entity) {
            this.object.update({ 'flags.monks-enhanced-journal.actor': actor.data, 'flags.monks-enhanced-journal.source' : actor.data.name});
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
