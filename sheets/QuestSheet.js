import { Objectives } from "../apps/objectives.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
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
                { dragSelector: ".objective-items .item-list .item", dropSelector: ".quest-container" }
            ],
            scrollY: [".objective-items", ".reward-items", ".description"]
        });
    }

    getData() {
        let data = super.getData();

        data.showtoplayers = this.object.data.permission["default"] >= CONST.ENTITY_PERMISSIONS.OBSERVER;

        data.statusOptions = {
            inactive: "MonksEnhancedJournal.unavailable",
            available: "MonksEnhancedJournal.available",
            completed: "MonksEnhancedJournal.completed",
            failed: "MonksEnhancedJournal.failed"
        };

        data.objectives = this.object.data.flags["monks-enhanced-journal"].objectives?.filter(o => {
            return this.object.isOwner || o.available;
        });

        data.useobjectives = setting('use-objectives');

        data.rewards = this.getRewardData();
        if (data.rewards.length)
            data.reward = this.getReward(data.rewards);

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

    convertRewards() {
        let currency = Object.keys(CONFIG[game.system.id.toUpperCase()]?.currencies || {}).reduce((a, v) => ({ ...a, [v]: this.object.data.flags["monks-enhanced-journal"][v] }), {});
        return [{
            id: makeid(),
            name: "Rewards",
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
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

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
        $('.assign-items', html).click(this.constructor.assignItems.bind(this));

        $('.item-refill', html).click(this.refillItems.bind(this));

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

    _getSubmitData(){
        let data = expandObject(super._getSubmitData());

        let items = null;
        if (data.reward?.items) {
            for (let [k, v] of Object.entries(data.reward.items)) {
                let values = (v instanceof Array ? v : [v]);
                if (items == undefined) {
                    items = values.map(item => { let obj = {}; obj[k] = (k == 'qty' || k == 'remaining' ? parseInt(item) : item); return obj; });
                } else {
                    for (let i = 0; i < values.length; i++) {
                        items[i][k] = (k == 'qty' || k == 'remaining' ? parseInt(values[i]): values[i]);
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
            data['flags.monks-enhanced-journal.rewards'] = rewards;
        }
        delete data.reward;

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
            data['flags.monks-enhanced-journal.objectives'] = oldobjectives;
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
        let currency = Object.keys(CONFIG[game.system.id.toUpperCase()]?.currencies || {}).reduce((a, v) => ({ ...a, [v]: 0 }), {});
        let reward = {
            id: makeid(),
            name: "Rewards",
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

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    _onDragStart(event) {
        const li = $(event.currentTarget).closest('.item')[0];
        let id = li.dataset.id;
        let uuid = li.dataset.uuid;

        const dragData = { from: 'monks-enhanced-journal' };

        if (li.dataset.document == 'Item') {
            let reward = this.getActiveReward();
            if (reward == undefined)
                return;

            let items = reward.items;
            let item = items.find(i => i.uuid == uuid || i.id == id);
            if (!game.user.isGM && (this.object.data.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }

            dragData.id = id;
            dragData.pack = li.dataset.pack;
            dragData.type = "Item";
            dragData.uuid = this.object.uuid;
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
            if (data.from == 'monks-enhanced-journal')  //don't drop on yourself
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
        }

        log('drop data', event, data);
    }

    async addItem(data) {
        let item = await this.getDocument(data);

        if (item.document) {
            let id = this.object.getFlag('monks-enhanced-journal', 'reward');

            let rewards = duplicate(this.getRewardData());
            let reward = rewards.find(r => r.id == id);
            if (reward == undefined) {
                reward = rewards[0];
                if (reward == undefined)
                    return;
            }

            let items = reward.items;

            let olditem = items.find(i => i.id == item.data.id);
            if (olditem) {
                olditem.qty++;
            } else {
                items.push(mergeObject(item.data, { remaining: 1 }));
            }
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

    static itemDropped(id, actor) {
        let rewards = duplicate(this.getFlag('monks-enhanced-journal', 'rewards'));
        for (let reward of rewards) {
            let items = reward.items;
            if (items) {
                let item = items.find(i => i.id == id);
                if (item) {
                    item.received = actor.name;
                    item.assigned = true;
                    item.remaining = Math.max(item.remaining - 1, 0);
                    this.setFlag('monks-enhanced-journal', 'rewards', rewards);
                    return;
                }
            }
        }
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
        let actor = await this.getDocument(data);

        if (actor.document) {
            this.object.update({ 'flags.monks-enhanced-journal.actor': actor.data, 'flags.monks-enhanced-journal.source' : actor.data.name});
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

    refillItems(event) {
        let rewards = duplicate(this.getRewardData());
        let reward = this.getReward(rewards) || rewards[0];
        if (reward == undefined)
            return;
        let items = reward.items;

        let li = $(event.currentTarget).closest('li')[0];
        let item = items.find(i => i.id == li.dataset.id);
        if (item) {
            item.remaining = item.qty;
            this.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
        }
    }

    static async assignItems() {
        let actor = game.actors.get(setting("assign-actor"));

        if (!actor) {
            ui.notifications.warn(`No Actor selected to assign items to, please Right Click and Actor to set it as the actor to assign items to`);
            return;
        }

        if (actor) {
            let rewards = duplicate(this.getFlag('monks-enhanced-journal', 'rewards'));
            let reward = rewards.find(r => r.active) || rewards[0];
            if (reward == undefined)
                return;
            let items = reward.items;

            let itemData = [];
            let names = [];
            for (let item of items) {
                //add item to actor, including quantity
                if (item.remaining > 0) {
                    let document;
                    if (item.pack) {
                        const pack = game.packs.get(item.pack);
                        if (pack) {
                            document = await pack.getDocument(item.id);
                        }
                    } else {
                        document = game.items.get(item.id);
                    }

                    if (!document)
                        continue;

                    let data = document.toObject();
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
                this.setFlag('monks-enhanced-journal', 'rewards', rewards);
                ui.notifications.info(`Items [${names.join(', ')}] added to ${actor.name}`);
            } else
                ui.notifications.info(`No items added, either there were no items attached to this quest or none of them had any quantity.`);
        }
    }
}
