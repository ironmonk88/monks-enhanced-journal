import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class LootSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.loot"),
            template: "modules/monks-enhanced-journal/templates/loot.html",
            dragDrop: [
                { dragSelector: ".document.item", dropSelector: ".loot-container" },
                { dragSelector: ".loot-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".loot-items .item-list .item .item-name", dropSelector: ".loot-character" },
                { dragSelector: ".loot-character", dropSelector: "null" }
            ],
            scrollY: [".loot-items"]
        });
    }

    get type() {
        return 'loot';
    }

    async getData() {
        if (this.object.getFlag('monks-enhanced-journal', 'actors') == undefined) {
            let actors = [];
            for (let user of game.users) {
                if (this.object.testUserPermission(user, "OBSERVER") && user.character) {
                    actors.push(user.character.id); //, name: user.character.name, img: user.character.img });
                }
            }
            if (actors.length == 0) {
                for (let user of game.users) {
                    if (user.character) {
                        actors.push(user.character.id); //, name: user.character.name, img: user.character.img });
                    }
                }
            }
            await this.object.setFlag('monks-enhanced-journal', 'actors', actors);
        }

        let data = super.getData();
        data.purchaseOptions = {
            locked: "MonksEnhancedJournal.purchasing.locked",
            free: "MonksEnhancedJournal.purchasing.free",
            confirm: "MonksEnhancedJournal.purchasing.confirm"
        };

        let currency = (data.data.flags['monks-enhanced-journal'].currency || []);
        data.currency = Object.keys(MonksEnhancedJournal.currencies).reduce((a, v) => ({ ...a, [v]: currency[v] || 0 }), {});

        data.groups = this.getItemGroups(data);

        data.canGrant = ((data.data.flags['monks-enhanced-journal'].items || []).find(i => (Object.values(i.requests || {}).find(r => r) != undefined)) != undefined);

        data.characters = (data.data.flags['monks-enhanced-journal'].actors || []).map(a => {
            let actor = game.actors.get(a);
            if (actor) {
                let user = game.users.find(u => u.character?.id == actor.id);
                return { id: actor.id, name: actor.name, img: actor.img, color: user?.data.color, letter: user?.name[0], username: user?.name };
            }
        }).filter(a => !!a);

        data.purchasing = data.data.flags['monks-enhanced-journal'].purchasing || 'locked';
        data.showrequest = !game.user.isGM;

        data.valStr = (['pf2e'].includes(game.system.id) ? ".value" : "");

        data.canSplit = !['pf2e'].includes(game.system.id);

        return data;
    }

    static get defaultObject() {
        return { purchasing: 'confirm', items: [] };
    }

    _documentControls() {
        let ctrls = [
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        return ctrls.concat(super._documentControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-edit', html).on('click', this.editItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.item-name h4', html).click(this._onItemSummary.bind(this));

        $('.clear-items', html).click(this.clearAllItems.bind(this));
        $('.split-money', html).click(this.splitMoney.bind(this));
        $('.add-players', html).click(this.addPlayers.bind(this));
        $('.roll-table', html).click(this.rollTable.bind(this, "items"));

        $('.request-item', html).click(this.requestItem.bind(this));
        $('.grant-item', html).click(this.grantItem.bind(this));

        $('.loot-character', html).dblclick(this.openActor.bind(this));

        const actorOptions = this._getActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".loot-character", actorOptions);
    }

    async splitMoney() {
        let actors = (this.object.getFlag('monks-enhanced-journal', 'actors') || []).map(a => {
            return game.actors.get(a);
        }).filter(a => !!a);

        if (actors.length == 0)
            return;

        let split = {};
        let remainder = {};
        let currency = duplicate(this.object.getFlag('monks-enhanced-journal', 'currency') || {});
        for (let [k, v] of Object.entries(currency)) {
            split[k] = Math.floor(v / actors.length);
            remainder[k] = parseInt(v - (split[k] * actors.length));
        }

        for (let actor of actors) {
            let curr = actor.data.data.currency || {};
            for (let [k, v] of Object.entries(split)) {
                if (v != 0) {
                    let newVal = this.getCurrency(curr[k]) + v;
                    curr[k] = (curr[k].hasOwnProperty("value") ? { value: newVal } : newVal);
                }
            }
            await actor.update({ data: { currency: curr } });
        }
        await this.object.setFlag('monks-enhanced-journal', 'currency', remainder);
    }

    async addPlayers() {
        let actors = [];
        for (let user of game.users) {
            if (user.character) {
                actors.push(user.character.id);
            }
        }
        await this.object.setFlag('monks-enhanced-journal', 'actors', actors);
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        data.flags['monks-enhanced-journal'].items = duplicate(this.object.getFlag("monks-enhanced-journal", "items") || []);
        for (let item of data.flags['monks-enhanced-journal'].items) {
            let dataItem = data.items[item._id];
            if (dataItem)
                item = mergeObject(item, dataItem);
        }
        delete data.items;

        data.flags['monks-enhanced-journal'].items = data.flags['monks-enhanced-journal'].items.filter(i => this.getCurrency(i.data.quantity) > 0);

        return flattenObject(data);
    }

    _canDragStart(selector) {
        return game.user.isGM || (['free', 'confirm'].includes(this.object.data.flags["monks-enhanced-journal"].purchasing));
    }

    _canDragDrop(selector) {
        return (game.user.isGM || this.object.testUserPermission(game.user, "OBSERVER"));
    }

    async _onDragStart(event) {
        const li = $(event.currentTarget).closest("li")[0];

        const dragData = { from: 'monks-enhanced-journal' };

        if (!game.user.isGM && !['free', 'confirm'].includes(this.object.data.flags["monks-enhanced-journal"].purchasing)) {
            event.preventDefault();
            return;
        }

        let id = li.dataset.id;
        let item = this.object.data.flags["monks-enhanced-journal"].items.find(i => i._id == id);
        if (item == undefined || (!game.user.isGM && (item?.lock === true || this.getCurrency(item.quantity) <= 0)))
            return;

        item = duplicate(item);
        item.data.quantity = (item.data.quantity.hasOwnProperty("value") ? { value: 1 } : 1);

        dragData.id = id;
        dragData.journalid = this.object.id;
        dragData.type = "Item";
        dragData.data = item;

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        MonksEnhancedJournal._dragItem = li.dataset.id;
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
            if (data.from == 'monks-enhanced-journal') {
                if (!$(event.currentTarget).hasClass('loot-character'))
                    return;

                event.preventDefault;
                let actor = game.actors.get(event.currentTarget.id);
                if (actor) {
                    let itemData = duplicate(data.data);
                    delete itemData._id;
                    itemData.data.quantity = (itemData.data.quantity.hasOwnProperty("value") ? { value: 1 } : 1);
                    actor.createEmbeddedDocuments("Item", [itemData]);
                    this.constructor.purchaseItem.call(this.constructor, this.object, data.data._id, actor);
                }
            } else {
                if (game.user.isGM)
                    this.addItem(data);
                else
                    MonksEnhancedJournal.emit("addItem",
                        {
                            lootid: this.object.id,
                            itemdata: data
                        });

                if (data.data && data.actorId) {
                    let actor = game.actors.get(data.actorId);
                    if (actor) {
                        let item = actor.items.get(data.data._id);
                        item.delete();
                    }
                }
            }
        } else if (data.type == 'Actor') {
            //Add this actor to the list
            let actors = duplicate(this.object.getFlag('monks-enhanced-journal', 'actors'))
            if (game.actors.get(data.id) && !actors.includes(data.id)) {
                actors.push(data.id);
                this.object.setFlag('monks-enhanced-journal', 'actors', actors);
            }
        }
        log('drop data', event, data);
    }

    async requestItem(event) {
        let li = $(event.currentTarget).closest("li")[0];

        let item;
        let id = li.dataset.id;
        item = this.object.data.flags['monks-enhanced-journal'].items.find(o => o._id == id);

        if (!item)
            return;

        if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'confirm') {
            MonksEnhancedJournal.emit("requestLoot",
                {
                    shopid: this.object.id,
                    actorid: game.user.character.id,
                    itemid: id
                }
            );
        } else if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'free') {
            const actor = game.user.character;
            if (!actor) return;

            // Create the owned item
            let itemData = duplicate(item);
            delete itemData._id;
            itemData.data.quantity = (itemData.data.quantity.hasOwnProperty("value") ? { value: 1 } : 1);
            actor.createEmbeddedDocuments("Item", [itemData]);
            MonksEnhancedJournal.emit("purchaseItem",
                {
                    shopid: this.object.id,
                    itemid: item._id,
                    actorid: actor.id
                })
        }
    }

    async grantItem(event) {
        let li = $(event.currentTarget).closest("li")[0];

        let item;
        let id = li.dataset.id;
        let items = duplicate(this.object.data.flags['monks-enhanced-journal'].items || []);
        item = items.find(o => o._id == id);

        if (!item || item.requests.length == 0)
            return;

        let userid = Object.entries(item.requests || {}).find(([k,v]) => v)[0];
        let user = game.users.get(userid);
        if (!user) return;

        const actor = user.character;
        if (!actor) return;

        // Create the owned item
        let itemData = duplicate(item);
        delete itemData._id;
        itemData.data.quantity = (itemData.data.quantity.hasOwnProperty("value") ? { value: 1 } : 1);
        actor.createEmbeddedDocuments("Item", [itemData]);

        item.requests[userid] = false;
        await this.object.setFlag('monks-enhanced-journal', 'items', items);

        await this.constructor.purchaseItem.call(this.constructor, this.object, id, actor, user);
    }

    async addItem(data) {
        let item = await this.getDocument(data);

        if (item) {
            let items = duplicate(this.object.data.flags["monks-enhanced-journal"].items || []);

            let qty = (item.data.data.quantity.hasOwnProperty("value") ? { value: 1 } : 1);
            items.push(mergeObject(item.toObject(), { _id: makeid(), data: { quantity: qty } }));
            this.object.setFlag('monks-enhanced-journal', 'items', items);
            return true;
        }
    }

    clickItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        event.currentTarget = li;

        let item = game.items.find(i => i.id == li.dataset.id)
        if (item == undefined && this.object.data.flags["monks-enhanced-journal"].actor) {
            let actorid = this.object.data.flags["monks-enhanced-journal"].actor.id;
            let actor = game.actors.get(actorid);
            if (actor)
                item = actor.items.get(li.dataset.id);
        }

        if (item)
            return item.sheet.render(true);
    }

    async alterItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        let action = target.dataset.action;
        $(target).toggleClass('active');

        let items = duplicate(this.object.data.flags["monks-enhanced-journal"]?.items || []);

        let item = items.find(i => i._id == li.dataset.id);
        if (item) {
            item[action] = !item[action];
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        }
    }

    static itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (item) {
            if (parseInt(this.getCurrency(item.data.quantity, "")) < 1) {
                ui.notifications.warn("Cannot transfer this item, not enough of this item remains.");
                return false;
            }

            if (game.user.isGM) {
                this.purchaseItem.call(this, entry, id, actor);
                return true;
            } else {
                if (entry.data.flags["monks-enhanced-journal"].purchasing == 'confirm') {
                    MonksEnhancedJournal.emit("requestLoot",
                        {
                            shopid: entry.id,
                            actorid: actor.id,
                            itemid: id
                        }
                    );
                    return false;
                } else {
                    MonksEnhancedJournal.emit("purchaseItem",
                        {
                            shopid: entry.id,
                            actorid: actor.id,
                            itemid: id,
                            quantity: 1
                        }
                    );
                }
            }
        }

        return false;
    }

    async _onItemSummary(event) {
        event.preventDefault();

        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");

        let items = this.object.getFlag('monks-enhanced-journal', 'items');
        let itemData = items.find(i => i._id == id);

        const item = new CONFIG.Item.documentClass(itemData);
        if (item && item.getChatData) {
            const chatData = item.getChatData({ secrets: false });

            // Toggle summary
            if (li.hasClass("expanded")) {
                let summary = li.children(".item-summary");
                summary.slideUp(200, () => summary.remove());
            } else {
                let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
                let props = $('<div class="item-properties"></div>');
                chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
                if (chatData.price != undefined)
                    props.append(`<span class="tag">Price: ${chatData.price}</span>`)
                div.append(props);
                li.append(div.hide());
                div.slideDown(200);
            }
            li.toggleClass("expanded");
        }
    }

    openActor(event) {
        let actor = game.actors.get(event.currentTarget.id);
        if (actor)
            actor.sheet.render(true);
    }

    removeActor(id) {
        if (id) {
            let actors = duplicate(this.object.getFlag('monks-enhanced-journal', 'actors'));
            actors.findSplice(a => a === id);
            this.object.setFlag('monks-enhanced-journal', 'actors', actors);
        }
    }

    _getActorContextOptions() {
        return [
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.attr('id');
                    Dialog.confirm({
                        title: `Remove Actor`,
                        content: 'Are you sure you want to remove this Actor?',
                        yes: this.removeActor.bind(this, id)
                    });
                }
            }
        ];
    }
}
