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
                { dragSelector: ".document.actor", dropSelector: ".place-container" },
                { dragSelector: ".document.item", dropSelector: ".place-container" }],
            scrollY: [".tab.details .tab-inner", ".tab.townsfolk .tab-inner", ".tab.shops .tab-inner", ".tab.description .tab-inner"]
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
            if (t.type?.toLowerCase() == 'actor')
                actor = game.actors.find(a => a.id == t.id)
            else if (t.type?.toLowerCase() == 'journal' || t.type?.toLowerCase() == 'journalentry')
                actor = game.journal.find(a => a.id == t.id)
            if (!actor || !actor.testUserPermission(game.user, "LIMITED"))
                return null;
            return mergeObject(t, {
                img: actor?.data.img,
                name: actor?.name,
                role: foundry.utils.getProperty(actor, "data.flags.monks-enhanced-journal.role")
            });
        }).filter(t => t);

        data.shops = data.data.flags['monks-enhanced-journal'].shops?.map(s => {
            let shop = game.journal.find(a => a.id == s.id)
            if (!shop || !shop.testUserPermission(game.user, "LIMITED"))
                return null;
            return mergeObject(s, {
                img: shop?.data.img,
                name: shop?.name,
                shoptype: foundry.utils.getProperty(shop, "data.flags.monks-enhanced-journal.shoptype")
            });
        }).filter(s => s);

        return data;
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

    async addActor(data) {
        let actor = mergeObject(await this.getItemData(data), { type: 'Actor' });

        if (actor) {
            let actors = duplicate(this.object.data.flags["monks-enhanced-journal"].actors || []).filter(t => t.type);

            //only add one item
            if (actors.find(t => t.id == actor.id) != undefined)
                return;

            actors.push(actor);
            this.object.setFlag('monks-enhanced-journal', 'actors', actors);
        }
    }

    async addShop(data) {
        let shop = await this.getItemData(data);

        if (shop) {
            if (shop.type == 'shop') {
                let shops = duplicate(this.object.data.flags["monks-enhanced-journal"].shops || []);

                //only add one item
                if (shops.find(t => t.id == shop.id) != undefined)
                    return;

                shops.push(shop);
                this.object.setFlag("monks-enhanced-journal", "shops", shops);
            } else if (shop.type == 'person') {
                let actors = duplicate(this.object.data.flags["monks-enhanced-journal"].actors || []);

                //only add one item
                if (actors.find(t => t.id == shop.id) != undefined)
                    return;

                actors.push(mergeObject(shop, { type: 'JournalEntry' }));
                this.object.setFlag('monks-enhanced-journal', 'actors', actors);
            }
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
