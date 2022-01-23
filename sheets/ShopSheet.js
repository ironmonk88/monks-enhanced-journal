import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class ShopSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        if (this.options.tabs[0].initial == 'items' && ['hidden', 'visible'].includes(data.data.flags['monks-enhanced-journal'].purchasing) && !this.object.isOwner) {
            this.options.tabs[0].initial = 'description';
            this._tabs[0].active = 'description';
        }
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.shop"),
            template: "modules/monks-enhanced-journal/templates/shop.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".shop-container" },
                { dragSelector: ".document.item", dropSelector: ".shop-container" },
                { dragSelector: ".shop-items .item-list .item .item-name", dropSelector: "null" }],
            scrollY: [".shop-items", ".description"]
        });
    }

    get type() {
        return 'shop';
    }

    async getData() {
        let data = super.getData();

        data.purchaseOptions = [
            {
                text: "Closed",
                groups: {
                    hidden: "MonksEnhancedJournal.purchasing.hidden",
                    visible: "MonksEnhancedJournal.purchasing.visible"
                }
            },
            {
                text: "Open",
                groups: {
                    locked: "MonksEnhancedJournal.purchasing.locked",
                    free: "MonksEnhancedJournal.purchasing.free",
                    confirm: "MonksEnhancedJournal.purchasing.confirm"
                }
            }
        ];

        //get shop items
        data.groups = await this.getItemGroups(data);

        data.hideitems = (['hidden', 'visible'].includes(data.data.flags['monks-enhanced-journal'].purchasing) && !this.object.isOwner);
        let purchasing = data.data.flags['monks-enhanced-journal'].purchasing;
        data.showrequest = (['confirm', 'free'].includes(purchasing) && !this.object.isOwner && game.user.character);

        let actorData = data.data.flags['monks-enhanced-journal'].actor;
        data.actor = game.actors.get(actorData);

        data.valStr = (['pf2e'].includes(game.system.id) ? ".value" : "");

        return data;
    }

    static get defaultObject() {
        return { purchasing: 'confirm', items: [] };
    }

    render(force, options) {
        if (this._tabs[0].active == 'items' && ['hidden', 'visible'].includes(this.object.data.flags['monks-enhanced-journal'].purchasing) && !this.object.isOwner)
            this._tabs[0].active = 'description';
        super.render(force, options);
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

        $('.actor-img img', html).click(this.openActor.bind(this));

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-action', html).on('click', this.alterItem.bind(this));
        $('.item-edit', html).on('click', this.editItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.item-name h4', html).click(this._onItemSummary.bind(this));

        $('.shop-state', html).change(this.changeState.bind(this));

        $('.clear-items', html).click(this.clearAllItems.bind(this));
        $('.adjust-price', html).click(this.adjustPrice.bind(this));
        $('.roll-table', html).click(this.rollTable.bind(this));

        $('.request-item', html).prop('disabled', function () { return $(this).attr('locked') == 'true' }).click(this.requestItem.bind(this));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        data.flags['monks-enhanced-journal'].items = duplicate(this.object.getFlag("monks-enhanced-journal", "items") || []);
        if (items) {
            for (let item of data.flags['monks-enhanced-journal'].items) {
                let dataItem = data.items[item._id];
                if (dataItem)
                    item = mergeObject(item, dataItem);
            }
        }
        delete data.items;

        return flattenObject(data);
    }

    _canDragStart(selector) {
        return game.user.isGM || (['free', 'confirm'].includes(this.object.data.flags["monks-enhanced-journal"].purchasing));
    }

    _canDragDrop(selector) {
        return (game.user.isGM || this.object.isOwner);// && (selector == '.entity.actor');
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
        if (item == undefined || (!game.user.isGM && (item?.lock === true || (item.data.quantity.hasOwnProperty("value") ? item.data.quantity.value : item.data.quantity) <= 0))) {
            ui.notifications.warn("Not enough of that item remains to be transferred to an Actor");
            return;
        }

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

        if (data.type == 'Actor') {
            this.addActor(data);
        } else if (data.type == 'Item') {
            if (data.from == 'monks-enhanced-journal')  //don't drop on yourself
                return;
            if (data.data && data.actorId) {
                if (game.user.isGM) {
                    this.addItem(data);
                    let actor = game.actors.get(data.actorId);
                    if (actor) {
                        let item = actor.items.get(data.data._id);
                        item.delete();
                    }
                } else {
                    //request to sell
                }
            } else
                this.addItem(data);
        }

        log('drop data', event, data);
    }

    /*
    async _onSubmit(ev) {
        if ($(ev.currentTarget).attr('ignoresubmit') == 'true')
            return;

        if ($(ev.currentTarget).hasClass('item-field')) {
            let uuid = ev.currentTarget.closest('li').dataset.uuid;
            let prop = $(ev.currentTarget).attr('name');
            let value = parseInt($(ev.currentTarget).val());
            if (uuid.indexOf('Actor') >= 0) {
                let item = await fromUuid(uuid);
                if (item) {
                    let update = {};
                    update[prop] = value;
                    return item.update({ 'flags.monks-enhanced-journal': update });
                }
            } else {
                let id = ev.currentTarget.closest('li').dataset.id;
                let item = this.object.data.flags['monks-enhanced-journal'].items.find(o => o.id == id);

                if (item) {
                    item[prop] = value;
                    return this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags['monks-enhanced-journal'] });
                }
            }
        } else
            return super._onSubmit(ev);
    }*/

    changeState(event) {
        let show = ($(event.currentTarget).val() != 'hidden');
        let perms = this.object.data.permission;
        perms['default'] = (show ? CONST.ENTITY_PERMISSIONS.OBSERVER : CONST.ENTITY_PERMISSIONS.NONE);
        this.object.update({ permission: perms });
    }

    async adjustPrice(event) {
        let html = await renderTemplate("modules/monks-enhanced-journal/templates/adjust-price.html");
        let dialog = await Dialog.confirm({
            title: `Adjust Prices`,
            content: html,
            yes: async (html) => {
                let adjustment = $('[name="adjustment"]', html).val() / 100;
                let items = this.object.getFlag('monks-enhanced-journal', 'items') || [];

                for (let item of items) {
                    let price = parseInt(this.getCurrency(item.data.price).replace(',', ''));
                    let cost = this.getCurrency(item.data.price).replace(',', '').replace(price, Math.max(Math.ceil((price * adjustment), 1)));
                    item.data.cost = cost;
                }

                this.object.setFlag('monks-enhanced-journal', 'items', items);
            },
            render: (html) => { $('input', html).on("change", this._onChangeInput.bind(this)); }
        });
    }

    async requestItem(event) {
        let li = $(event.currentTarget).closest("li")[0];

        let id = li.dataset.id;
        let item = this.object.data.flags['monks-enhanced-journal'].items.find(o => o._id == id);

        if (!item)
            return;

        const actor = game.user.character;
        if (!actor) {
            ui.notifications.warn("You don't have a character associated with your user");
            return;
        }

        if (item.data.cost && item.data.cost != '') {
            //check if the player can afford it
            if (!this.constructor.canAfford(item, actor)) {
                ui.notifications.warn("Cannot transfer this item, Actor cannot afford it.");
                return false;
            }
        }

        let qty = (item.data?.quantity?.hasOwnProperty("value") ? item.data.quantity.value : item.data.quantity) || "";
        if (parseInt(qty) < 1 && qty != "") {
            ui.notifications.warn("Cannot transfer this item, not enough of this item remains.");
            return false;
        }

        if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'confirm') {
            this.constructor.createRequestMessage.call(this.object, item, actor);
        } else if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'free') {
            // Create the owned item
            let itemData = duplicate(item);
            delete itemData._id;
            await actor.createEmbeddedDocuments("Item", [itemData]);

            MonksEnhancedJournal.emit("purchaseItem",
                {
                    shopid: this.object.id,
                    itemid: item._id,
                    actorid: actor.id,
                    user: game.user.id,
                    purchase: true
                })
        }
    }

    static async createRequestMessage(item, actor) {
        let price = item.data?.cost;
        let messageContent = {
            actor: { id: actor.id, name: actor.name, img: actor.img },
            items: [{ id: item._id, name: item.name, img: item.img, price: price, quantity: 1, total: price }],
            shop: { id: this.id, name: this.name, img: this.img }
        }

        //create a chat message
        let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        if(!whisper.find(u => u == game.user.id))
            whisper.push(game.user.id);
        let speaker = ChatMessage.getSpeaker();
        let content = await renderTemplate("./modules/monks-enhanced-journal/templates/request-item.html", messageContent);
        let messageData = {
            user: game.user.id,
            speaker: speaker,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: content,
            flavor: (speaker.alias ? speaker.alias + " wants to purchase an item" : null),
            whisper: whisper,
            flags: {
                'monks-enhanced-journal': messageContent
            }
        };

        ChatMessage.create(messageData, {});
    }

    async addItem(data) {
        let item = await this.getDocument(data);

        if (item) {
            let items = duplicate(this.object.data.flags["monks-enhanced-journal"].items || []);

            let qty = (item.data.data.quantity.hasOwnProperty("value") ? { value: 1 } : 1);
            items.push(mergeObject(item.toObject(), { _id: makeid(), data: { quantity: qty } }));
            this.object.setFlag('monks-enhanced-journal', 'items', items);
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
        $(event.currentTarget).prev().click();
        /*
        let li = target.closest('li');
        let action = target.dataset.action;
        $(target).toggleClass('active');

        let items = duplicate(this.object.data.flags["monks-enhanced-journal"]?.items || []);

        let item = items.find(i => i._id == li.dataset.id);
        if (item) {
            item[action] = !item[action];
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        }*/
    }

    static canAfford(item, actor) {
        //find the currency
        let cost = "" + item.data.cost;
        let price = parseInt(cost.replace(',', ''));
        if (price == 0 || isNaN(price))
            return true;

        let currency = cost.replace(',', '').replace(price, '').trim();

        if (currency == "")
            currency = "gp";

        let currencies = CONFIG[game.system.id.toUpperCase()]?.currencies;
        if (!currencies)
            return true;

        if (game.system.id == 'pf2e') {
            let coinage = actor.data.items.find(i => { return i.isCoinage && i.data.data.denomination.value == currency });
            return (coinage && coinage.data.data.quantity.value >= price);
        }else
            return (parseInt(this.getCurrency(actor.data.data.currency[currency])) >= price);
    }

    static actorPurchase(item, actor) {
        //find the currency
        let cost = "" + item.data.cost;
        let price = parseInt(cost.replace(',', ''));
        if (price == 0 || isNaN(price))
            return;

        let currency = cost.replace(',', '').replace(price, '').trim();

        if (currency == "")
            currency = "gp";

        let currencies = CONFIG[game.system.id.toUpperCase()]?.currencies;
        if (!currencies)
            return;

        let updates = {};
        if (game.system.id == 'pf2e') {
            let coinage = actor.data.items.find(i => { return i.isCoinage && i.data.data.denomination.value == currency });
            let newVal = coinage.data.data.quantity.value - price;
            updates[`data.quantity.value`] = newVal;
            coinage.update(updates);
        } else {
            let newVal = parseInt(this.getCurrency(actor.data.data.currency[currency])) - price;
            updates[`data.currency.${currency}`] = (actor.data.data.currency[currency].hasOwnProperty("value") ? { value: newVal } : newVal);
            actor.update(updates);
        }
    }

    static itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (item) {
            if (parseInt(this.getCurrency(item.data.quantity, "")) < 1) {
                //check to see if there's enough quantity
                ui.notifications.warn("Cannot transfer this item, not enough of this item remains.");
                return false;
            }

            if (item.data.cost && item.data.cost != '') {
                //check if the player can afford it
                if (!this.canAfford(item, actor)) {
                    ui.notifications.warn("Cannot transfer this item, Actor cannot afford it.");
                    return false;
                }
            }

            if (game.user.isGM) {
                this.actorPurchase.call(entry, item, actor);
                this.purchaseItem.call(this, entry, id, actor, null, true);
                return true;
            } else {
                if (entry.data.flags["monks-enhanced-journal"].purchasing == 'confirm') {
                    this.createRequestMessage.call(entry, item, actor);
                    return false;
                } else {
                    MonksEnhancedJournal.emit("purchaseItem",
                        {
                            shopid: entry.id,
                            actorid: actor.id,
                            itemid: id,
                            quantity: 1,
                            purchase: true
                        }
                    );
                    return true;
                }
            }
        }
        return false;
    }

    async addActor(data) {
        this.object.setFlag("monks-enhanced-journal", "actor", data.id);
    }

    openActor(event) {
        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        let actor = game.actors.get(actorLink.id || actorLink);
        this.open(actor);
    }

    removeActor() {
        this.object.unsetFlag('monks-enhanced-journal', 'actor');
        $('.actor-img', this.element).remove();
    }

    importActorItems() {
        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) {
            let actor = game.actors.get(actorLink.id || actorLink);

            if (actor) {
                let items = [];
                for (let item of actor.items) {
                    let type = item.type || 'unknown';

                    if (['feat', 'spell'].includes(type))
                        continue;

                    items.push(mergeObject(item.toObject(), { cost: this.getCurrency(item.data.data?.price, "") }));
                }

                if (items.length > 0) {
                    let shopitems = duplicate(this.object.getFlag('monks-enhanced-journal', 'items'));
                    shopitems = shopitems.concat(items);
                    this.object.setFlag('monks-enhanced-journal', 'items', shopitems);
                }
            }
        }
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
                name: "Import Items",
                icon: '<i class="fas fa-download fa-fw"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.data("id");
                    Dialog.confirm({
                        title: `Import all actor items`,
                        content: "Confirm that you'd like to import all items from this actor into this shop?",
                        yes: this.importActorItems.bind(this)
                    });
                }
            }
        ];
    }

    async _onItemSummary(event) {
        event.preventDefault();

        let li = $(event.currentTarget).closest('li.item');

        const id = li.data("id");
        let itemData = (this.object.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (!itemData)
            return;

        let item = new CONFIG.Item.documentClass(itemData);
        const chatData = item.getChatData({ secrets: false });

        // Toggle summary
        if (li.hasClass("expanded")) {
            let summary = li.children(".item-summary");
            summary.slideUp(200, () => summary.remove());
        } else {
            let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
            let props = $('<div class="item-properties"></div>');
            chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
            div.append(props);
            li.append(div.hide());
            div.slideDown(200);
        }
        li.toggleClass("expanded");
    }
}
