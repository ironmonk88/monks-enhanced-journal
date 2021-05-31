import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class DCConfig extends FormApplication {
    constructor(object, options = {}) {
        super(object, options);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "dc-config",
            classes: ["form", "dc-sheet"],
            title: i18n("MonsEnhancedJournal.DCConfiguration"),
            template: "modules/monks-enhanced-journal/templates/dc-config.html",
            width: 400
        });
    }

    getData(options) {
        let config = (game.system.id == "tormenta20" ? CONFIG.T20 : CONFIG[game.system.id.toUpperCase()]);
        let attributeOptions = [
            { id: "ability", text: "MonksEnhancedJournal.Ability", groups: config.abilities || config.scores || config.atributos },
            { id: "skill", text: "MonksEnhancedJournal.Skill", groups: config.skills || config.pericias }
        ]
        return mergeObject(super.getData(options),
            {
                attributeOptions: attributeOptions
            }, { recursive: false }
        );
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        log('updating dc', event, formData, this.object);
        mergeObject(this.object, formData);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            MonksEnhancedJournal.journal.object.data.flags["monks-enhanced-journal"].dcs.push(this.object);
        }
            
        MonksEnhancedJournal.journal.saveData().then(() => {
            MonksEnhancedJournal.journal.display(MonksEnhancedJournal.journal.object);
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
    }

    async close(options) {
        if (this.object.id && (this.object.attribute == 'undefined' || this.object.attribute.indexOf(':') < 0))
            MonksEnhancedJournal.journal.subsheet.deleteItem(this.object.id, 'dcs');    //delete it if it wasn't created properly
        return super.close(options);
    }
}