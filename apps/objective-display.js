import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class ObjectiveDisplay extends Application {
    constructor() {
        super();
    }

    /** @override */
    static get defaultOptions() {
        let pos = game.user.getFlag("monks-enhanced-journal", "objectivePos");
        return mergeObject(super.defaultOptions, {
            id: "objective-display",
            title: i18n("MonksEnhancedJournal.Quests"),
            template: "modules/monks-enhanced-journal/templates/objective-display.html",
            width: pos?.width || 500,
            height: "auto",
            top: pos?.top || 75,
            left: pos?.left || 120,
            resizable: true
        });
    }

    getData(options) {
        let quests = game.journal.filter(j => {
            return j.getFlag('monks-enhanced-journal', 'type') == 'quest' &&
                j.testUserPermission(game.user, "OBSERVER") &&
                j.getFlag('monks-enhanced-journal', 'display') &&
                j.getFlag('monks-enhanced-journal', 'display');
        }).map(q => {
            let data = {
                id: q.id,
                completed: q.getFlag('monks-enhanced-journal', 'completed'),
                name: q.name
            };

            if (setting('use-objectives')) {
                data.objectives = (q.getFlag('monks-enhanced-journal', 'objectives') || [])
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
        });

        return mergeObject(super.getData(options),
            {
                quests: quests
            }
        );
    }

    async _render(force, options) {
        let that = this;
        return super._render(force, options).then((html) => {
            $('h4', this.element).addClass('flexrow')
            delete ui.windows[that.appId];
        });
    }

    async close(options) {
        if (options?.properClose) {
            super.close(options);
            MonksEnhancedJournal.objdisp;
        }
    }
}