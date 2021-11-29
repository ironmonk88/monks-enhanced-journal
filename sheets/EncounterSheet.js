import { DCConfig } from "../apps/dc-config.js";
import { TrapConfig } from "../apps/trap-config.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class EncounterSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.encounter"),
            template: "modules/monks-enhanced-journal/templates/encounter.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".entity.actor", dropSelector: ".encounter-body" },
                { dragSelector: ".entity.item", dropSelector: ".encounter-body" },
                { dragSelector: ".encounter-monsters .item-list .item .item-image", dropSelector: "null" },
                { dragSelector: ".encounter-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".create-encounter", dropSelector: "null" },
                { dragSelector: ".create-combat", dropSelector: "null" }
            ],
            scrollY: [".encounter-content", ".description"]
        });
    }

    get type() {
        return 'encounter';
    }

    static get defaultObject() {
        return { items: [], actors: [], dcs: [], traps: [] };
    }

    getData() {
        let data = super.getData();

        if (data.data.flags["monks-enhanced-journal"].monsters) {
            data.data.flags["monks-enhanced-journal"].actors = data.data.flags["monks-enhanced-journal"].monsters;
            this.object.setFlag("monks-enhanced-journal", "actors", data.data.flags["monks-enhanced-journal"].actors);
            this.object.unsetFlag("monks-enhanced-journal", "monsters");
        }

        let safeGet = function (container, value) {
            if (config == undefined) return;
            if (config[container] == undefined) return;
            return config[container][value];
        }

        let config = (game.system.id == "tormenta20" ? CONFIG.T20 : CONFIG[game.system.id.toUpperCase()]);

        if (data.data.flags && data.data.flags["monks-enhanced-journal"].dcs) {
            data.dcs = data.data.flags["monks-enhanced-journal"].dcs.map(dc => {
                let data = duplicate(dc);
                if (data.attribute == undefined || data.attribute.indexOf(':') < 0)
                    data.label = 'Invalid';
                else {
                    let [type, value] = dc.attribute.split(':');
                    data.label = safeGet('abilities', value) || safeGet('skills', value) || safeGet('scores', value) || safeGet('atributos', value) || safeGet('pericias', value) || value;
                    data.label = i18n(data.label);
                }
                data.img = (data.img == '' ? false : data.img);
                return data;
            });
        }

        return data;
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

        /*
        new ResizeObserver(function (obs) {
                log('resize observer', obs);
                $(obs[0].target).toggleClass('condensed', obs[0].contentRect.width < 1100);
        }).observe($('.encounter-content', html).get(0));*/

        //monster
        $('.monster-icon', html).click(this.clickItem.bind(this));
        $('.monster-delete', html).on('click', $.proxy(this._deleteItem, this));
        html.on('dragstart', ".monster-icon", TextEditor._onDragEntityLink);
        $('.select-encounter', html).click(this.constructor.selectEncounter.bind(this.object));

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.assign-items', html).click(this.constructor.assignItems.bind(this.object));

        //DCs
        $('.dc-create', html).on('click', $.proxy(this.createDC, this));
        $('.dc-edit', html).on('click', $.proxy(this.editDC, this));
        $('.dc-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.encounter-dcs .item-name', html).on('click', $.proxy(this.rollDC, this));

        //Traps
        $('.trap-create', html).on('click', $.proxy(this.createTrap, this));
        $('.trap-edit', html).on('click', $.proxy(this.editTrap, this));
        $('.trap-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.encounter-traps .item-name', html).on('click', $.proxy(this.rollTrap, this));

        $('.item-refill', html).click(this.refillItems.bind(this));
    }

    _getSubmitData() {
        let data = expandObject(super._getSubmitData());

        let items = null;
        if (data.items) {
            for (let [k, v] of Object.entries(data.items)) {
                let values = (v instanceof Array ? v : [v]);
                if (items == undefined) {
                    items = values.map(item => { let obj = {}; obj[k] = (k == 'qty' || k == 'remaining' ? parseInt(item) : item); return obj; });
                } else {
                    for (let i = 0; i < values.length; i++) {
                        items[i][k] = (k == 'qty' || k == 'remaining' ? parseInt(values[i]) : values[i]);
                    }
                }
            }
            delete data.items;
        }

        //save the reward data
        let olditems = duplicate(this.object.getFlag("monks-enhanced-journal", "items"));
        if (items) {
            for (let item of items) {
                let olditem = olditems.find(i => i.id == item.id);
                if (olditem) {
                    olditem = Object.assign(olditem, item);
                    if (!olditem.assigned && olditem.received)
                        delete olditem.received;
                }
                else
                    olditems.push(item);
            }
        }

        data['flags.monks-enhanced-journal.items'] = olditems;
        delete data.items;

        return flattenObject(data);
    }

    /*
    changeAssigned(event) {
        let id = $(event.currentTarget).closest('li').attr('data-id');
        let items = this.object.data.flags['monks-enhanced-journal'].items;
        let item = items.find(i => i.id == id);
        if (item) {
            item.assigned = $(event.currentTarget).is(':checked');
            delete item.received;
            this.object.setFlag('monks-enhanced-journal', 'items', items);
            //$(event.currentTarget).parent().siblings('.item-received').html('');
        }
    }

    changeQuantity(event) {
        let li = $(event.currentTarget).closest('li');
        let id = li.attr('data-id');
        let container = li.attr('data-container');

        let entities = this.object.data.flags['monks-enhanced-journal'][container];
        let entity = entities.find(i => i.id == id);
        if (entity) {
            entity.qty = parseInt($(event.currentTarget).val());
            this.object.setFlag('monks-enhanced-journal', container, entities);
        }
    }*/

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    _onDragStart(event) {
        const target = event.currentTarget;

        const dragData = { from: 'monks-enhanced-journal' };

        if ($(target).hasClass('create-encounter')) {
            dragData.type = "CreateEncounter";
            dragData.id = this.object.id;
        } else if ($(target).hasClass('create-combat')) {
            dragData.type = "CreateCombat";
            dragData.id = this.object.id;
        } else {
            let li = $(event.currentTarget).closest('li')[0];
            let id = li.dataset.id;
            let uuid = li.dataset.uuid;
            let item = this.object.data.flags["monks-enhanced-journal"].items.find(i => i.uuid == uuid || i.id == id);
            if (!game.user.isGM && (this.object.data.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }

            dragData.id = id;
            dragData.uuid = this.object.uuid;
            dragData.pack = li.dataset.pack;
            dragData.type = li.dataset.entity;

            log('Drag Start', dragData);
            MonksEnhancedJournal._dragItem = id;
        }

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
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
            //let scrollTop = $('.encounter-content', this.element).scrollTop();
            this.addActor(data);
        } else if (data.type == 'Item') {
            if (data.from == 'monks-enhanced-journal')  //don't drop on yourself
                return;
            this.addItem(data);
        }

        log('drop data', event, data);
    }

    async addActor(data) {
        let actor = await this.getEntity(data);

        if (actor.entity) {
            let actors = duplicate(this.object.getFlag("monks-enhanced-journal", "actors") || []);
            actors.push(actor.data);

            this.object.setFlag("monks-enhanced-journal", "actors", actors);
        }
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

    clickItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        event.currentTarget = li;
        TextEditor._onClickContentLink(event);
    }

    createDC() {
        let dc = { dc: 10 };
        new DCConfig(dc, this).render(true);
    }

    editDC(event) {
        let item = event.currentTarget.closest('.item');
        let dc = this.object.data.flags["monks-enhanced-journal"].dcs.find(dc => dc.id == item.dataset.id);
        if (dc != undefined)
            new DCConfig(dc, this).render(true);
    }

    rollDC(event) {
        let item = event.currentTarget.closest('.item');
        let dc = this.object.data.flags["monks-enhanced-journal"].dcs.find(dc => dc.id == item.dataset.id);

        /*
        let config = (game.system.id == "tormenta20" ? CONFIG.T20 : CONFIG[game.system.id.toUpperCase()]);
        let dctype = 'ability';
        //if (config?.skills[dc.attribute] || config?.pericias[dc.attribute] != undefined)
        //    dctype = 'skill';
        */

        if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
            game.MonksTokenBar.requestRoll(canvas.tokens.controlled, { request: `${dc.attribute}`, dc: dc.dc });
        }
    }

    createTrap() {
        let trap = {};
        new TrapConfig(trap, this).render(true);
    }

    editTrap(event) {
        let item = event.currentTarget.closest('.item');
        let trap = this.object.data.flags["monks-enhanced-journal"].traps.find(dc => dc.id == item.dataset.id);
        if (trap != undefined)
            new TrapConfig(trap, this).render(true);
    }

    rollTrap(event) {

    }

    static selectEncounter() {
        let tokens = (this.data.flags['monks-enhanced-journal']?.tokens || []);

        canvas.tokens.activate();
        canvas.hud.note.clear();
        canvas.tokens.releaseAll();
        for (let tokenid of tokens) {
            let token = canvas.tokens.get(tokenid);
            if (token)
                token.control({ releaseOthers: false });
        }
    }

    static async createEncounter(x, y, combat) {
        canvas.tokens.releaseAll();

        const cls = getDocumentClass("Token");
        let tokenids = (this.data.flags['monks-enhanced-journal']?.tokens || []);
        for (let ea of (this.data.flags['monks-enhanced-journal']?.actors || [])) {
            let actor = await Actor.implementation.fromDropData(ea);
            if (!actor.isOwner) {
                return ui.notifications.warn(`You do not have permission to create a new Token for the ${actor.name} Actor.`);
            }
            if (actor.compendium) {
                const actorData = game.actors.fromCompendium(actor);
                actor = await Actor.implementation.create(actorData);
            }

            // Prepare the Token data
            for (let i = 0; i < (ea.qty || 1); i++) {
                let td = await actor.getTokenData({ x: x, y: y });
                let newSpot = MonksEnhancedJournal.findVacantSpot({ x: x, y: y }, { width: td.width, height: td.height });
                td.update(newSpot);

                let token = await cls.create(td, { parent: canvas.scene });
                tokenids.push(token.id);
            }
        }

        this.setFlag('monks-enhanced-journal', 'tokens', tokenids);

        let that = this;
        window.setTimeout(function () {
            EncounterSheet.selectEncounter.call(that);
            if (combat) {
                canvas.tokens.toggleCombat();
                ui.sidebar.activateTab("combat");
            }
        }, 200);
    }

    static async assignItems() {
        let actor = game.actors.get(setting("assign-actor"));

        if (!actor) {
            ui.notifications.warn(`No Actor selected to assign items to, please Right Click and Actor to set it as the actor to assign items to`);
            return;
        }

        if (actor) {
            let items = duplicate(this.data.flags["monks-enhanced-journal"].items || []);

            let itemData = [];
            let names = [];
            for (let item of items) {
                //add item to actor, including quantity
                if (item.remaining > 0) {
                    let entity;
                    if (item.pack) {
                        const pack = game.packs.get(item.pack);
                        if (pack) {
                            entity = await pack.getDocument(item.id);
                        }
                    } else {
                        entity = game.items.get(item.id);
                    }

                    if (!entity)
                        continue;

                    let data = entity.toObject();
                    data.data.quantity = item.remaining;
                    itemData.push(data);

                    //update the encounter
                    //item.qty = 0;
                    item.remaining = 0;
                    item.received = actor.name;
                    item.assigned = true;
                    names.push(item.name);
                }
            }

            if (itemData.length > 0) {
                actor.createEmbeddedDocuments("Item", itemData);
                this.setFlag('monks-enhanced-journal', 'items', items);
                ui.notifications.info(`Items [${names.join(', ')}] added to ${actor.name}`);
            } else
                ui.notifications.info(`No items added, either there were no items attached to this encounter or none of them had any quantity.`);
        }
    }

    static itemDropped(id, actor) {
        let items = duplicate(this.getFlag('monks-enhanced-journal', 'items'));
        if (items) {
            let item = items.find(i => i.id == id);
            if (item) {
                item.received = actor.name;
                item.assigned = true;
                item.remaining = Math.max(item.remaining - 1, 0);
                this.setFlag('monks-enhanced-journal', 'items', items);
            }
        }
    }

    refillItems(event) {
        let items = duplicate(this.object.data.flags["monks-enhanced-journal"].items || []);

        let li = $(event.currentTarget).closest('li')[0];
        let item = items.find(i => i.id == li.dataset.id);
        if (item) {
            item.remaining = item.qty;
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        }
    }
}
