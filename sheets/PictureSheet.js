import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class PictureSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.picture"),
            template: "modules/monks-enhanced-journal/templates/sheets/picture.html"
        });
    }

    async getData() {
        let data = await super.getData();

        return data;
    }

    static get type() {
        return 'picture';
    }

    _inferDefaultMode() {
        return "image";
    }

    get template() {
        //let settings = this.sheetSettings();
        //if (!this.object.isOwner && getProperty(settings, "settings.open.value") === true) return ImagePopout.defaultOptions.template;
        return this.options.template;
    }

    _documentControls() {
        let ctrls = [
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'sound', text: i18n("MonksEnhancedJournal.AddSound"), icon: 'fa-music', conditional: this.isEditable, callback: () => { this.onAddSound(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        return ctrls.concat(super._documentControls());
    }

    _getSubmitData() {
        let data = expandObject(super._getSubmitData());

        data.src = $('.picture-img', this.element).attr('src');

        return flattenObject(data);
    }
}
