import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class ObjectiveDisplay extends Application {
    constructor() {
        super();
    }

    /** @override */
    static get defaultOptions() {
        let pos = game.user.getFlag("monks-enhanced-journal", "objectivePos");
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "objective-display",
            title: i18n("MonksEnhancedJournal.Quests"),
            template: "modules/monks-enhanced-journal/templates/objective-display.html",
            width: pos?.width || 500,
            height: pos?.height || 300,
            top: pos?.top || 75,
            left: pos?.left || 120,
            resizable: true
        });
    }

    getData(options) {
        let icons = {
            inactive: "fa-ban",
            available: "fa-file-circle-plus",
            inprogress: "fa-circle-exclamation",
            completed: "fa-check",
            failed: "fa-xmark"
        }
        let quests = game.journal.filter(j => {
            if (j.pages.size != 1)
                return false;
            let page = j.pages.contents[0];
            return foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.type') == 'quest' &&
                j.testUserPermission(game.user, "OBSERVER") &&
                page.getFlag('monks-enhanced-journal', 'display');
        }).map(q => {
            let page = q.pages.contents[0];
            let status = foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.status') || (foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.completed') ? 'completed' : 'inactive');
            let data = {
                id: page.id,
                uuid: page.uuid,
                completed: page.getFlag('monks-enhanced-journal', 'completed'),
                status: foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.status') || (foundry.utils.getProperty(page, 'flags.monks-enhanced-journal.completed') ? 'completed' : 'inactive'),
                name: page.name,
                icon: icons[status]
            };

            if (setting('use-objectives')) {
                data.objectives = (page.getFlag('monks-enhanced-journal', 'objectives') || [])
                    .filter(o => o.available)
                    .map(o => {
                        return {
                            content: o.title || o.content,
                            done: o.done || 0,
                            required: o.required,
                            completed: o.status
                        }
                    });
            }

            return data;
        }).sort((a, b) => {
            let indexA = Object.keys(icons).findIndex(i => i == a.status);
            let indexB = Object.keys(icons).findIndex(i => i == b.status);

            return indexA - indexB;
        });

        return foundry.utils.mergeObject(super.getData(options), { quests: quests } );
    }

    async _render(force, options) {
        let that = this;
        return super._render(force, options).then((html) => {
            $('h4', this.element).addClass('flexrow')
            delete ui.windows[that.appId];
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('li[data-document-id]', html).on("click", this.openQuest.bind(this));
    }

    async openQuest(event) {
        let id = event.currentTarget.dataset.documentId;
        let page = await fromUuid(id);
        MonksEnhancedJournal.openJournalEntry(page);
    }

    async close(options) {
        if (options?.properClose) {
            super.close(options);
            MonksEnhancedJournal.objdisp;
        }
    }
}