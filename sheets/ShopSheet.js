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
        let groups = {};
        for (let sItem of data.data.flags['monks-enhanced-journal'].items || []) {
            if (sItem?.uuid?.indexOf('Actor') >= 0) //If the item info comes from the Actor, then ignore it, it will get picked up later
                continue;
            let entity = (sItem.uuid ? await fromUuid(sItem.uuid) : game.items.find((i) => i.id == sItem.id));
            if (entity) {
                let type = entity.type || 'unknown';

                let item = mergeObject({
                    id: entity.id,
                    uuid: entity.uuid,
                    name: entity.name,
                    type: type,
                    img: entity.img,
                    qty: entity.data.data.quantity,
                    price: parseFloat(entity.data.data?.price?.value || entity.data.data.price) || 0,
                    cost: parseFloat(entity.data.data?.price?.value || entity.data.data.price) || 0,
                    fromShop: true
                }, sItem);

                if (game.user.isGM || this.object.isOwner || (item.hide !== true && (item.qty > 0 || setting('show-zero-quantity')))) {
                    if (groups[type] == undefined)
                        groups[type] = { name: type, items: [] };
                    groups[type].items.push(item);
                }
            }
        }
        //get actor items
        if (data.data.flags['monks-enhanced-journal'].actor) {
            let id = data.data.flags['monks-enhanced-journal'].actor.id;
            let actor = game.actors.find(a => a.id == id);

            if (actor) {
                for (let aItem of actor.items) {
                    let type = aItem.type || 'unknown';

                    if (['feat', 'spell'].includes(type))
                        continue;

                    //let sItem = data.data.flags['monks-enhanced-journal'].items.find(i => i.uuid == aItem.uuid) || {};

                    let item = mergeObject({
                        id: aItem.id,
                        uuid: aItem.uuid,
                        type: aItem.type,
                        img: aItem.img,
                        name: aItem.name,
                        price: parseFloat(aItem.data.data?.price?.value || aItem.data.data.price) || 0,
                        cost: parseFloat(aItem.data.data?.price?.value || aItem.data.data.price) || 0,
                        qty: aItem.data.data.quantity,
                        fromShop: false
                    }, aItem.data.flags['monks-enhanced-journal']);


                    if (game.user.isGM || this.object.isOwner || (item.hide !== true && (item.qty > 0 || setting('show-zero-quantity')))) {
                        if (groups[type] == undefined)
                            groups[type] = { name: type, items: [] };
                        groups[type].items.push(item);
                    }
                }
            }
        }

        for (let [k, v] of Object.entries(groups)) {
            groups[k].items = groups[k].items.sort((a, b) => {
                if (a.name < b.name) return -1;
                return a.name > b.name ? 1 : 0;
            })
        }

        data.groups = groups;

        data.hideitems = (['hidden', 'visible'].includes(data.data.flags['monks-enhanced-journal'].purchasing) && !this.object.isOwner);
        data.showrequest = (data.data.flags['monks-enhanced-journal'].purchasing == 'confirm' && !this.object.isOwner);

        return data;
    }

    static get defaultObject() {
        return { items: [] };
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
        $('.item-lock', html).on('click', this.alterItem.bind(this));
        $('.item-hide', html).on('click', this.alterItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.item-name h4', html).click(this._onItemSummary.bind(this));

        $('.shop-state', html).change(this.changeState.bind(this));

        $('.request-item', html).prop('disabled', function () { return $(this).attr('locked') == 'true' }).click(this.requestItem.bind(this));

        let that = this;
/*
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
        });*/

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);
    }

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        let items = null;
        if (data.items) {
            for (let [k, v] of Object.entries(data.items)) {
                let values = (v instanceof Array ? v : [v]);
                if (items == undefined) {
                    items = values.map(item => { let obj = {}; obj[k] = (k == 'qty' ? parseInt(item) : (k == 'price' || k == 'cost' ? parseFloat(item) : item)); return obj; });
                } else {
                    for (let i = 0; i < values.length; i++) {
                        items[i][k] = (k == 'qty' ? parseInt(values[i]) : (k == 'price' || k == 'cost' ? parseFloat(values[i]) : values[i]));
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
        let uuid = li.dataset.uuid;
        let item;
        if (uuid.indexOf('Actor') >= 0) {
            item = await fromUuid(uuid);
            if (item == undefined || item.getFlag('monks-enhanced-journal', 'lock'))
                return;
            dragData.data = item?.data;
        } else {
            item = this.object.data.flags["monks-enhanced-journal"].items.find(i => i.uuid == uuid || i.id == id);
            if (item == undefined || (!game.user.isGM && (item?.lock === true || item.qty <= 0)))
                return;
        }

        dragData.id = id;
        dragData.uuid = this.object.uuid;
        dragData.pack = li.dataset.pack;
        dragData.type = "Item";

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

    async requestItem(event) {
        let li = $(event.currentTarget).closest("li")[0];
        let uuid = li.dataset.uuid;

        let item;
        if (uuid.indexOf('Actor') >= 0) {
            item = await fromUuid(uuid);
        } else {
            let id = li.dataset.id;
            item = this.object.data.flags['monks-enhanced-journal'].items.find(o => o.id == id);
        }

        if (!item)
            return;

        let speaker = ChatMessage.getSpeaker();
        let actor = game.actors.get(speaker.actor);

        let price = (item.data?.data?.price || item.price);
        let messageContent = {
            actor: { id: speaker.actor, name: actor.name, img: actor.img },
            items: [{ id: item.id, uuid: uuid, name: item.name, img: item.img, price: price, qty: 1, total: price }],
            shop: { id: this.object.id, name: this.object.name, img: this.object.img }
        }

        //create a chat message
        let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        whisper.push(game.user.id);
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

        let message = await ChatMessage.create(messageData, {});
    }

    async addItem(data) {
        let item = await this.getDocument(data);

        if (item.document) {
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

        if (li.dataset.uuid.indexOf('Actor') >= 0) {
            let item = await fromUuid(li.dataset.uuid);
            if (item) {
                let value = !item.getFlag('monks-enhanced-journal', action);
                item.setFlag('monks-enhanced-journal', action, value);
                this.object.setFlag('monks-enhanced-journal', 'items', items);  //use this to refresh the shop for the players
            }
        } else {
            let item = items.find(i => i.id == li.dataset.id);
            if (item) {
                item[action] = !item[action];
                this.object.setFlag('monks-enhanced-journal', 'items', items);
            }
        }
    }

    static itemDropped(id, actor) {
        let items = duplicate(this.getFlag('monks-enhanced-journal', 'items'));
        if (items) {
            let item = items.find(i => i.id == id);
            if (item) {
                if (game.user.isGM) {
                    item.qty = Math.max(item.qty - 1, 0);
                    this.setFlag('monks-enhanced-journal', 'items', items);
                } else {
                    MonksEnhancedJournal.emit("purchaseItem",
                        {
                            uuid: this.object.uuid,
                            itemid: id,
                            qty: 1
                        }
                    );
                }
            }
        }
    }

    async addActor(data) {
        let actor = await this.getDocument(data);

        if (actor.document) {
            this.object.setFlag("monks-enhanced-journal", "actor", actor.data);
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
                    Dialog.confirm({
                        title: `${game.i18n.localize("SIDEBAR.Delete")} Actor Link`,
                        content: i18n("MonksEnhancedJournal.ConfirmRemoveLink"),
                        yes: this.removeActor.bind(this)
                    });
                }
            }
        ];
    }

    async _onItemSummary(event) {
        event.preventDefault();

        let li = $(event.currentTarget).closest('li.item');

        const uuid = li.data("uuid");
        const item = await fromUuid(uuid);
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
