import { Objectives } from "../apps/objectives.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class QuestSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        if (this.object.data.flags["monks-enhanced-journal"].status == undefined && this.object.data.flags["monks-enhanced-journal"].completed)
            this.object.data.flags["monks-enhanced-journal"].status = 'completed';
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.quest"),
            template: "modules/monks-enhanced-journal/templates/quest.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".quest-container" },
                { dragSelector: ".document.item", dropSelector: ".quest-container" },
                { dragSelector: ".reward-items .item-list .item .item-name", dropSelector: "null" },
                { dragSelector: ".objective-items .item-list .item", dropSelector: ".quest-container" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".objective-items", ".reward-container", ".tab.description .tab-inner"]
        });
    }

    async getData() {
        let data = super.getData();

        data.showtoplayers = this.object.data.permission["default"] >= CONST.ENTITY_PERMISSIONS.OBSERVER;

        data.statusOptions = {
            inactive: "MonksEnhancedJournal.queststatus.unavailable",
            available: "MonksEnhancedJournal.queststatus.available",
            completed: "MonksEnhancedJournal.queststatus.completed",
            failed: "MonksEnhancedJournal.queststatus.failed"
        };

        data.objectives = duplicate(this.object.data.flags["monks-enhanced-journal"].objectives || [])?.filter(o => {
            return this.object.isOwner || o.available;
        }).map(o => {
            let counter = { counter: ($.isNumeric(o.required) ? (o.done || 0) + '/' + o.required : '') };
            
            if (!this.object.isOwner) {
                let content = $("<div>").html(o.content);
                $("section.secret", content).remove();
                o.content = content[0].innerHTML;
            }
            return mergeObject(o, counter);
        });

        data.useobjectives = setting('use-objectives');

        data.rewards = this.getRewardData();
        if (data.rewards.length) {
            data.reward = this.getReward(data.rewards);
        }

        data.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: data.reward?.currency[c.id] ?? 0 };
        });

        data.valStr = (['pf2e'].includes(game.system.id) ? ".value" : "");
        data.quantityname = quantityname();

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

    getRewardData() {
        let rewards;

        if (this.object.data.flags["monks-enhanced-journal"].rewards == undefined &&
                (this.object.data.flags["monks-enhanced-journal"].items != undefined ||
            this.object.data.flags["monks-enhanced-journal"].xp != undefined ||
            this.object.data.flags["monks-enhanced-journal"].additional != undefined)) {

            rewards = this.convertRewards();
            this.object.data.flags['monks-enhanced-journal'].reward = rewards[0].id;
            this.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
            this.object.setFlag('monks-enhanced-journal', 'reward', rewards[0].id);
        } else {
            rewards = this.object.data.flags["monks-enhanced-journal"].rewards || [];
            rewards = rewards.map(reward => {
                if (reward.currency instanceof Array)
                    reward.currency = reward.currency.reduce((a, v) => ({ ...a, [v.name]: v.value }), {});
                return reward;
            });
        }

        return rewards;
    }

    get allowedRelationships() {
        return ['person', 'quest'];
    }

    convertRewards() {
        let currency = MonksEnhancedJournal.currencies.reduce((a, v) => ({ ...a, [v.id]: this.object.data.flags["monks-enhanced-journal"][v.id] }), {});
        return [{
            id: makeid(),
            name: i18n("MonksEnhancedJournal.Rewards"),
            active: true,
            items: this.object.data.flags["monks-enhanced-journal"].items,
            xp: this.object.data.flags["monks-enhanced-journal"].xp,
            additional: this.object.data.flags["monks-enhanced-journal"].additional,
            currency: currency,
            hasCurrency: Object.keys(currency).length > 0
        }];
    }

    getActiveReward() {
        let rewards = this.getRewardData();
        if (!rewards || rewards.length == 0)
            return;

        return rewards.find(r => r.active) || rewards[0];
    }

    getReward(rewards) {
        let id = this.object.getFlag('monks-enhanced-journal', 'reward') || 0;
        let reward = rewards.find(r => r.id == id);
        if (reward == undefined && rewards.length > 0) {
            reward = rewards[0];
            this.object.setFlag('monks-enhanced-journal', 'reward', reward.id);
        }

        reward.groups = this.getItemGroups(reward);

        return reward;
    }

    static get defaultObject() {
        return { rewards: [], objectives: [], seen: false, status: 'inactive' };
    }

    get type() {
        return 'quest';
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

        let that = this;

        $('.objective-create', html).on('click', $.proxy(this.createObjective, this));
        $('.objective-edit', html).on('click', $.proxy(this.editObjective, this));
        $('.objective-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.show-to-players', html).click(this.changePermissions.bind(this));

        $('.assign-xp', html).on('click', function (event) {
            if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
                game.MonksTokenBar.assignXP(null, { xp: that.object.getFlag('monks-enhanced-journal', 'xp') });
            }
        });

        $('.reward-list .journal-tab .tab-content', html).click(this.changeReward.bind(this));
        $('.reward-list .journal-tab .close', html).click(this.deleteReward.bind(this));
        $('.reward-list .tab-add', html).click(this.addReward.bind(this));
        $('.assign-items', html).click(this.constructor.assignItems.bind(this.object));

        $('.item-refill', html).click(this.refillItems.bind(this));
        $('.item-edit', html).on('click', this.editItem.bind(this));
        $('.item-delete', html).on('click', this._deleteItem.bind(this));
        $('.item-action', html).on('click', this.alterItem.bind(this));

        $('.item-hide', html).on('click', this.alterItem.bind(this));

        $('.roll-table', html).click(this.rollTable.bind(this, "items", false));
        $('.item-name h4', html).click(this._onItemSummary.bind(this));

        $('.items-list .actor-icon', html).click(this.openRelationship.bind(this));

        $('.item-relationship .item-field', html).on('change', this.alterRelationship.bind(this));

        $('.items-header', html).on("click", this.collapseItemSection.bind(this));
        $('.refill-all', html).click(this.refillItems.bind(this, 'all'));

        const actorOptions = this._getPersonActorContextOptions();
        if (actorOptions) new ContextMenu($(html), ".actor-img", actorOptions);
    }

    /*async _onSubmit(ev) {
        let data = expandObject(super._getSubmitData());

        let items = null;
        if (data.reward.items) {
            for (let [k, v] of Object.entries(data.reward.items)) {
                let values = (v instanceof Array ? v : [v]);
                if (items == undefined) {
                    items = values.map(item => { let obj = {}; obj[k] = item; return obj; });
                } else {
                    for (let i = 0; i < values.length; i++) {
                        items[i][k] = values[i];
                    }
                }
            }
            delete data.reward.items;
        }

        //save the reward data
        let rewards = duplicate(this.getRewardData());
        let reward = this.getReward(rewards);//rewards.find(r => r.id == this.object.getFlag('monks-enhanced-journal', 'reward'));
        if (reward) {
            if (items) {
                for (let item of items) {
                    let olditem = reward.items.find(i => i.id == item.id);
                    if (olditem) {
                        olditem = Object.assign(olditem, item);
                        if (!olditem.assigned && olditem.received)
                            delete olditem.received;
                    }
                    else
                        reward.items.push(item);
                }
            }

            if (!reward.active && data.reward.active) {
                //make sure there's only one active reward
                for (let r of rewards)
                    r.active = false;
            }
            reward = mergeObject(reward, data.reward);
            //$('.reward-list .journal-tab[data-reward-id="' + reward.id + '"] .tab-content', this.element).html(reward.name);
            await this.object.setFlag("monks-enhanced-journal", "rewards", rewards);
        }

        let objectives = null;
        if (data.objectives) {
            for (let [k, v] of Object.entries(data.objectives)) {
                let values = (v instanceof Array ? v : [v]);
                if (objectives == undefined) {
                    objectives = values.map(objective => { let obj = {}; obj[k] = objective; return obj; });
                } else {
                    for (let i = 0; i < values.length; i++) {
                        objectives[i][k] = values[i];
                    }
                }
            }
            delete data.objectives;
        }

        if (objectives) {
            let oldobjectives = duplicate(this.object.getFlag('monks-enhanced-journal', 'objectives'));
            for (let objective of objectives) {
                let oldobj = oldobjectives.find(i => i.id == objective.id);
                if (oldobj)
                    oldobj = Object.assign(oldobj, objective);
                else
                    oldobjectives.push(objective);
            }
            await this.object.setFlag("monks-enhanced-journal", "objectives", oldobjectives);
        }

        return await super._onSubmit(ev);
    }*/

    _getSubmitData(updateData = {}) {
        let data = expandObject(super._getSubmitData(updateData));

        if (data.reward) {
            let rewardid = Object.keys(data.reward)[0];
            data.flags['monks-enhanced-journal'].rewards = duplicate(this.getRewardData() || []);
            for (let reward of data.flags['monks-enhanced-journal'].rewards) {
                let dataReward = data.reward[reward.id];
                let olditems = duplicate(reward.items);
                reward = mergeObject(reward, dataReward);
                reward.items = olditems;
                if (reward.items && dataReward) {
                    for (let item of reward.items) {
                        let dataItem = dataReward.items[item._id];
                        if (dataItem)
                            item = mergeObject(item, dataItem);
                        if (!item.assigned && item.received)
                            delete item.received;
                    }
                }

                if (reward.active && reward.id != rewardid)
                    reward.active = false;
            }
            delete data.reward;
        }

        if (data.objectives) {
            data.flags['monks-enhanced-journal'].objectives = duplicate(this.object.getFlag("monks-enhanced-journal", "objectives") || []);
            if (data.flags['monks-enhanced-journal'].objectives) {
                for (let objective of data.flags['monks-enhanced-journal'].objectives) {
                    let dataObj = data.objectives[objective.id];
                    if (dataObj)
                        objective = mergeObject(objective, dataObj);
                }
            }
            delete data.objectives;
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

    async changeReward(event) {
        if (event == undefined)
            return;
        let id = (typeof event == 'string' ? event : $(event.currentTarget).closest('.reward-tab').data('rewardId'));

        this.object.setFlag('monks-enhanced-journal', 'reward', id);
        //this.loadRewards(id);
        //this.render(true);
    }

    async addReward() {
        let rewards = duplicate(this.getRewardData());
        let currency = MonksEnhancedJournal.currencies.reduce((a, v) => ({ ...a, [v.id]: 0 }), {});
        let reward = {
            id: makeid(),
            name: i18n("MonksEnhancedJournal.Rewards"),
            xp: "",
            additional: "",
            currency: currency,
            items: [],
        };
        rewards.push(reward);
        await this.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
        /*$('<div>').addClass("journal-tab reward-tab flexrow").attr({ 'data-reward-id': reward.id, title: reward.name })
            .append($('<div>').addClass('tab-content').html(reward.name).click(this.changeReward.bind(this)))
            .append($('<div>').addClass('close').html('<i class="fas fa-times"></i>').click(this.deleteReward.bind(this)))
            .insertBefore($('.tab-row .tab-add', this.element));*/

        this.changeReward(reward.id);
    }

    deleteReward(event) {
        let id = $(event.currentTarget).closest('.reward-tab').data('rewardId');

        let rewards = duplicate(this.getRewardData());
        rewards.findSplice(r => r.id == id);
        this.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
        //$('.reward-list .journal-tab[data-reward-id="' + id + '"]').remove();

        if (id == this.object.getFlag('monks-enhanced-journal', 'reward')) {
            let newid = rewards[0]?.id;
            this.changeReward(newid);
        }
    }

    /*
    async loadRewards(id) {
        if (id == undefined)
            id = this.object.getFlag('monks-enhanced-journal', 'reward');

        $('.reward-container', this.element).empty();

        let rewards = this.getRewardData();
        let reward = rewards.find(r => r.id == id);
        if (reward == undefined) {
            reward = rewards[0];
            if (reward == undefined)
                return;
            await this.object.setFlag('monks-enhanced-journal', 'reward', reward.id);
        }
        let template = "modules/monks-enhanced-journal/templates/reward.html";

        let html = await renderTemplate(template, reward);
        html = $(html);

        $('.reward-list .journal-tab[data-reward-id="' + id + '"]', this.element).addClass('active').siblings().removeClass('active');

        $('.reward-container', this.element).append(html);

        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.assign-items', html).click(this.assignItems.bind(this));
    }*/

    /*
    async render(data) {
        let element = await super.render(data);

        await this.loadRewards(0);

        return element;
    }

    async refresh() {
        await this.loadRewards(0);
    }*/

    deleteItem(id, container) {
        if (container == 'items') {
            let rewards = duplicate(this.object.data.flags["monks-enhanced-journal"].rewards);
            let reward = rewards.find(r => r.id == this.object.data.flags["monks-enhanced-journal"].reward);
            reward.items.findSplice(i => i.id == id || i._id == id);
            this.object.setFlag('monks-enhanced-journal', "rewards", rewards);
        } else
            super.deleteItem(id, container);
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    _onDragStart(event) {
        if ($(event.currentTarget).hasClass("sheet-icon"))
            return super._onDragStart(event);

        const li = $(event.currentTarget).closest('.item')[0];
        let id = li.dataset.id;
        let uuid = li.dataset.uuid;

        const dragData = { from: 'monks-enhanced-journal' };

        if (li.dataset.document == 'Item') {
            let reward = this.getActiveReward();
            if (reward == undefined)
                return;

            let items = reward.items;
            let item = items.find(i => i._id == id);
            if (!game.user.isGM && (this.object.data.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }

            dragData.id = id;
            dragData.pack = li.dataset.pack;
            dragData.type = "Item";
            dragData.journalid = this.object.id;
            dragData.data = item;
        } else if (li.dataset.document == 'Objective') {
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
            if (data.from == this.object.id)  //don't drop on yourself
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
        } else if (data.type == 'JournalEntry') {
            this.addRelationship(data);
        }

        log('drop data', event, data);
    }

    async addItem(data) {
        let item = await this.getDocument(data);

        if (item) {
            let id = this.object.getFlag('monks-enhanced-journal', 'reward');

            let itemData = item.toObject();
            if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                itemData = await QuestSheet.createScrollFromSpell(itemData);
            }

            let rewards = duplicate(this.getRewardData());
            let reward = rewards.find(r => r.id == id);
            if (reward == undefined) {
                reward = rewards[0];
                if (reward == undefined)
                    return;
            }

            let items = reward.items;

            let update = { _id: makeid(), data: { remaining: 1, equipped: false } };
            update[quantityname()] = item.data.data[quantityname()];
            this.setValue(update, quantityname(), 1);
            items.push(mergeObject(itemData, update));
            this.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
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
        TextEditor._onClickContentLink(event);
    }

    static async itemDropped(id, actor, entry) {
        let rewards = entry.getFlag('monks-enhanced-journal', 'rewards');
        for (let reward of rewards) {
            let items = reward.items;
            if (items) {
                let item = items.find(i => i._id == id);
                if (item) {
                    let max = this.getValue(item, "remaining", null);
                    let result = await QuestSheet.confirmQuantity(item, max, "transfer", false);
                    if ((result?.quantity ?? 0) > 0) {
                        if (item.data.remaining < result?.quantity) {
                            ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                            return false;
                        }

                        this.purchaseItem.call(this, entry, id, result.quantity, { actor, remaining: true });
                        return result;
                    }
                }
            }
        }
        return false;
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
        let actor = await this.getItemData(data);

        if (actor) {
            this.object.update({ 'flags.monks-enhanced-journal.actor': actor, 'flags.monks-enhanced-journal.source' : actor.name});
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
                        title: `${game.i18n.localize("SIDEBAR.Delete")} ${i18n("MonksEnhancedJournal.ActorLink")}`,
                        content: i18n("MonksEnhancedJournal.ConfirmRemoveLink"),
                        yes: this.removeActor.bind(this)
                    });
                }
            }
        ];
    }

    refillItems(event) {
        let rewards = duplicate(this.getRewardData());
        let reward = this.getReward(rewards) || rewards[0];
        if (reward == undefined)
            return;
        let items = reward.items;

        if (event == 'all') {
            for (let item of items) {
                item.data.remaining = this.getValue(item, quantityname());
            }
            this.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
        } else {
            let li = $(event.currentTarget).closest('li')[0];
            let item = items.find(i => i._id == li.dataset.id);
            if (item) {
                item.data.remaining = this.getValue(item, quantityname());
                this.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
            }
        }
    }

    static async assignItems() {
        let rewards = duplicate(this.getFlag('monks-enhanced-journal', 'rewards'));
        let reward = rewards.find(r => r.active) || rewards[0];
        if (reward == undefined)
            return;

        reward.items = await super.assignItems(reward.items, reward.currency);
        for(let key of Object.keys(reward.currency))
            reward.currency[key] = 0;

        this.setFlag('monks-enhanced-journal', 'rewards', rewards);
    }

    async _onItemSummary(event) {
        event.preventDefault();

        let li = $(event.currentTarget).closest('li.item');

        const id = li.data("id");
        let reward = this.getActiveReward();
        let itemData = (reward?.items || []).find(i => i._id == id);
        if (!itemData)
            return;

        let item = new CONFIG.Item.documentClass(itemData);
        let chatData = getProperty(item, "data.data.description");
        if (item.getChatData)
            chatData = item.getChatData({ secrets: false });

        // Toggle summary
        if (li.hasClass("expanded")) {
            let summary = li.children(".item-summary");
            summary.slideUp(200, () => summary.remove());
        } else {
            let div = $(`<div class="item-summary">${(typeof chatData == "string" ? chatData : chatData.description.value || chatData.description)}</div>`);
            let props = $('<div class="item-properties"></div>');
            chatData.properties.forEach(p => props.append(`<span class="tag">${p.name || p}</span>`));
            div.append(props);
            li.append(div.hide());
            div.slideDown(200);
        }
        li.toggleClass("expanded");
    }
}
