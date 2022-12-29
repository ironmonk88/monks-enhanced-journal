import { setting, i18n, format, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { DistributeCurrency } from "../apps/distribute-currency.js";
import { getValue, setValue, MEJHelpers } from "../helpers.js";

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
                { dragSelector: ".loot-character", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".loot-items"]
        });
    }

    get type() {
        return 'loot';
    }

    async getData() {
        let actors = [];
        let players = [];
        for (let user of game.users) {
            if (!user.isGM && this.object.testUserPermission(user, "OBSERVER") && (user.active || setting("loot-inactive-players"))) {
                players.push(user.name);
                if(user.character)
                    actors.push(user.character.id); //, name: user.character.name, img: user.character.img });
            }
        }
        if (this.object.getFlag('monks-enhanced-journal', 'actors') == undefined && game.user.isGM) {
            if (actors.length == 0) {
                for (let user of game.users) {
                    if (user.character && (user.active || setting("loot-inactive-players"))) {
                        actors.push(user.character.id); //, name: user.character.name, img: user.character.img });
                    }
                }
            }
            await this.object.setFlag('monks-enhanced-journal', 'actors', actors);
        }

        let data = await super.getData();
        data.purchaseOptions = {
            locked: "MonksEnhancedJournal.purchasing.locked",
            free: "MonksEnhancedJournal.purchasing.free",
            confirm: "MonksEnhancedJournal.purchasing.confirm"
        };

        let currency = (data.data.flags['monks-enhanced-journal'].currency || []);
        data.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: currency[c.id] ?? 0 };
        });

        data.groups = this.getItemGroups(
            getProperty(data, "data.flags.monks-enhanced-journal.items"),
            getProperty(data, "data.flags.monks-enhanced-journal.type"),
            getProperty(data, "data.flags.monks-enhanced-journal.purchasing"));

        data.canGrant = game.user.isGM && ((data.data.flags['monks-enhanced-journal'].items || []).find(i => (Object.values(getProperty(i, "flags.monks-enhanced-journal.requests") || {}).find(r => r) != undefined)) != undefined);
        data.canRequest = (data.data.flags['monks-enhanced-journal'].purchasing == "locked");

        data.characters = (data.data.flags['monks-enhanced-journal'].actors || []).map(a => {
            let actor = game.actors.get(a);
            if (actor) {
                let user = game.users.find(u => u.character?.id == actor.id);
                return { id: actor.id, name: actor.name, img: actor.img, color: user?.color, letter: user?.name[0], username: user?.name };
            }
        }).filter(a => !!a);

        data.purchasing = data.data.flags['monks-enhanced-journal'].purchasing || 'locked';
        data.showrequest = !game.user.isGM;

        data.players = players.join(", ");

        return data;
    }

    static get defaultObject() {
        return { purchasing: 'confirm', items: [] };
    }

    _documentControls() {
        let ctrls = [
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'sound', text: i18n("MonksEnhancedJournal.AddSound"), icon: 'fa-music', conditional: this.isEditable, callback: () => { this.onAddSound(); } },
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
        $('.roll-table', html).click(this.rollTable.bind(this, "items", true));

        $('.request-item', html).click(this.requestItem.bind(this));
        $('.grant-item', html).click(this.grantItem.bind(this));

        $('.loot-character', html).dblclick(this.openActor.bind(this));

        $('.configure-permissions', html).click(this.configure.bind(this));

        $('.items-header', html).on("click", this.collapseItemSection.bind(this));

        const actorOptions = this._getActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".loot-character", actorOptions);
    }

    configure() {
        let object = this.object;
        if (object instanceof JournalEntryPage)
            object = object.parent;
        new DocumentOwnershipConfig(object).render(true);
    }

    async splitMoney() {
        let actors = (this.object.getFlag('monks-enhanced-journal', 'actors') || []).map(a => {
            return game.actors.get(a);
        }).filter(a => !!a);
        if (actors.length == 0) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ThereAreNoCharactersToDistribute"));
            return;
        }

        let currency = duplicate(this.object.getFlag('monks-enhanced-journal', 'currency') || {});
        if (Object.values(currency).find(v => v > 0) == undefined) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ThereAreNoMoneyToDistribute"));
            return;
        }

        new DistributeCurrency(actors, currency, this).render(true, { focus: true });
    }

    async doSplitMoney(characters, remainder){
        for (let character of characters) {
            let actor = game.actors.get(character.id);
            for (let [k, v] of Object.entries(character.currency)) {
                if (v != 0) {
                    await this.addCurrency(actor, k, v);
                }
            }
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

        data.flags['monks-enhanced-journal'].items = data.flags['monks-enhanced-journal'].items.filter(i => getValue(i, quantityname()) > 0);

        return flattenObject(data);
    }

    _canDragStart(selector) {
        if (selector == ".sheet-icon") return game.user.isGM;
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        return game.user.isGM || (['free', 'confirm'].includes(this.object.flags["monks-enhanced-journal"].purchasing) && hasGM);
    }

    _canDragDrop(selector) {
        return (game.user.isGM || this.object.testUserPermission(game.user, "OBSERVER"));
    }

    async _onDragStart(event) {
        if ($(event.currentTarget).hasClass("sheet-icon"))
            return super._onDragStart(event);

        const li = $(event.currentTarget).closest("li")[0];

        const dragData = { from: this.object.uuid };

        if (!game.user.isGM && !['free', 'confirm'].includes(this.object.flags["monks-enhanced-journal"].purchasing)) {
            event.preventDefault();
            return;
        }

        let id = li.dataset.id;
        let item = this.object.flags["monks-enhanced-journal"].items.find(i => i._id == id);
        if (item == undefined || (!game.user.isGM && (item?.lock === true || getValue(item, quantityname()) <= 0)))
            return;

        dragData.itemId = id;
        dragData.uuid = this.object.uuid;
        dragData.type = "Item";
        dragData.data = duplicate(item);
        MonksEnhancedJournal._dragItem = id;

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'Item') {
            let entry;
            try {
                entry = await fromUuid(data.from);
            } catch { }

            if (data.from == this.object.uuid) {
                if (!$(event.currentTarget).hasClass('loot-character'))
                    return;

                event.preventDefault();
                let actor = game.actors.get(event.currentTarget.id);
                if (actor) {
                    let item = await this.getDocument(data);
                    let max = getProperty(item, "flags.monks-enhanced-journal.quantity");
                    let result = await LootSheet.confirmQuantity(item, max, "transfer", false);
                    if ((result?.quantity ?? 0) > 0) {
                        let itemData = item.toObject();
                        if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                            itemData = await LootSheet.createScrollFromSpell(itemData);
                        }
                        delete itemData._id;
                        let itemQty = getValue(itemData, quantityname(), 1);
                        setValue(itemData, quantityname(), result.quantity * itemQty);
                        let sheet = actor.sheet;
                        sheet._onDropItem({ preventDefault: () => { } }, { type: "Item", uuid: `${this.object.uuid}.Items.${item._id}`, data: itemData });
                        //actor.createEmbeddedDocuments("Item", [itemData]);

                        if (entry)
                            this.constructor.purchaseItem.call(this.constructor, entry, data.data._id, result.quantity, { actor });
                    }
                }
            } else {
                let item = await this.getDocument(data);
                let max = getValue(item, quantityname(), null);
                if (!entry && !item.actor?.id)
                    max = null;

                //Don't transfer between Loot sheets unless purchasing is set to "Anyone" or the player owns the sheet
                if (entry
                    && !((this.object.flags["monks-enhanced-journal"].purchasing == "free" || this.object.isOwner)
                    && ((entry.data.flags["monks-enhanced-journal"].purchasing == "free" || entry.isOwner))))
                    return;

                //Only allow players to drop things from their own player onto the loot sheet
                if (!this.object.isOwner && !(item.actor.id || entry))
                    return;

                let result = await LootSheet.confirmQuantity(item, max, "transfer", false);
                if ((result?.quantity ?? 0) > 0) {
                    let itemData = item.toObject();
                    setProperty(itemData, "flags.monks-enhanced-journal.quantity", result.quantity);
                    setValue(itemData, quantityname(), 1);

                    if (game.user.isGM) {
                        this.addItem({ data: itemData });
                    } else {
                        MonksEnhancedJournal.emit("addItem",
                            {
                                lootid: this.object.uuid,
                                itemdata: itemData
                            });
                    }

                    //is this transferring from another journal entry?

                    if (entry) {
                        if(game.user.isGM)
                            this.constructor.purchaseItem.call(this.constructor, entry, data.data._id, result.quantity, { chatmessage: false });
                        else
                            MonksEnhancedJournal.emit("purchaseItem",
                                {
                                    shopid: entry.uuid,
                                    itemid: data.data._id,
                                    user: game.user.id,
                                    quantity: result.quantity,
                                    chatmessage: false
                                });
                    } else if (item.actor) {
                        //let actorItem = item.actor.items.get(data.data._id);
                        let quantity = getValue(item, quantityname());
                        if (result.quantity >= quantity)
                            item.delete();
                        else {
                            let newQty = quantity - result.quantity;
                            item.update({ quantity: newQty });
                        }
                    }
                }
            }
        } else if (data.type == 'Folder' && data.documentName == "Item") {
            if (!this.object.isOwner)
                return false;
            // Import items from the folder
            let folder = await fromUuid(data.uuid);
            if (folder) {
                for (let item of folder.contents) {
                    if (item instanceof Item) {
                        let itemData = item.toObject();
                        await this.addItem({data: itemData });
                    }
                }
            }
        } else if (data.type == 'Actor') {
            //Add this actor to the list
            let actors = duplicate(this.object.getFlag('monks-enhanced-journal', 'actors'));
            let actor = await fromUuid(data.uuid);
            if (actor && !actors.includes(actor.id)) {
                actors.push(actor.id);
                this.object.setFlag('monks-enhanced-journal', 'actors', actors);
            }
        }
        log('drop data', event, data);
    }

    async requestItem(event) {
        let li = $(event.currentTarget).closest("li")[0];

        let item;
        let id = li.dataset.id;
        item = this.object.flags['monks-enhanced-journal'].items.find(o => o._id == id);

        if (!item)
            return;

        const actor = game.user.character;
        if (!actor) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.YouDontHaveCharacter"));
            return;
        }

        let max = getProperty(item, "flags.monks-enhanced-journal.quantity");
        if (!game.user.isGM && (max != null && max <= 0)) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
            return false;
        }

        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (!hasGM) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTakeLootWithoutGM"));
            return false;
        }

        if (this.object.flags['monks-enhanced-journal'].purchasing == 'locked') {
            MonksEnhancedJournal.emit("requestLoot",
                {
                    shopid: this.object.uuid,
                    actorid: game.user.character.id,
                    itemid: id
                }
            );
        } else if (this.object.flags['monks-enhanced-journal'].purchasing == 'confirm') {
            let result = await LootSheet.confirmQuantity(item, max, "take", false);
            if ((result?.quantity ?? 0) > 0) {
                //create the chat message informaing the GM that player is trying to sell an item.
                item = duplicate(item);
                setProperty(item, "flags.monks-enhanced-journal.quantity", result.quantity);
                setProperty(item, "flags.monks-enhanced-journal.maxquantity", max);
                setProperty(item, "flags.monks-enhanced-journal.cost", null);

                LootSheet.createRequestMessage.call(this, this.object, item, actor, false);
                MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
            }
        } else if (this.object.flags['monks-enhanced-journal'].purchasing == 'free') {
            let result = await LootSheet.confirmQuantity(item, max, "take", false);
            if ((result?.quantity ?? 0) > 0) {
                // Create the owned item
                let itemData = duplicate(item);
                delete itemData._id;
                let itemQty = getValue(itemData, quantityname(), 1);
                setValue(itemData, quantityname(), result.quantity * itemQty);
                let sheet = actor.sheet;
                sheet._onDropItem({ preventDefault: () => { } }, { type: "Item", uuid: `${this.object.uuid}.Items.${item._id}`, data: itemData });
                //actor.createEmbeddedDocuments("Item", [itemData]);
                MonksEnhancedJournal.emit("purchaseItem",
                    {
                        shopid: this.object.uuid,
                        itemid: item._id,
                        actorid: actor.id,
                        user: game.user.id,
                        quantity: result.quantity
                    });
            }
        }
    }

    async grantItem(event) {
        let li = $(event.currentTarget).closest("li")[0];

        let item;
        let id = li.dataset.id;
        let items = duplicate(this.object.flags['monks-enhanced-journal'].items || []);
        item = items.find(o => o._id == id);

        if (!item || getProperty(item, "flags.monks-enhanced-journal.requests").length == 0)
            return;

        let userid = Object.entries(getProperty(item, "flags.monks-enhanced-journal.requests") || {}).find(([k, v]) => v)[0];
        let user = game.users.get(userid);
        if (!user) return;

        const actor = user.character;
        if (!actor) return;

        let max = getProperty(item, "flags.monks-enhanced-journal.quantity");
        let result = await LootSheet.confirmQuantity(item, max, format("MonksEnhancedJournal.GrantToActor", { name: actor.name }), false);
        if ((result?.quantity ?? 0) > 0) {
            setProperty(item, "flags.monks-enhanced-journal.requests." + userid, false);
            await this.object.setFlag('monks-enhanced-journal', 'items', items);

            // Create the owned item
            let itemData = duplicate(item);
            delete itemData._id;
            let itemQty = getValue(itemData, quantityname(), 1);
            setValue(itemData, quantityname(), result.quantity * itemQty);
            let sheet = actor.sheet;
            sheet._onDropItem({ preventDefault: () => { } }, { type: "Item", uuid: `${this.object.uuid}.Items.${item._id}`, data: itemData });
            //actor.createEmbeddedDocuments("Item", [itemData]);

            await this.constructor.purchaseItem.call(this.constructor, this.object, id, result.quantity, { actor, user });
        } else if (result?.quantity === 0) {
            setProperty(item, "flags.monks-enhanced-journal.requests." + userid, false);
            await this.object.setFlag('monks-enhanced-journal', 'items', items);
        }
    }

    async addItem(data) {
        let item = await this.getDocument(data);

        if (item) {
            let items = duplicate(this.object.flags["monks-enhanced-journal"].items || []);

            let itemData = item.toObject();
            if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                itemData = await LootSheet.createScrollFromSpell(itemData);
            }

            let sysPrice = MEJHelpers.getSystemPrice(item, pricename()); //MEJHelpers.getPrice(getProperty(item, "flags.monks-enhanced-journal.price"));
            let price = MEJHelpers.getPrice(sysPrice);
            let flags = Object.assign({quantity: 1}, getProperty(itemData, "flags.monks-enhanced-journal"), {
                parentId: item.id,
                price: `${price.value} ${price.currency}`
            });
            let update = { _id: makeid(), flags: { 'monks-enhanced-journal': flags } };
            if (game.system.id == "dnd5e") {
                setProperty(update, "system.equipped", false);
            }
            items.push(mergeObject(itemData, update));
            await this.object.setFlag('monks-enhanced-journal', 'items', items);
            return true;
        }
    }

    clickItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        event.currentTarget = li;

        let item = game.items.find(i => i.id == li.dataset.id)
        if (item == undefined && this.object.flags["monks-enhanced-journal"].actor) {
            let actorid = this.object.flags["monks-enhanced-journal"].actor.id;
            let actor = game.actors.get(actorid);
            if (actor)
                item = actor.items.get(li.dataset.id);
        }

        if (item)
            return item.sheet.render(true);
    }

    /*
    async alterItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        let action = target.dataset.action;
        $(target).toggleClass('active');

        let items = duplicate(this.object.flags["monks-enhanced-journal"]?.items || []);

        let item = items.find(i => i._id == li.dataset.id);
        if (item) {
            item[action] = !item[action];
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        }
    }*/

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (item) {
            let max = getProperty(item, "flags.monks-enhanced-journal.quantity");
            if (!game.user.isGM && (max != null && max <= 0)) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                return false;
            }

            let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
            if (!hasGM) {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTakeLootWithoutGM"));
                return false;
            }

            let result = await LootSheet.confirmQuantity(item, max, "take", false);
            if ((result?.quantity ?? 0) > 0) {
                if (game.user.isGM) {
                    LootSheet.purchaseItem.call(this, entry, id, result.quantity, { actor });
                    return result;
                } else {
                    if (entry.data.flags["monks-enhanced-journal"].purchasing == 'confirm') {
                        //create the chat message informaing the GM that player is trying to sell an item.
                        item = duplicate(item);
                        setProperty(item, "flags.monks-enhanced-journal.quantity", result.quantity);
                        setProperty(item, "flags.monks-enhanced-journal.maxquantity", (max != "" ? parseInt(max) : null));
                        delete item.cost;

                        LootSheet.createRequestMessage.call(this, entry, item, actor, false);
                        MonksEnhancedJournal.emit("notify", { actor: actor.name, item: item.name });
                    } else {
                        if (result.quantity > 0) {
                            MonksEnhancedJournal.emit("purchaseItem",
                                {
                                    shopid: entry.uuid,
                                    actorid: actor.id,
                                    itemid: id,
                                    quantity: result.quantity,
                                    user: game.user.id
                                });
                            return result;
                        }
                    }
                }
            }
        }

        return false;
    }

    /*
    async _onItemSummary(event) {
        event.preventDefault();

        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");

        let items = this.object.getFlag('monks-enhanced-journal', 'items');
        let itemData = items.find(i => i._id == id);

        const item = new CONFIG.Item.documentClass(itemData);
        let chatData = getProperty(item, "data.data.description");
        if (item.getChatData)
            chatData = item.getChatData({ secrets: false });

        if (chatData instanceof Promise)
            chatData = await chatData;

        if (chatData) {
            // Toggle summary
            if (li.hasClass("expanded")) {
                let summary = li.children(".item-summary");
                summary.slideUp(200, () => summary.remove());
            } else {
                let div = $(`<div class="item-summary">${(typeof chatData == "string" ? chatData : chatData.description.value || chatData.description)}</div>`);
                let props = $('<div class="item-properties"></div>');
                chatData.properties.forEach(p => props.append(`<span class="tag">${p.name || p}</span>`));
                if (chatData.price != undefined)
                    props.append(`<span class="tag">${i18n("MonksEnhancedJournal.Price")}: ${chatData.price}</span>`)
                div.append(props);
                li.append(div.hide());
                div.slideDown(200);
            }
            li.toggleClass("expanded");
        }
    }*/

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
                name: i18n("MonksEnhancedJournal.RemoveActor"),
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.attr('id');
                    Dialog.confirm({
                        title: i18n("MonksEnhancedJournal.RemoveActor"),
                        content: i18n("MonksEnhancedJournal.AreYouSureRemoveActor"),
                        yes: this.removeActor.bind(this, id)
                    });
                }
            }
        ];
    }
}
