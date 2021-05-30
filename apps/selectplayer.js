import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class SelectPlayer extends FormApplication {
    users = [];
    showpic = false;

    constructor(object, options = {}) {
        super(object, options);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "select-player",
            classes: ["form", "select-sheet"],
            title: i18n("MonksEnhancedJournal.SelectPlayer"),
            template: "modules/monks-enhanced-journal/templates/selectplayer.html",
            width: 400,
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false
        });
    }

    getData(options) {
        this.users = game.users.map(u => {
            return {
                id: u.id,
                name: u.name,
                active: u.active,
                selected: false
            };
        }).filter(u => u.id != game.user.id);
        return mergeObject(super.getData(options),
            {
                users: this.users,
                picchoice: this.canShowPic(),
                showpic: this.showpic
            }
        );
    }

    canShowPic() {
        let type = this.object.data.flags["monks-enhanced-journal"].type;
        return (["person","place","quest","oldentry"].includes(type));
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {

    }

    updateSelection(event) {
        log('Changing selection');
        let ctrl = event.currentTarget;
        let li = ctrl.closest('li');
        let id = li.dataset.userId;

        let user = this.users.find(u => u.id == id);
        user.selected = $(ctrl).is(':checked');
    }

    updateShowPic(event) {
        this.showpic = $(event.currentTarget).is(':checked');
    }

    showPlayers(mode, event) {
        MonksEnhancedJournal.journal._onShowPlayers.call(MonksEnhancedJournal.journal, this.object, (mode == 'all' ? null : this.users), this.showpic, event);
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('button[name="showall"]').click(this.showPlayers.bind(this, 'all'));
        html.find('button[name="show"]').click(this.showPlayers.bind(this, 'players'));

        html.find('input[type="checkbox"].user-select').change(this.updateSelection.bind(this));
        html.find('input[type="checkbox"].pic-select').change(this.updateShowPic.bind(this));
    }
}