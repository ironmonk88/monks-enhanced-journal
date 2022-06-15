import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';

export class MakeOffering extends FormApplication {
    constructor(object, journalsheet, options = {}) {
        super(object, options);

        this.journalsheet = journalsheet;
        this.offering = mergeObject({
            currency: {},
            items: []
        }, options.offering || {});

        if (game.user.character)
            this.offering.actorId = game.user.character.id;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "make-offering",
            classes: ["form", "make-offering"],
            title: i18n("MonksEnhancedJournal.MakeOffering"),
            template: "modules/monks-enhanced-journal/templates/make-offering.html",
            dragDrop: [
                { dropSelector: ".make-offer-container" }
            ],
            width: 600,
            height: 'auto'
        });
    }

    getData(options) {
        let data = super.getData(options);

        data.private = this.offering.hidden;

        data.currency = MonksEnhancedJournal.currencies.map(c => { return { id: c.id, name: c.name }; });

        data.coins = this.offering.currency;
        data.items = (this.offering.items || []).map(i => {
            let actor = game.actors.get(i.actorId)
            if (!actor)
                return null;

            let item = actor.data.items.get(i.id);
            if (!item)
                return null;

            return {
                id: i.id,
                name: item.name,
                img: item.img,
                qty: i.qty
            }
        }).filter(i => !!i);

        let actor = game.actors.get(this.offering?.actor?.id);
        data.actor = {
            id: actor?.id,
            name: actor?.name || "No Actor",
            img: actor?.img || "icons/svg/mystery-man.svg"
        };

        return data;
    }

    /* -------------------------------------------- */

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'Item') {
            let item = new CONFIG.Item.documentClass(data.data);
            let max = this.journalsheet.getValue(item.data, quantityname(), null);
            if (!data.actorId)
                max = null;

            //Only allow items from an actor
            if (!data.actorId)
                return;

            this.offering.actorId = data.actorId;

            let result = await this.journalsheet.constructor.confirmQuantity(item, max, "offer", false);
            if ((result?.quantity ?? 0) > 0) {
                //let itemData = item.toObject();
                //this.setValue(itemData, quantityname(), result.quantity);
                let actor = game.actors.get(data.actorId);

                this.offering.items.push({
                    id: item.id,
                    itemName: item.name,
                    actorId: data.actorId,
                    actorName: actor.name,
                    qty: result.quantity
                });
                this.render();
            }
        } else if (data.type == "Actor") {
            let actor = game.actors.get(data.id);

            this.offering.actor = {
                id: data.id,
                name: actor.name,
                img: actor.img
            }
            this.render();
        }

        log('drop data', event, data);
    }

    /** @override */
    async _updateObject(event, formData) {
        this.offering.userid = game.user.id;
        this.offering.state = "offering";

        if (game.user.isGM || this.object.isOwner) {
            let offerings = duplicate(this.object.getFlag("monks-enhanced-journal", "offerings") || []);
            this.offering.id = makeid();
            offerings.unshift(this.offering);
            await this.object.setFlag("monks-enhanced-journal", "offerings", offerings);
        } else {
            MonksEnhancedJournal.emit("makeOffering", { offering: this.offering, entryid: this.object.id });
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        let that = this;
        new ContextMenu($(html), ".offering-item", [
            {
                name: "Remove Offering",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    const id = li.data("id");
                    Dialog.confirm({
                        title: `Remove Offering Item`,
                        content: "Are you sure you want to remove this item from the offering?",
                        yes: () => {
                            that.offering.items.findSplice(i => i.id == id);
                            that.render();
                        }
                    });
                }
            }
        ]);

        $('.cancel-offer', html).on("click", this.close.bind(this));
        $('.private', html).on("change", (event) => {
            this.offering.hidden = $(event.currentTarget).prop("checked");
        });
        $('.currency-field', html).on("blur", (event) => {
            this.offering.currency[$(event.currentTarget).attr("name")] = parseInt($(event.currentTarget).val() || 0);
        });
    }
}