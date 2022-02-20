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
            scrollY: [".shop-items", ".tab.description .tab-inner"]
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
                    confirm: "MonksEnhancedJournal.purchasing.request"
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
        data.quantityname = MonksEnhancedJournal.quantityname;
        data.pricename = MonksEnhancedJournal.pricename;

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

        return data;
    }

    static get defaultObject() {
        return { purchasing: 'confirm', items: [] };
    }

    get allowedRelationships() {
        return ['person', 'place'];
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
        $('.items-list .actor-icon', html).click(this.openRelationship.bind(this));

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-action', html).on('click', this.alterItem.bind(this));
        $('.item-edit', html).on('click', this.editItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.item-name h4', html).click(this._onItemSummary.bind(this));

        $('.item-hide', html).on('click', this.alterItem.bind(this));

        $('.shop-state', html).change(this.changeState.bind(this));

        $('.clear-items', html).click(this.clearAllItems.bind(this));
        $('.adjust-price', html).click(this.adjustPrice.bind(this));
        $('.roll-table', html).click(this.rollTable.bind(this, "items", false));

        $('.request-item', html).prop('disabled', function () { return $(this).attr('locked') == 'true' }).click(this.requestItem.bind(this));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);
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

        data.flags['monks-enhanced-journal'].relationships = duplicate(this.object.getFlag("monks-enhanced-journal", "relationships") || []);
        for (let relationship of data.flags['monks-enhanced-journal'].relationships) {
            let dataRel = data.relationships[relationship.id];
            if (dataRel)
                relationship = mergeObject(relationship, dataRel);
        }
        delete data.relationships;

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
        if (item == undefined || (!game.user.isGM && (item?.lock === true || this.getQuantity(item.data[MonksEnhancedJournal.quantityname], 0) <= 0))) {
            ui.notifications.warn("Not enough of that item remains to be transferred to an Actor");
            return;
        }

        item = duplicate(item);
        item.data[MonksEnhancedJournal.quantityname] = this.setQuantity(item.data[MonksEnhancedJournal.quantityname], 1);

        dragData.id = id;
        dragData.journalid = this.object.id;
        dragData.type = "Item";
        dragData.data = item;

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        MonksEnhancedJournal._dragItem = li.dataset.id;
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
                    let quantity = this.getQuantity(data.data.data[MonksEnhancedJournal.quantityname]);
                    let price = ShopSheet.getPrice(data.data.data?.cost);
                    let content = await renderTemplate('/modules/monks-enhanced-journal/templates/confirm-purchase.html',
                        {
                            msg: "Are you sure you want to sell?",
                            img: data.data.img,
                            name: data.data.name,
                            quantity: quantity,
                            maxquantity: quantity,
                            total: (quantity * price.value) + " " + price.currency
                    });
                    let dialog = Dialog.confirm({
                        title: "Confirm selling item",
                        content: content,
                        render: (html) => {
                            $('input[name="quantity"]', html).change((event) => {
                                let qty = Math.max(Math.min(quantity, parseInt($(event.currentTarget).val())), 1);
                                $(event.currentTarget).val(qty);
                                $('.request-total', dialog.element).html((qty * price.value) + " " + price.currency);
                            });
                        },
                        yes: (html) => {
                            //create the chat message informaing the GM that player is trying to sell an item.
                            data.data[MonksEnhancedJournal.quantityname] = parseInt($('input[name="quantity"]', html).val());
                            let actor = game.actors.get(data.actorId);
                            this.createSellMessage(data.data, actor);
                        }
                    });
                }
            } else
                this.addItem(data);
        } else if (data.type == 'JournalEntry') {
            this.addRelationship(data);
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
        let html = await renderTemplate("modules/monks-enhanced-journal/templates/adjust-price.html", { adjustment: this.object.getFlag('monks-enhanced-journal', 'adjustment') ?? 1});
        await Dialog.confirm({
            title: `Adjust Prices`,
            content: html,
            yes: async (html) => {
                let adjustment = parseFloat($('[name="adjustment"]', html).val());
                let items = this.object.getFlag('monks-enhanced-journal', 'items') || [];

                for (let item of items) {
                    let price = ShopSheet.getPrice(this.getCurrency(item.data[MonksEnhancedJournal.pricename]));
                    let cost = Math.max(Math.ceil((price.value * adjustment), 1)) + " " + price.currency;
                    item.data.cost = cost;
                }

                await this.object.setFlag('monks-enhanced-journal', 'items', items);
                await this.object.setFlag('monks-enhanced-journal', 'adjustment', adjustment);
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
                ui.notifications.warn(`Cannot transfer this item, ${actor.name} cannot afford it.`);
                return false;
            }
        }

        let qty = (item.data[MonksEnhancedJournal.quantityname] == undefined || item.data[MonksEnhancedJournal.quantityname] == "" ? "" : this.getQuantity(item.data[MonksEnhancedJournal.quantityname])) || "";
        if (qty != "" && parseInt(qty) < 1) {
            ui.notifications.warn("Cannot transfer this item, not enough of this item remains.");
            return false;
        }

        if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'confirm') {
            let price = ShopSheet.getPrice(item.data?.cost);
            let content = await renderTemplate('/modules/monks-enhanced-journal/templates/confirm-purchase.html',
                {
                    msg: "How many would you like to purchase?",
                    img: item.img,
                    name: item.name,
                    quantity: 1,
                    maxquantity: qty != "" ? parseInt(qty) : null,
                    total: price.value + " " + price.currency
                });
            let dialog = Dialog.confirm({
                title: "Confirm selling item",
                content: content,
                render: (html) => {
                    $('input[name="quantity"]', html).change((event) => {
                        let q = parseInt($(event.currentTarget).val());
                        if (qty != "") {
                            q = Math.max(Math.min(parseInt(qty), q), 1);
                            $(event.currentTarget).val(q);
                        }
                        $('.request-total', dialog.element).html((q * price.value) + " " + price.currency);
                    });
                },
                yes: (html) => {
                    //create the chat message informaing the GM that player is trying to sell an item.
                    item.quantity = parseInt($('input[name="quantity"]', html).val());
                    item.maxquantity = (qty != "" ? parseInt(qty) : null);

                    if (!ShopSheet.canAfford((item.quantity * price.value) + " " + price.currency, actor))
                        ui.notifications.error(`${actor.name} cannot afford ${item.quantity} ${item.name}`);
                    else {
                        this.constructor.createRequestMessage.call(this.object, item, actor);
                        MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
                    }
                }
            });
        } else if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'free') {
            // Create the owned item
            let itemData = duplicate(item);
            delete itemData._id;
            itemData.data[MonksEnhancedJournal.quantityname] = this.setQuantity(itemData.data[MonksEnhancedJournal.quantityname], 1);
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
        let price = ShopSheet.getPrice(item.data?.cost);
        item.sell = price.value;
        item.currency = price.currency;
        item.maxquantity = item.maxquantity ?? this.getQuantity(item.data[MonksEnhancedJournal.quantityname]);
        if (item.maxquantity)
            item.quantity = Math.max(Math.min(item.maxquantity, item.quantity), 1);
        item.total = item.quantity * item.sell;
        
        let messageContent = {
            action: 'buy',
            actor: { id: actor.id, name: actor.name, img: actor.img },
            items: [item],
            shop: { id: this.id, name: this.data.name, img: this.data.img }
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
            flavor: (speaker.alias ? speaker.alias + " wants to <b>purchase</b> an item" : null),
            whisper: whisper,
            flags: {
                'monks-enhanced-journal': messageContent
            }
        };

        ChatMessage.create(messageData, {});
    }

    async createSellMessage(item, actor) {
        let price = ShopSheet.getPrice(item.data[MonksEnhancedJournal.pricename]);
        item.sell = (price.value / 2);
        item.currency = price.currency;
        item.maxquantity = this.getQuantity(item.data.quantity);
        item.quantity = Math.max(Math.min(item.maxquantity, item.quantity), 1);
        item.total = item.quantity * item.sell;
        let messageContent = {
            action: 'sell',
            actor: { id: actor.id, name: actor.name, img: actor.img },
            items: [item],
            shop: { id: this.object.id, name: this.object.name, img: this.object.data.img }
        }

        //create a chat message
        let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        if (!whisper.find(u => u == game.user.id))
            whisper.push(game.user.id);
        let speaker = ChatMessage.getSpeaker();
        let content = await renderTemplate("./modules/monks-enhanced-journal/templates/request-sale.html", messageContent);
        let messageData = {
            user: game.user.id,
            speaker: speaker,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: content,
            flavor: (speaker.alias ? speaker.alias + " wants to <b>sell</b> an item" : null),
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

            let price = ShopSheet.getPrice(item.data.data[MonksEnhancedJournal.pricename]);
            let adjustment = this.object.data.flags["monks-enhanced-journal"].adjustment ?? 1;
            items.push(mergeObject(item.toObject(), {
                _id: makeid(),
                hide: !!data.data?.hide,
                lock: !!data.data?.lock,
                data: { cost: (price.value * adjustment) + " " + price.currency }
            }));
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

    static defaultCurrency() {
        if (MonksEnhancedJournal.currencies["gp"])
            return "gp";
        else {
            if (game.system.id == 'tormenta20')
                return "tp";
            let currencies = Object.keys(MonksEnhancedJournal.currencies);
            return (currencies.length > 0 ? currencies[0] : "");
        }
    }

    static getPrice(cost) {
        cost = "" + cost;
        let price = parseInt(cost.replace(',', ''));
        if (price == 0 || isNaN(price))
            return { value: 0, currency: ShopSheet.defaultCurrency() };

        let currency = cost.replace(',', '').replace(price, '').trim();

        if (currency == "")
            currency = ShopSheet.defaultCurrency();

        return { value: price, currency };
    }

    static canAfford(item, actor) {
        //find the currency
        let cost = (typeof item == "string" ? item : item.data.cost);
        let price = ShopSheet.getPrice(cost);
        if (price.value == 0)
            return true;

        let currencies = MonksEnhancedJournal.currencies;
        if (Object.keys(currencies).length == 0)
            return true;

        if (game.system.id == 'pf2e') {
            let coinage = actor.data.items.find(i => { return i.isCoinage && i.data.data.denomination.value == price.currency });
            return (coinage && coinage.data.data.quantity.value >= price.value);
        } else if (game.system.id == 'swade') {
            let coinage = parseInt(actor.data.data.details.currency);
            return (coinage >= price.value);
        }else
            return (parseInt(this.getCurrency(actor.data.data[MonksEnhancedJournal.currencyname][price.currency])) >= price.value);
    }

    static actorPurchase(item, actor) {
        //find the currency
        let cost = (typeof item == "string" ? item : item.data.cost);
        let price = ShopSheet.getPrice(cost);
        if (price.value == 0)
            return;

        let currencies = MonksEnhancedJournal.currencies;
        if (Object.keys(currencies).length == 0)
            return;

        let updates = {};
        if (game.system.id == 'pf2e') {
            let coinage = actor.data.items.find(i => { return i.isCoinage && i.data.data.denomination.value == price.currency });
            let newVal = coinage.data.data.quantity.value - price.value;
            updates[`data.quantity.value`] = newVal;
            coinage.update(updates);
        } else if (game.system.id == 'swade') {
            let coinage = parseInt(actor.data.data.details.currency);
            let newVal = coinage - price.value;
            updates[`data.details.currency`] = newVal;
            actor.update(updates);
        } else {
            let newVal = parseInt(EnhancedJournalSheet.getCurrency(actor.data.data[MonksEnhancedJournal.currencyname][price.currency])) - price.value;
            updates[`data.${MonksEnhancedJournal.currencyname}.${price.currency}`] = (actor.data.data[MonksEnhancedJournal.currencyname][price.currency].hasOwnProperty("value") ? { value: newVal } : newVal);
            actor.update(updates);
        }
    }

    static itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (item) {
            if (parseInt(ShopSheet.getQuantity(item.data[MonksEnhancedJournal.quantityname], "")) < 1) {
                //check to see if there's enough quantity
                ui.notifications.warn("Cannot transfer this item, not enough of this item remains.");
                return false;
            }

            if (item.data.cost && item.data.cost != '') {
                //check if the player can afford it
                if (!this.canAfford(item, actor)) {
                    ui.notifications.warn(`Cannot transfer this item, ${actor.name} cannot afford it.`);
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

                    items.push(mergeObject(item.toObject(), { cost: this.getCurrency(item.data.data[MonksEnhancedJournal.pricename], "") }));
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
}
