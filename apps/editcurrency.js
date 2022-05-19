import { MonksEnhancedJournal, log, error, i18n, setting, makeid } from "../monks-enhanced-journal.js";

export class EditCurrency extends FormApplication {
    constructor(object, options) {
        super(object, options);

        this.currency = MonksEnhancedJournal.currencies;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "journal-editcurrency",
            title: i18n("MonksEnhancedJournal.EditCurrency"),
            classes: ["edit-currency"],
            template: "./modules/monks-enhanced-journal/templates/edit-currency.html",
            width: 400,
            height: "auto",
            closeOnSubmit: true,
            popOut: true,
        });
    }

    getData(options) {
        return {
            currency: this.currency
        };
    }

    _updateObject() {
        let data = this.currency.filter(c => !!c.id && !!c.name);
        game.settings.set('monks-enhanced-journal', 'currency', data);
        this.submitting = true;
    }

    addCurrency(event) {
        this.currency.push({ id: "", name: "", convert: 1 });
        this.refresh();
    }

    changeData(event) {
        let currid = event.currentTarget.closest('li.item').dataset.id;
        let prop = $(event.currentTarget).attr("name");

        let currency = this.currency.find(c => c.id == currid);
        if (currency) {
            let val = $(event.currentTarget).val();
            if (prop == "convert") {
                if (isNaN(val))
                    val = 1;
                else
                    val = parseFloat(val);
            }
            else if (prop == "id") {
                val = val.replace(/[^a-z]/gi, '');
                $(event.currentTarget).val(val);
                if (!!this.currency.find(c => c.id == val)) {
                    $(event.currentTarget).val(currid)
                    return;
                }
                $(event.currentTarget.closest('li.item')).attr("data-id", val);
            }

            currency[prop] = val;
        }
    }

    removeCurrency() {
        let currid = event.currentTarget.closest('li.item').dataset.id;
        this.currency.findSplice(s => s.id === currid);
        this.refresh();
    }

    resetCurrency() {
        this.currency = MonksEnhancedJournal.defaultCurrencies;
        this.refresh();
    }

    refresh() {
        this.render(true);
        let that = this;
        window.setTimeout(function () { that.setPosition(); }, 500);
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('button[name="submit"]', html).click(this._onSubmit.bind(this));
        $('button[name="reset"]', html).click(this.resetCurrency.bind(this));

        $('input[name]', html).change(this.changeData.bind(this));

        $('.item-delete', html).click(this.removeCurrency.bind(this));
        $('.item-add', html).click(this.addCurrency.bind(this));
    };
}