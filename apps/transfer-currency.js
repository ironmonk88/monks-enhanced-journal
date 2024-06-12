import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';
import { getValue, setValue } from "../helpers.js";

export class TransferCurrency extends FormApplication {
    constructor(object, actor, loot, options = {}) {
        super(object, options);

        this.loot = loot;
        this.currency = {};
        this.actor = actor || game.user.character;
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "transfer-currency",
            classes: ["form", "transfer-currency", "monks-journal-sheet", "dialog"],
            title: i18n("MonksEnhancedJournal.TransferCurrency"),
            template: "modules/monks-enhanced-journal/templates/transfer-currency.html",
            dragDrop: [
                { dropSelector: ".transfer-container" }
            ],
            width: 600,
            height: 'auto'
        });
    }

    getData(options) {
        let data = super.getData(options);

        data.currency = MonksEnhancedJournal.currencies.filter(c => c.convert != null).map(c => { return { id: c.id, name: c.name }; });

        data.coins = this.currency;

        data.actor = {
            id: this.actor?.id,
            name: this.actor?.name || "No Actor",
            img: this.actor?.img || "icons/svg/mystery-man.svg"
        };

        return data;
    }

    _canDragStart(selector) {
        return game.user.isGM;
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == "Actor") {
            let actor = await fromUuid(data.uuid);

            if (!actor || actor.compendium)
                return;

            this.actor = actor;
            this.render();
        }
    }

    /** @override */
    async _onSubmit(event, options = {}) {
        event.preventDefault();

        let remainder = this.object.getFlag('monks-enhanced-journal', 'currency');

        for (let [k, v] of Object.entries(this.currency)) {
            if (v < 0) {
                // make sure the character has the currency
                let curr = this.loot.getCurrency(this.actor, k);
                if (curr < Math.abs(v)) {
                    return ui.notifications.warn("Actor does not have enough currency: " + k);
                }
            } else if (v > 0) {
                if (remainder[k] < v) {
                    return ui.notifications.warn("Loot does not have enough currency: " + k);
                }
            }
        }

        return super._onSubmit(event, options);
    }

    async _updateObject(event, formData) {
        let remainder = this.object.getFlag('monks-enhanced-journal', 'currency') || {};

        for (let [k, v] of Object.entries(this.currency)) {
            if (v != 0) {
                await this.loot.addCurrency(this.actor, k, v);
                remainder[k] = (remainder[k] ?? 0) - v;
            }
        }
        if (game.user.isGM || this.object.isOwner) {
            await this.object.setFlag('monks-enhanced-journal', 'currency', remainder);
        } else {
            // Send this to the GM to update the loot sheet currency
            MonksEnhancedJournal.emit("transferCurrency", { currency: remainder, uuid: this.object.uuid });
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.actor-icon', html).on("dblclick", this.openActor.bind(this));

        $('.clear-items', html).on("click", this.clearAllCurrency.bind(this));
        $('.item-delete', html).on("click", this.clearCurrency.bind(this));
        $('.cancel-offer', html).on("click", this.close.bind(this));
        $('.currency-field', html).on("blur", (event) => {
            let currName = $(event.currentTarget).attr("name");
            let lootCurrency = this.loot.object.getFlag("monks-enhanced-journal", "currency") || {};
            let maxCurr = lootCurrency[currName] || 0;
            this.currency[currName] = Math.min(parseInt($(event.currentTarget).val() || 0), maxCurr);
            $(event.currentTarget).val(this.currency[currName]);
        });
    }

    clearCurrency(event) {
        let that = this;
        const id = event.currentTarget.closest(".item").dataset.id;

        this.currency[id] = 0;
        $(`.currency-field[name="${id}"]`, this.element).val('');
    }

    clearAllCurrency(event) {
        this.currency = {};
        $(`.currency-field`, this.element).val('');
    }

    async openActor() {
        try {
            if (this.actor) {
                this.actor.sheet.render(true);
            }
        } catch { }
    }
}