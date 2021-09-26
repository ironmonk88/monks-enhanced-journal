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
                { dragSelector: ".encounter-items .item-list .item .item-icon", dropSelector: "null" },
                { dragSelector: ".create-encounter", dropSelector: "null" }
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

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

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

        
        $('.item-assigned input', html).change(this.changeAssigned.bind(this));
        $('.item-qty input', html).change(this.changeQuantity.bind(this));
    }

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
        } else {
            let li = $(event.currentTarget).closest('li')[0];
            let id = li.dataset.id;
            let item = this.object.data.flags["monks-enhanced-journal"].items.find(i => i.id == id);
            if (!game.user.isGM && (this.object.data.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }

            dragData.id = id;
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
}
