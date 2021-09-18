import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class PlaceSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.place"),
            template: "modules/monks-enhanced-journal/templates/place.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".entity.actor", dropSelector: ".place-container" },
                { dragSelector: ".entity.item", dropSelector: ".place-container" }],
            scrollY: [".tab.details", ".tab.townsfolk", ".tab.shops"]
        });
    }

    get type() {
        return 'place';
    }

    fieldlist() {
        return {
            'age': { name: "MonksEnhancedJournal.Age", value: true },
            'size': { name: "MonksEnhancedJournal.Size", value: true },
            'government': { name: "MonksEnhancedJournal.Government", value: true },
            'alignment': { name: "MonksEnhancedJournal.Alignment", value: false },
            'faction': { name: "MonksEnhancedJournal.Faction", value: false },
            'inhabitants': { name: "MonksEnhancedJournal.Inhabitants", value: true },
            'districts': { name: "MonksEnhancedJournal.Districts", value: false },
            'agricultural': { name: "MonksEnhancedJournal.Agricultural", value: false },
            'cultural': { name: "MonksEnhancedJournal.Cultural", value: false },
            'educational': { name: "MonksEnhancedJournal.Educational", value: false },
            'indistrial': { name: "MonksEnhancedJournal.Industrial", value: false },
            'mercantile': { name: "MonksEnhancedJournal.Mercantile", value: false },
            'military': { name: "MonksEnhancedJournal.Military", value: false }
        };
    }

    static get defaultObject() {
        return { shops: [], townsfolk: [] };
    }

    getData() {
        let data = super.getData();

        if (data?.data?.flags['monks-enhanced-journal']?.townsfolk) {
            data.data.flags['monks-enhanced-journal'].actors = data?.data?.flags['monks-enhanced-journal']?.townsfolk;
            this.object.setFlag('monks-enhanced-journal', 'actors', data.data.flags['monks-enhanced-journal'].actors);
            this.object.unsetFlag('monks-enhanced-journal', 'townsfolk');
        }

        data.townsfolk = data.data.flags['monks-enhanced-journal'].actors?.map(t => {
            let actor;
            if (t.type.toLowerCase() == 'actor')
                actor = game.actors.find(a => a.id == t.id)
            else if (t.type.toLowerCase() == 'journal' || t.type.toLowerCase() == 'journalentry')
                actor = game.journal.find(a => a.id == t.id)
            if (!actor)
                return null;
            return mergeObject(t, {
                img: actor?.data.img,
                name: actor?.name,
                role: foundry.utils.getProperty(actor, "data.flags.monks-enhanced-journal.role")
            });
        }).filter(t => t);

        data.shops = data.data.flags['monks-enhanced-journal'].shops?.map(s => {
            let shop = game.journal.find(a => a.id == s.id)
            if (!shop)
                return null;
            return mergeObject(s, {
                img: shop?.data.img,
                name: shop?.name,
                shoptype: foundry.utils.getProperty(shop, "data.flags.monks-enhanced-journal.shoptype")
            });
        }).filter(s => s);

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

        $('.townsfolk .actor-icon', html).click(this.openActor.bind(this));
        $('.shop-icon', html).click(this.openShop.bind(this));

        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
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
        } else if (data.type == 'JournalEntry') {
            this.addShop(data);
        }

        log('drop data', event, data);
    }

    /*
    _deleteItem(event) {
        let item = event.currentTarget.closest('.item');
        this.deleteItem(item.dataset.id, item.dataset.container);
    }

    deleteItem(id, container) {
        this.object.data.flags["monks-enhanced-journal"][container].findSplice(i => i.id == id);
        let parent = $(`li[data-id="${id}"]`, this.element).parent();
        $(`li[data-id="${id}"]`, this.element).remove();
        if (parent.children().length == 0) {
            parent.prev().remove();
            parent.remove();
        }

        MonksEnhancedJournal.journal.saveData();
    }*/

    async addActor(data) {
        let actor = await this.getEntity(mergeObject(data, { type: 'Actor' }));

        if (actor.entity) {
            let actors = duplicate(this.object.data.flags["monks-enhanced-journal"].actors || []);

            //only add one item
            if (actors.find(t => t.id == actor.data.id) != undefined)
                return;

            actors.push(actor.data);
            this.object.setFlag('monks-enhanced-journal', 'actors', actors);
        }
        /*
        let actor;
        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            actor = id ? await pack.getDocument(id) : null;
        } else {
            actor = game.actors.get(data.id);
            if (actor.documentName === "Scene" && actor.journal) actor = actor.journal;
            if (!actor.testUserPermission(game.user, "LIMITED")) {
                return ui.notifications.warn(`You do not have permission to view this ${actor.documentName} sheet.`);
            }
        }

        if (actor)
            this.createTownsfolk(actor, 'actor');*/
    }
    /*
    createTownsfolk(actor, type) {
        let actorData = {
            id: actor.id,
            type: type
        };

        if (actor.pack)
            actorData.pack = actor.pack;

        if (this.object.data.flags["monks-enhanced-journal"].townsfolk == undefined)
            this.object.data.flags["monks-enhanced-journal"].townsfolk = [];

        //only add one item
        if (this.object.data.flags["monks-enhanced-journal"].townsfolk.find(t => t.id == actorData.id) != undefined)
            return;

        this.object.data.flags["monks-enhanced-journal"].townsfolk.push(actorData);
        MonksEnhancedJournal.journal.saveData();
        this.render();
    }*/

    async addShop(data) {
        /*
        let shop;
        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            shop = id ? await pack.getDocument(id) : null;
        } else {
            shop = game.journal.get(data.id);
            if (!shop.testUserPermission(game.user, "LIMITED")) {
                return ui.notifications.warn(`You do not have permission to view this ${shop.documentName} sheet.`);
            }
        }*/

        let shop = await this.getEntity(data);

        if (shop.entity) {
            if (shop.entity.data.flags['monks-enhanced-journal']?.type == 'shop') {
                let shops = duplicate(this.object.data.flags["monks-enhanced-journal"].shops || []);

                //only add one item
                if (shops.find(t => t.id == shop.data.id) != undefined)
                    return;

                shops.push(shop.data);
                this.object.setFlag("monks-enhanced-journal", "shops", shops);
            } else if (shop.entity.data.flags['monks-enhanced-journal']?.type == 'person') {
                let actors = duplicate(this.object.data.flags["monks-enhanced-journal"].actors || []);

                //only add one item
                if (actors.find(t => t.id == shop.data.id) != undefined)
                    return;

                actors.push(mergeObject(shop.data, { type: 'JournalEntry' }));
                this.object.setFlag('monks-enhanced-journal', 'actors', actors);
            }
            /*
            let shopdata = {
                id: shop.id
            };

            if (data.pack)
                shopdata.pack = data.pack;

            if (this.object.data.flags["monks-enhanced-journal"].shops == undefined)
                this.object.data.flags["monks-enhanced-journal"].shops = [];

            //only add one item
            if (this.object.data.flags["monks-enhanced-journal"].shops.find(t => t.id == shopdata.id) != undefined)
                return;

            this.object.data.flags["monks-enhanced-journal"].shops.push(shopdata);
            MonksEnhancedJournal.journal.saveData();
            this.render();
        } else if (shop.data.flags['monks-enhanced-journal']?.type == 'person') {
            this.createTownsfolk(shop, 'journal');
        }*/
        }
    }

    openActor(event) {
        let item = event.currentTarget.closest('.item');
        let townsfolk = this.object.getFlag('monks-enhanced-journal', 'actors').find(a => a.id == item.dataset.id);
        if (townsfolk.type.toLowerCase() == 'actor') {
            let actor = game.actors.find(a => a.id == townsfolk.id);
            this.open(actor);
        } else if (townsfolk.type.toLowerCase() == 'journal' || townsfolk.type.toLowerCase() == 'journalentry') {
            let person = game.journal.find(s => s.id == townsfolk.id);
            this.open(person);
        }
    }

    openShop(event) {
        let item = event.currentTarget.closest('.item');
        let shop = game.journal.find(s => s.id == item.dataset.id);
        this.open(shop);
    }
}
