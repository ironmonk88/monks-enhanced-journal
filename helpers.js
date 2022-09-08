import { MonksEnhancedJournal, pricename } from "./monks-enhanced-journal.js";

export let getValue = (item, name, defvalue = 0) => {
    return MEJHelpers.getValue(item, name, defvalue);
}

export let setValue = (item, name, value = 1) => {
    return MEJHelpers.setValue(item, name, value);
}

export let getPrice = (item, name, ignorePrice = false) => {
    return MEJHelpers.getPrice(item, name, ignorePrice);
}

export class MEJHelpers {
    static getValue(item, name, defvalue = 0) {
        name = name || pricename();
        if (!item)
            return defvalue;
        let value = (item.system != undefined ? getProperty(item?.system, name) : getProperty(item, name));
        value = (value?.hasOwnProperty("value") ? value.value : value);
        if (value && typeof value === 'object' && game.system.id == "pf2e") {
            value = Object.values(value)[0];
        }
        return value ?? defvalue;
    }

    static setValue(item, name, value = 1) {
        let prop = (item.system != undefined ? item.system : item);
        let data = getProperty(prop, name);
        setProperty(prop, name, (data && data.hasOwnProperty("value") ? { value: value } : value));
    }

    static defaultCurrency() {
        let currency = MonksEnhancedJournal.currencies.find(c => c.convert == 0);
        return currency?.id || "";
    }

    static getSystemPrice(item, name, ignorePrice = false) {
        name = name || pricename();

        let cost = (typeof item == "string" ? item : (item.system?.denomination != undefined && name != "cost" ? item.system?.value.value + " " + item.system?.denomination.value : getValue(item, name, null)));
        if (name == "cost" && cost == undefined && typeof item !== "string" && !ignorePrice)
            cost = (item.system?.denomination != undefined ? item.system?.value.value + " " + item.system?.denomination.value : getValue(item, "price"));

        return cost;
    }

    static getPrice(cost) {
        let result = {};

        var countDecimals = function (value) {
            let parts = value.toString().split(".");
            if (parts.length == 1)
                return 0;
            return (parts[1].length || 0);
        }

        cost = "" + cost;
        let price = parseFloat(cost.replace(',', ''));
        if (price == 0 || isNaN(price)) {
            return { value: 0, currency: MEJHelpers.defaultCurrency() };
        }
        if (price < 0) {
            result.consume = true;
            price = Math.abs(price);
        }

        let currency = cost.replace(/[^a-z]/gi, '');

        if (currency == "")
            currency = MEJHelpers.defaultCurrency();

        if (parseInt(price) != price) {
            if (MonksEnhancedJournal.currencies.length) {
                let numDecimal = price.toString().split(".")[1].length || 0;
                let currs = MonksEnhancedJournal.currencies.filter(c => {
                    if (!c.convert)
                        return false;
                    return countDecimals(c.convert) >= numDecimal;
                });
                let curr = null;

                let adjust = Math.pow(10, numDecimal);
                for (let tcurr of currs) {
                    let val = (price * adjust) / ((tcurr.convert || 1) * adjust);
                    if (val == Math.floor(val)) {
                        curr = tcurr;
                        currency = tcurr.id;
                        price = Math.floor(val);
                        break;
                    }
                }

                if (!curr) {
                    curr = MonksEnhancedJournal.currencies[MonksEnhancedJournal.currencies.length - 1];
                    currency = curr.id;
                    price = Math.floor(price / (curr.convert || 1));
                }
            } else
                price = Math.floor(price);
        }

        result.value = price;
        result.currency = currency;

        return result;
    }

    static toDefaultCurrency(price) {
        let value = MEJHelpers.getPrice(price, "price");
        let currency = MonksEnhancedJournal.currencies.find(c => c.id == value.currency);
        let result = (currency.convert || 1) * value.value;

        return result;
    }
}