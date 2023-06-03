import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';
import { getValue, setValue } from "../helpers.js";

export class TransferCurrency extends FormApplication {
    constructor(object, loot, options = {}) {
        super(object, options);

        this.loot = loot;
        this.currency = {};
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "transfer-currency",
            classes: ["form", "transfer-currency", "monks-journal-sheet", "dialog"],
            title: i18n("MonksEnhancedJournal.TransferCurrency"),
            template: "modules/monks-enhanced-journal/templates/transfer-currency.html",
            width: 600,
            height: 'auto'
        });
    }

    getData(options) {
        let data = super.getData(options);

        data.currency = MonksEnhancedJournal.currencies.filter(c => c.convert != null).map(c => { return { id: c.id, name: c.name }; });

        data.coins = this.currency;

        let actor = game.user.character;
        data.actor = {
            id: actor?.id,
            name: actor?.name || "No Actor",
            img: actor?.img || "icons/svg/mystery-man.svg"
        };

        return data;
    }

    /** @override */
    async _onSubmit(event, options = {}) {
        event.preventDefault();

        let remainder = this.object.getFlag('monks-enhanced-journal', 'currency');
        let actor = game.user.character;

        for (let [k, v] of Object.entries(this.currency)) {
            if (v < 0) {
                // make sure the character has the currency
                let curr = this.loot.getCurrency(actor, k);
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
        let actor = game.user.character;

        for (let [k, v] of Object.entries(this.currency)) {
            if (v != 0) {
                await this.loot.addCurrency(actor, k, v);
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
            this.currency[$(event.currentTarget).attr("name")] = parseInt($(event.currentTarget).val() || 0);
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
            let actor = game.user.character;
            if (actor) {
                actor.sheet.render(true);
            }
        } catch { }
    }
}