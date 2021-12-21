import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class JournalEntrySheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        this.refresh();
    }

    get type() {
        return 'base';
    }

    _inferDefaultMode() {
        if (super._inferDefaultMode() == undefined) return;
        return (this.object.data.img != undefined && this.object.data.img != '' && this.object.data.content == '' ? 'image' : 'text');
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.journalentry"),
            template: "modules/monks-enhanced-journal/templates/journalentry.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: 'description' }],
            scrollY: [".description"]
        });
    }

    getData() {
        let data = super.getData();

        let owner = this.object.isOwner;
        data.hideTabs = (!owner && ((this.object.data.img != undefined && this.object.data.img != '' && this.object.data.content == '') || ((this.object.data.img == undefined || this.object.data.img == '') && this.object.data.content != '')));

        if (game.modules.get('monks-common-display')?.active) {
            let playerdata = game.settings.get("monks-common-display", 'playerdata');
            let pd = playerdata[game.user.id] || { display: false, mirror: false, selection: false };

            if (pd.display)
                data.hideTabs = true;
        }

        return data;
    }

    refresh() {
        let journaltype = (this.object.data.img != undefined && this.object.data.img != '' && this.object.data.content == '' ? 'picture' : 'description');
        this.options.tabs[0].initial = journaltype;
        this._tabs[0].active = journaltype;
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } },
            { id: 'split', text: i18n("MonksEnhancedJournal.Extract"), icon: 'fa-file-export', conditional: (game.user.isGM && this.isEditable), callback: this.enhancedjournal.splitJournal }
        ];

        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        const options = this._getContextOptions();
        if (options) {
            let context = new ContextMenu($(html), 'div[data-tab="picture"]', options);
        }
    }

    _getContextOptions() {
        return [
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM || this.object.isOwner,
                callback: li => {
                    Dialog.confirm({
                        title: `${game.i18n.localize("SIDEBAR.Delete")} Picture`,
                        content: i18n("MonksEnhancedJournal.ConfirmRemovePicture"),
                        yes: this.removePicture.bind(this)
                    });
                }
            },
            {
                name: "MonksEnhancedJournal.ShowToPlayers",
                icon: '<i class="fas fa-eye"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    if (this.enhancedjournal) {
                        this.enhancedjournal.doShowPlayers({ ctrlKey: true });
                    } else
                        this.object.show('image', true);
                }
            }
        ];
    }

    removePicture() {
        $('[data-edit="img"]').css({ opacity: 0 });
        this.object.update({ img: '' });
    }

    async render(data) {
        let element = await super.render(data);

        return element;
    }

    _getSubmitData() {
        let data = expandObject(super._getSubmitData());

        data.img = $('.picture-img', this.element).attr('src');

        return flattenObject(data);
    }
}
