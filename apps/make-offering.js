import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';
import { getValue, setValue } from "../helpers.js";

export class MakeOffering extends FormApplication {
    constructor(object, journalsheet, options = {}) {
        super(object, options);

        this.journalsheet = journalsheet;
        this.offering = foundry.utils.mergeObject({
            currency: {},
            items: []
        }, options.offering || {});

        if (game.user.character && !this.offering.actor) {
            this.offering.actor = {
                id: game.user.character.id,
                name: game.user.character.name,
                img: game.user.character.img
            }
        }
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "make-offering",
            classes: ["form", "make-offering", "monks-journal-sheet", "dialog"],
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

        data.currency = MonksEnhancedJournal.currencies.filter(c => c.convert != null).map(c => { return { id: c.id, name: c.name }; });

        data.coins = this.offering.currency;
        data.items = (this.offering.items || []).map(i => {
            let actor = game.actors.get(i.actorId)
            if (!actor)
                return null;

            let item = actor.items.get(i.id);
            if (!item)
                return null;

            let details = MonksEnhancedJournal.getDetails(item);

            return {
                id: i.id,
                name: game.user.isGM ? details.identifiedName : details.name,
                img: details.img,
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

    _canDragDrop() {
        return true;
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
            let item = await fromUuid(data.uuid);
            let actor = item.parent;

            //Only allow items from an actor
            if (!actor || actor.compendium)
                return;

            let max = getValue(item.system, quantityname(), null);

            this.offering.actor = {
                id: actor.id,
                name: actor.name,
                img: actor.img
            }

            let result = await this.journalsheet.constructor.confirmQuantity(item, max, "offer", false);
            if ((result?.quantity ?? 0) > 0) {

                this.offering.items.push({
                    id: item.id,
                    itemName: item.name,
                    actorId: actor.id,
                    actorName: actor.name,
                    qty: result.quantity
                });
                this.render();
            }
        } else if (data.type == "Actor") {
            let actor = await fromUuid(data.uuid);

            if (!actor || actor.compendium)
                return;

            this.offering.actor = {
                id: actor.id,
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
            let offerings = foundry.utils.duplicate(this.object.getFlag("monks-enhanced-journal", "offerings") || []);
            this.offering.id = makeid();
            offerings.unshift(this.offering);
            await this.object.setFlag("monks-enhanced-journal", "offerings", offerings);
        } else {
            MonksEnhancedJournal.emit("makeOffering", { offering: this.offering, uuid: this.object.uuid });
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.actor-icon', html).on("dblclick", this.openActor.bind(this));
        $('.item-delete', html).on("click", this.removeOffering.bind(this));

        $('.cancel-offer', html).on("click", this.close.bind(this));
        $('.private', html).on("change", (event) => {
            this.offering.hidden = $(event.currentTarget).prop("checked");
        });
        $('.currency-field', html).on("blur", (event) => {
            this.offering.currency[$(event.currentTarget).attr("name")] = parseInt($(event.currentTarget).val() || 0);
        });
    }

    removeOffering(event) {
        let that = this;
        const id = event.currentTarget.closest(".item").dataset.id;
        Dialog.confirm({
            title: `Remove offering Item`,
            content: "Are you sure you want to remove this item from the offering?",
            yes: () => {
                that.offering.items.findSplice(i => i.id == id);
                that.render();
            }
        });
    }

    async openActor() {
        try {
            let actor = game.actors.get(this.offering?.actor?.id);
            if (actor) {
                actor.sheet.render(true);
            }
        } catch {}
    }
}