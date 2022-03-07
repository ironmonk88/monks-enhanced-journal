import { DCConfig } from "../apps/dc-config.js";
import { TrapConfig } from "../apps/trap-config.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
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
                { dragSelector: ".document.actor", dropSelector: ".encounter-body" },
                { dragSelector: ".document.item", dropSelector: ".encounter-body" },
                { dragSelector: ".encounter-monsters .item-list .item .item-image", dropSelector: "null" },
                { dragSelector: ".encounter-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".create-encounter", dropSelector: "null" },
                { dragSelector: ".create-combat", dropSelector: "null" }
            ],
            scrollY: [".tab.description .tab-inner", ".encounter-content", ".encounter-items", ".encounter-dcs"]
        });
    }

    get type() {
        return 'encounter';
    }

    static get defaultObject() {
        return { items: [], actors: [], dcs: [], traps: [] };
    }

    async getData() {
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

        let config = MonksEnhancedJournal.config;

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

        data.groups = this.getItemGroups(data);

        let currency = this.object.data.flags["monks-enhanced-journal"].currency || {};
        data.currency = Object.keys(MonksEnhancedJournal.currencies).reduce((a, v) => ({ ...a, [v]: currency[v] || 0 }), {});

        data.valStr = (['pf2e'].includes(game.system.id) ? ".value" : "");

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

        /*
        new ResizeObserver(function (obs) {
                log('resize observer', obs);
                $(obs[0].target).toggleClass('condensed', obs[0].contentRect.width < 1100);
        }).observe($('.encounter-content', html).get(0));*/

        //monster
        $('.monster-icon', html).click(this.clickItem.bind(this));
        $('.monster-delete', html).on('click', $.proxy(this._deleteItem, this));
        html.on('dragstart', ".monster-icon", TextEditor._onDragContentLink);
        $('.select-encounter', html).click(this.constructor.selectEncounter.bind(this.object));

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.item-edit', html).on('click', this.editItem.bind(this));
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
        $('.roll-table', html).click(this.rollTable.bind(this, "actors", false));
        $('.item-name h4', html).click(this._onItemSummary.bind(this));
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        data.flags['monks-enhanced-journal'].items = duplicate(this.object.getFlag("monks-enhanced-journal", "items") || []);
        for (let item of data.flags['monks-enhanced-journal'].items) {
            let dataItem = data.items[item._id];
            if (dataItem)
                item = mergeObject(item, dataItem);
            if (!item.assigned && item.received)
                delete item.received;
        }
        delete data.items;

        data.flags['monks-enhanced-journal'].actors = duplicate(this.object.getFlag("monks-enhanced-journal", "actors") || []);
        for (let actor of data.flags['monks-enhanced-journal'].actors) {
            let dataActor = data.actors[actor.id];
            if (dataActor)
                actor = mergeObject(actor, dataActor);
        }
        delete data.actors;

        return flattenObject(data);
    }

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
            let item = this.object.data.flags["monks-enhanced-journal"].items.find(i => i._id == id);
            if (!game.user.isGM && (this.object.data.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }

            dragData.id = id;
            dragData.journalid = this.object.id;
            dragData.pack = li.dataset.pack;
            dragData.type = li.dataset.document;
            dragData.data = item;

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
        let actor = await this.getItemData(data);

        if (actor) {
            let actors = duplicate(this.object.getFlag("monks-enhanced-journal", "actors") || []);
            actors.push(actor);
            this.object.setFlag("monks-enhanced-journal", "actors", actors);
        }
    }

    async addItem(data) {
        let item = await this.getDocument(data);

        if (item) {
            if (this.getValue(item.data, quantityname()) || (item.data.type == "spell" && game.system.id == 'dnd5e')) {
                let items = duplicate(this.object.data.flags["monks-enhanced-journal"].items || []);

                let itemData = item.toObject();
                if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                    itemData = await EncounterSheet.createScrollFromSpell(itemData);
                }

                let update = { _id: makeid(), data: { remaining: 1 } };
                data[quantityname()] = item.data.data[quantityname()];
                this.setValue(update, quantityname(), 1);

                items.push(mergeObject(itemData, update));
                this.object.setFlag('monks-enhanced-journal', 'items', items);
            } else {
                ui.notifications.warn("Cannot add item of this type");
            }
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
            let actor = await EnhancedJournalSheet.getDocument(ea);//Actor.implementation.fromDropData(ea);
            if (actor) {
                if (!actor.isOwner) {
                    return ui.notifications.warn(`You do not have permission to create a new Token for the ${actor.name} Actor.`);
                }
                //if (actor.compendium) {
                //    const actorData = game.actors.fromCompendium(actor);
                //    actor = await Actor.implementation.create(actorData);
                //}

                // Prepare the Token data
                let quantity = (ea.quantity || "1");
                if (quantity.indexOf("d") != -1) {
                    let r = new Roll(quantity);
                    await r.evaluate({ async: true });
                    quantity = r.total;
                } else {
                    quantity = parseInt(quantity);
                    if (isNaN(quantity)) quantity = 1;
                }

                for (let i = 0; i < (quantity || 1); i++) {
                    let td = await actor.getTokenData({ x: x, y: y });
                    if (ea.hidden)
                        td.hidden = true;
                    let newSpot = MonksEnhancedJournal.findVacantSpot({ x: x, y: y }, { width: td.width, height: td.height });
                    td.update(newSpot);

                    let token = await cls.create(td, { parent: canvas.scene });
                    if (ea.hidden)
                        token.update({ hidden: true });

                    tokenids.push(token.id);
                }
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
        let items = duplicate(this.data.flags["monks-enhanced-journal"].items || []);
        let currency = this.data.flags["monks-enhanced-journal"].currency;
        items = await super.assignItems(items, currency);
        await this.setFlag('monks-enhanced-journal', 'items', items);

        for (let key of Object.keys(currency))
            currency[key] = 0;

        await this.setFlag('monks-enhanced-journal', 'currency', currency);
    }

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (item) {
            if (item.remaining < 1) {
                ui.notifications.warn("Cannot transfer this item, not enough of this item remains.");
                return false;
            }

            this.purchaseItem.call(this, entry, id, actor);
            return 1;
        }
        return false;
    }

    refillItems(event) {
        let items = duplicate(this.object.data.flags["monks-enhanced-journal"].items || []);

        let li = $(event.currentTarget).closest('li')[0];
        let item = items.find(i => i._id == li.dataset.id);
        if (item) {
            item.data.remaining = this.getValue(item, quantityname());
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        }
    }
}
