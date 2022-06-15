import { setting, i18n, format, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
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
                { dragSelector: ".shop-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".actor-img img", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
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
                text: i18n("MonksEnhancedJournal.Closed"),
                groups: {
                    hidden: "MonksEnhancedJournal.purchasing.hidden",
                    visible: "MonksEnhancedJournal.purchasing.visible"
                }
            },
            {
                text: i18n("MonksEnhancedJournal.Open"),
                groups: {
                    locked: "MonksEnhancedJournal.purchasing.locked",
                    free: "MonksEnhancedJournal.purchasing.free",
                    confirm: "MonksEnhancedJournal.purchasing.request"
                }
            }
        ];

        data.sellingOptions = 
        {
            locked: "MonksEnhancedJournal.selling.locked",
            free: "MonksEnhancedJournal.selling.free",
            confirm: "MonksEnhancedJournal.selling.request"
        };

        //get shop items
        data.groups = await this.getItemGroups(data, this.object._sort);

        data.hideitems = (['hidden', 'visible'].includes(data.data.flags['monks-enhanced-journal'].purchasing) && !this.object.isOwner);
        let purchasing = data.data.flags['monks-enhanced-journal'].purchasing;
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        data.showrequest = (['confirm', 'free'].includes(purchasing) && !this.object.isOwner && game.user.character && hasGM);

        let actorData = data.data.flags['monks-enhanced-journal'].actor;
        let actor = game.actors.get(actorData);

        if (actor) {
            data.actor = { id: actor.id, name: actor.name, img: actor.img };
        }

        data.valStr = (['pf2e'].includes(game.system.id) ? ".value" : "");
        data.quantityname = quantityname();
        data.pricename = pricename();

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
        return { purchasing: 'confirm', selling:'confirm', items: [], sell: 1, buy: 0.5 };
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
            { id: 'sound', text: i18n("MonksEnhancedJournal.AddSound"), icon: 'fa-music', conditional: this.isEditable, callback: () => { this.onAddSound(); } },
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

        $('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));

        $('.items-header', html).on("click", this.collapseItemSection.bind(this));

        $('[sort]', html).on("click", this.alterSort.bind(this));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        if (data.items) {
            data.flags['monks-enhanced-journal'].items = duplicate(this.object.getFlag("monks-enhanced-journal", "items") || []);
            for (let item of data.flags['monks-enhanced-journal'].items) {
                let dataItem = data.items[item._id];
                if (dataItem)
                    item = mergeObject(item, dataItem);
            }
            delete data.items;
        }

        if (data.relationships) {
            data.flags['monks-enhanced-journal'].relationships = duplicate(this.object.getFlag("monks-enhanced-journal", "relationships") || []);
            for (let relationship of data.flags['monks-enhanced-journal'].relationships) {
                let dataRel = data.relationships[relationship.id];
                if (dataRel)
                    relationship = mergeObject(relationship, dataRel);
            }
            delete data.relationships;
        }

        return flattenObject(data);
    }

    _canDragStart(selector) {
        if (selector == ".sheet-icon") return game.user.isGM;
        if (selector == ".document.actor") return game.user.isGM;
        if (selector == ".document.item") return true;
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        return game.user.isGM || (['free', 'confirm'].includes(this.object.data.flags["monks-enhanced-journal"].purchasing) && hasGM);
    }

    _canDragDrop(selector) {
        return (game.user.isGM || this.object.isOwner);
    }

    async _onDragStart(event) {
        if ($(event.currentTarget).hasClass("sheet-icon"))
            return super._onDragStart(event);

        const target = event.currentTarget;

        if (target.dataset.document == "Actor") {
            const dragData = { id: target.dataset.id, type: target.dataset.document };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        } else {
            const li = $(target).closest("li")[0];

            const dragData = { from: this.object.id };

            if (!game.user.isGM && !['free', 'confirm'].includes(this.object.data.flags["monks-enhanced-journal"].purchasing)) {
                event.preventDefault();
                return;
            }

            let id = li.dataset.id;

            let item = this.object.data.flags["monks-enhanced-journal"].items.find(i => i._id == id);
            if (item == undefined) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.CannotFindItem"));
                return;
            }

            if (!game.user.isGM && item?.lock === true) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.ItemIsLocked"));
                return;
            }

            let qty = this.getValue(item, quantityname(), null);
            if (!game.user.isGM && (qty != null && qty <= 0)) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.NotEnoughRemainsToBeTransferred"));
                return;
            }

            item = duplicate(item);
            //this.setValue(item, quantityname(), 1);

            dragData.id = id;
            dragData.journalid = this.object.id;
            dragData.type = "Item";
            dragData.data = item;

            log('Drag Start', dragData);

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

            MonksEnhancedJournal._dragItem = li.dataset.id;
        }
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
            if (data.from == this.object.id)  //don't drop on yourself
                return;
            if (data.data && data.actorId) {
                let actor = game.actors.get(data.actorId);
                if (!actor)
                    return;

                if (game.user.isGM) {
                    let item = await this.getDocument(data);
                    let max = this.getValue(item.data, quantityname());

                    let price = this.getPrice(item.data, "price");
                    let buy = this.object.getFlag('monks-enhanced-journal', 'buy') ?? 0.5;
                    price.value = Math.floor(price.value * buy);
                    let result = await this.constructor.confirmQuantity(item, max, "sell", true, price);
                    if ((result?.quantity ?? 0) > 0) {
                        this.setValue(item.data, quantityname(), result.quantity);
                        this.addItem(item);

                        await this.constructor.actorPurchase(actor, { value: -(result.price.value * result.quantity), currency: result.price.currency });

                        let actorItem = actor.items.get(data.data._id);
                        if (actorItem) {
                            if (result.quantity >= this.getValue(actorItem.data, quantityname()))
                                actorItem.delete();
                            else {
                                let newQty = this.getValue(actorItem.data, quantityname()) - result.quantity;
                                let update = { data: {} }; 
                                update.data[quantityname()] = actorItem.data.data[quantityname()];
                                this.setValue(update, quantityname(), newQty);
                                actorItem.update(update);
                            }
                        }
                    }
                } else {
                    let selling = this.object.getFlag('monks-enhanced-journal', 'selling');
                    if (selling == "locked" || !selling) {
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ShopIsNotReceivingItems"));
                        return false;
                    }

                    let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
                    if (!hasGM) {
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotSellItemWithoutGM"));
                        return false;
                    }
                    //request to sell
                    let item = await this.getDocument(data);
                    let max = this.getValue(item.data, quantityname());
                    let price = ShopSheet.getPrice(item.data);
                    let origPrice = price.value;
                    let buy = this.object.getFlag('monks-enhanced-journal', 'buy') ?? 0.5;
                    price.value = Math.floor(price.value * buy);
                    let result = await this.constructor.confirmQuantity(item, max, "sell", true, price);
                    if ((result?.quantity ?? 0) > 0) {
                        if (selling == "free") {
                            //give the player the money
                            await this.constructor.actorPurchase(actor, { value: -(price.value * result.quantity), currency: price.currency });

                            //remove the item from the actor
                            let actoritem = actor.items.get(item.id);
                            if (result.quantity == max) {
                                await actoritem.delete();
                            } else {
                                let qty = max - result.quantity;
                                let update = { data: {} };
                                update.data[quantityname()] = actoritem.data.data[quantityname()];
                                this.setValue(update, quantityname(), qty);
                                await actoritem.update(update);
                            }

                            //add the item to the shop
                            let itemData = item.toObject();
                            this.setValue(itemData, quantityname(), result.quantity);
                            this.setValue(itemData, pricename(), origPrice + " " + price.currency);
                            itemData.lock = true;
                            itemData.from = actor.name;

                            if (!game.user.isGM)
                                MonksEnhancedJournal.emit("sellItem", { shopid: this.object.id, itemdata: itemData });
                            else {
                                this.addItem(itemData);
                            }
                        } else {
                            let itemData = item.toObject();
                            itemData.quantity = result.quantity;

                            this.createSellMessage(itemData, actor);
                        }
                    }
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

    alterSort(event) {
        this.object._sort = $(event.currentTarget).attr("sort");
        if (this.enhancedjournal)
            this.enhancedjournal.render();
        else
            this.render();
    }

    changeState(event) {
        let show = ($(event.currentTarget).val() != 'hidden');
        let perms = this.object.data.permission;
        perms['default'] = (show ? CONST.ENTITY_PERMISSIONS.OBSERVER : CONST.ENTITY_PERMISSIONS.NONE);
        this.object.update({ permission: perms });
    }

    async adjustPrice(event) {
        let convertItems = async function (html) {
            let sell = parseFloat($('[name="adjustment.sell"]', html).val());

            let items = this.object.getFlag('monks-enhanced-journal', 'items') || [];

            for (let item of items) {
                let price = ShopSheet.getPrice(item);
                let cost = Math.max(Math.ceil((price.value * sell), 1)) + " " + price.currency;
                item.data.cost = cost;
            }

            await this.object.setFlag('monks-enhanced-journal', 'items', items);
        }

        let data = {
            sell: this.object.getFlag('monks-enhanced-journal', 'sell') ?? 1,
            buy: this.object.getFlag('monks-enhanced-journal', 'buy') ?? 0.5
        }

        let content = await renderTemplate("modules/monks-enhanced-journal/templates/adjust-price.html", data);

        const dialog = new Dialog({
            title: i18n("MonksEnhancedJournal.AdjustPrices"),
            content: content,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("Yes"),
                    callback: async (html) => {
                        let buy = parseFloat($('[name="adjustment.buy"]', html).val());
                        let sell = parseFloat($('[name="adjustment.sell"]', html).val());

                        await this.object.setFlag('monks-enhanced-journal', 'buy', buy);
                        await this.object.setFlag('monks-enhanced-journal', 'sell', sell);
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("No"),
                }
            },
            default: "yes",
            render: (html) => {
                $('input', html).on("change", this._onChangeInput.bind(this));
                $('.convert-button', html).on("click", convertItems.bind(this, html));
            },
        });
        dialog.render(true);
    }

    async requestItem(event) {
        let li = $(event.currentTarget).closest("li")[0];

        let id = li.dataset.id;
        let item = this.object.data.flags['monks-enhanced-journal'].items.find(o => o._id == id);

        if (!item)
            return;

        const actor = game.user.character;
        if (!actor) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.YouDontHaveCharacter"));
            return;
        }

        if (item.data.cost && item.data.cost != '') {
            //check if the player can afford it
            if (!this.constructor.canAfford(item, actor)) {
                ui.notifications.warn(format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name } ));
                return false;
            }
        }

        let max = this.getValue(item, quantityname(), null);
        if (!game.user.isGM && (max != null && max <= 0)) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
            return false;
        }

        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (!hasGM) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotPurchaseItemWithoutGM"));
            return false;
        }

        let price = ShopSheet.getPrice(item, "cost");

        let result = await ShopSheet.confirmQuantity(item, max, "purchase");
        if ((result?.quantity ?? 0) > 0) {
            if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'confirm') {
                //create the chat message informaing the GM that player is trying to sell an item.
                item.quantity = result.quantity;
                item.maxquantity = (max != "" ? parseInt(max) : null);

                if (!ShopSheet.canAfford((item.quantity * price.value) + " " + price.currency, actor))
                    ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: item.quantity, itemname: item.name}));
                else {
                    this.constructor.createRequestMessage.call(this, this.object, item, actor);
                    MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
                }
            } else if (this.object.data.flags['monks-enhanced-journal'].purchasing == 'free') {
                // Create the owned item
                if (!ShopSheet.canAfford((result.quantity * price.value) + " " + price.currency, actor))
                    ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: result.quantity, itemname: item.name }));
                else {
                    let itemData = duplicate(item);
                    delete itemData._id;
                    this.setValue(itemData, quantityname(), result.quantity);
                    await actor.createEmbeddedDocuments("Item", [itemData]);

                    MonksEnhancedJournal.emit("purchaseItem",
                        {
                            shopid: this.object.id,
                            itemid: item._id,
                            actorid: actor.id,
                            user: game.user.id,
                            quantity: result.quantity,
                            purchase: true
                        });
                }
            }
        }
    }

    async createSellMessage(item, actor) {
        let price = ShopSheet.getPrice(item);
        let buy = this.object.getFlag('monks-enhanced-journal', 'buy') ?? 0.5;
        item.sell = Math.floor(price.value * buy);
        item.currency = price.currency;
        item.maxquantity = this.getValue(item, quantityname());
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
            flavor: (speaker.alias ? format("MonksEnhancedJournal.ActorWantsToPurchase", { alias: speaker.alias, verb: i18n("MonksEnhancedJournal.Sell").toLowerCase() }) : null),
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

            let itemData = item.toObject();
            if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                itemData = await ShopSheet.createScrollFromSpell(itemData);
            }

            let price = ShopSheet.getPrice(item.data);
            let adjustment = this.object.data.flags["monks-enhanced-journal"].sell ?? 1;
            items.push(mergeObject(itemData, {
                _id: makeid(),
                hide: !!data.data?.hide,
                lock: !!data.data?.lock,
                data: { cost: (price.value * adjustment) + " " + price.currency, equipped: false }
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

    static canAfford(item, actor) {
        //find the currency
        let price = ShopSheet.getPrice(item, "cost");
        if (price.value == 0)
            return true;

        if (MonksEnhancedJournal.currencies.length == 0)
            return true;

        if (setting("purchase-conversion")) {
            let coins = this.getCurrency(actor, price.currency);
            if (coins >= price.value) {
                return true;
            } else {
                let totalDefault = 0;
                for (let curr of MonksEnhancedJournal.currencies) {
                    totalDefault += (this.getCurrency(actor, curr.id) * (curr.convert || 1));
                }
                let check = MonksEnhancedJournal.currencies.find(c => c.id == price.currency);
                totalDefault = totalDefault / (check.convert || 1);

                return totalDefault >= price.value;
            }
        } else {
            let coins = this.getCurrency(actor, price.currency);
            return coins >= price.value;
        }
    }

    static actorPurchase(actor, price) {
        //find the currency
        if (price.value == 0)
            return;

        if (MonksEnhancedJournal.currencies.length == 0)
            return;

        ShopSheet.addCurrency(actor, price.currency, -price.value);
    }

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (item) {
            let max = this.getValue(item, quantityname(), null);
            if (!game.user.isGM && (max != null && max <= 0)) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                return false;
            }

            if (item.data.cost && item.data.cost != '') {
                //check if the player can afford it
                if (!this.canAfford(item, actor)) {
                    ui.notifications.warn(format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name }));
                    return false;
                }
            }

            let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
            if (!hasGM) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotPurchaseItemWithoutGM"));
                return false;
            }

            let price = ShopSheet.getPrice(item, "cost");

            let result = await ShopSheet.confirmQuantity(item, max, "purchase");
            if ((result?.quantity ?? 0) > 0) {
                price = result.price;
                if (game.user.isGM) {
                    ShopSheet.actorPurchase.call(entry, actor, { value: (price.value * result.quantity), currency: price.currency });
                    ShopSheet.purchaseItem.call(this, entry, id, result.quantity, { actor, purchased: true });
                    return result;
                } else {
                    if (entry.data.flags["monks-enhanced-journal"].purchasing == 'confirm') {
                        //create the chat message informaing the GM that player is trying to sell an item.
                        item.quantity = result.quantity;
                        item.maxquantity = (max != "" ? parseInt(max) : null);

                        if (!ShopSheet.canAfford((item.quantity * price.value) + " " + price.currency, actor))
                            ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: item.quantity, itemname: item.name}));
                        else {
                            ShopSheet.createRequestMessage.call(this, entry, item, actor);
                            MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
                        }
                    } else {
                        if (!ShopSheet.canAfford((result.quantity * price.value) + " " + price.currency, actor)) {
                            ui.notifications.error(format("MonksEnhancedJournal.msg.ActorCannotAffordItem", { name: actor.name, quantity: result.quantity, itemname: item.name }));
                            result = false;
                        } else {
                            if (result.quantity > 0) {
                                MonksEnhancedJournal.emit("purchaseItem",
                                    {
                                        shopid: entry.id,
                                        actorid: actor.id,
                                        itemid: id,
                                        quantity: result.quantity,
                                        purchase: true,
                                        user: game.user.id
                                    });
                            }
                        }
                        return result;
                    }
                }
            } else if (result !== false && result != null) {
                log("result", result);
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotAddLessThanOne"));
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
        if (!actor)
            return;

        if (event.newtab == true || event.altKey)
            actor.sheet.render(true);
        else
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
                let items = actor.items
                    .filter(item => {
                        // Weapons are fine, unless they're natural
                        let result = false;
                        if (item.type == 'weapon') {
                            result = item.data.data.weaponType != 'natural';
                        }
                        // Equipment's fine, unless it's natural armor
                        else if (item.type == 'equipment') {
                            if (!item.data.data.armor)
                                result = true;
                            else
                                result = item.data.data.armor.type != 'natural';
                        } else
                            result = !(['class', 'spell', 'feat', 'action', 'lore'].includes(item.type));

                        return result;
                    }).map(i => {
                        return mergeObject(i.toObject(), { cost: this.getValue(i.data, pricename(), "") });
                    });

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
                        title: `${game.i18n.localize("SIDEBAR.Delete")} ${i18n("MonksEnhancedJournal.ActorLink")}`,
                        content: i18n("MonksEnhancedJournal.ConfirmRemoveLink"),
                        yes: this.removeActor.bind(this)
                    });
                }
            },
            {
                name: i18n("MonksEnhancedJournal.ImportItems"),
                icon: '<i class="fas fa-download fa-fw"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.data("id");
                    Dialog.confirm({
                        title: i18n("MonksEnhancedJournal.ImportAllActorItems"),
                        content: i18n("MonksEnhancedJournal.msg.ConfirmImportAllItemsToShop"),
                        yes: this.importActorItems.bind(this)
                    });
                }
            },
            {
                name: i18n("MonksEnhancedJournal.OpenActorSheet"),
                icon: '<i class="fas fa-user fa-fw"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    this.openActor.call(this, { newtab: true });
                }
            }
        ];
    }
}
