import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class DistributeCurrency extends FormApplication {
    original = {};
    characters = [];
    currency = {};
    totals = {};

    constructor(characters, currency, loot, options = {}) {
        super(options);

        this.loot = loot;
        this.currency = currency;
        this.original = duplicate(currency);
        this.totals = duplicate(currency);
        let playercurrency = duplicate(currency);
        for (let curr of Object.keys(currency))
            playercurrency[curr] = 0;
        this.characters = characters.map(c => {
            return {
                id: c.id,
                name: c.name,
                img: c.img,
                currency: duplicate(playercurrency)
            }
        });
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "distribute-currency",
            classes: ["distribute-currency", "monks-journal-sheet", "sheet"],
            title: i18n("MonksEnhancedJournal.DistributeCurrency"),
            template: "modules/monks-enhanced-journal/templates/distribute-currency.html",
            width: 600,
            height: 'auto',
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                characters: this.characters,
                currency: this.currency,
                totals: this.totals
            }
        );
    }

    calcTotal(currencies) {
        if (currencies == undefined)
            currencies = Object.keys(this.currency);
        else
            currencies = [currencies];
        for (let curr of currencies) {
            this.totals[curr] = this.currency[curr];
            for (let character of this.characters) {
                if (character.currency[curr] !== "")
                    this.totals[curr] = this.totals[curr] + character.currency[curr];
            }
        }
    }

    resetData() {
        this.currency = duplicate(this.original);
        for (let character of this.characters) {
            for (let curr of Object.keys(character.currency)) {
                character.currency[curr] = 0;
            }
        }

        this.calcTotal();

        this.render(true);
    }

    updateAmount(event) {
        let curr = event.currentTarget.dataset.currency;
        let charId = event.currentTarget.dataset.character;

        if (charId == undefined)
            this.currency[curr] = parseInt($(event.currentTarget).val());
        else {
            let character = this.characters.find(c => c.id == charId);
            let value = $(event.currentTarget).val();
            if (value === "")
                character.currency[curr] = "";
            else
                character.currency[curr] = parseInt(value);
        }

        this.calcTotal();

        this.render(true);
    }

    splitCurrency(event) {
        for (let curr of Object.keys(this.currency)) {
            if (this.currency[curr] == 0)
                continue;
            let characters = this.characters.filter(c => {
                return c.currency[curr] !== "";
            });
            if (characters.length == 0)
                continue;
            let part = Math.floor(this.currency[curr] / characters.length);
            for (let character of characters) {
                character.currency[curr] = character.currency[curr] + part;
            }

            this.currency[curr] = this.currency[curr] - (part * characters.length);
        }

        this.calcTotal();

        this.render(true);
    }

    assignCurrency(event) {
        let charId = event.currentTarget.dataset.character;

        let character = this.characters.find(c => c.id == charId);
        for (let curr of Object.keys(this.totals)) {
            character.currency[curr] = (character.currency[curr] || 0) + this.currency[curr];
            this.currency[curr] = 0;
        }

        this.calcTotal();

        this.render(true);
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('input.player-amount').change(this.updateAmount.bind(this));
        html.find('input.currency-amount').change(this.updateAmount.bind(this));

        html.find('a.split').click(this.splitCurrency.bind(this));
        html.find('a.reset').click(this.resetData.bind(this));
        html.find('a.assign').click(this.assignCurrency.bind(this));
    }

    _updateObject() {
        this.loot.doSplitMoney(this.characters, this.currency);
    }
}