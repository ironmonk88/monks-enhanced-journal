import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class TextEntrySheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        this.refresh();
    }

    get type() {
        return 'text';
    }

    _inferDefaultMode() {
        if (super._inferDefaultMode() == undefined) return;
        return 'text';
    }

    get template() {
        let mode = this.options.sheetMode || this._sheetMode;
        if (!this.object.isOwner && mode === "image" && this.object.img && !setting("allow-player")) return ImagePopout.defaultOptions.template;
        return this.options.template;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.journalentry"),
            template: "modules/monks-enhanced-journal/templates/textentry.html",
            tabs: []
        });
    }

    refresh() {
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'sound', text: i18n("MonksEnhancedJournal.AddSound"), icon: 'fa-music', conditional: this.isEditable, callback: () => { this.onAddSound(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } },
            { id: 'split', text: i18n("MonksEnhancedJournal.Extract"), icon: 'fa-file-export', conditional: (game.user.isGM && this.isEditable), callback: this.enhancedjournal.splitJournal }
        ];

        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    async render(data) {
        let element = await super.render(data);

        return element;
    }
}