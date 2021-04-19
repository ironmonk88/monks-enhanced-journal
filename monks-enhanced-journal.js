import { registerSettings } from "./settings.js";
import { EnhancedJournalSheet } from "./apps/enhanced-journal.js"
import { EnhancedDirectory } from "./apps/enhanced-directory.js"

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: monks-enhanced-journal | ", ...args);
};
export let log = (...args) => console.log("monks-enhanced-journal | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("monks-enhanced-journal | ", ...args);
};
export let error = (...args) => console.error("monks-enhanced-journal | ", ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};
export let setting = key => {
    return game.settings.get("monks-enhanced-journal", key);
};

export let oldSheetClass = () => {
    return MonksEnhancedJournal._oldSheetClass;
};

export class MonksEnhancedJournal {
    static _oldSheetClass;
    static journal;

    constructor() {
    }

    static getEntityTypes() {
        return {
            "journalentry": "MonksEnhancedJournal.journalentry",
            "actor": "MonksEnhancedJournal.actor",
            "slideshow": "MonksEnhancedJournal.slideshow",
            "picture": "MonksEnhancedJournal.picture",
            "person": "MonksEnhancedJournal.person",
            "place": "MonksEnhancedJournal.place",
            "quest": "MonksEnhancedJournal.quest",
            "encounter": "MonksEnhancedJournal.encounter"
        };
    }

    static init() {
        log('Initializing Monks Enhanced Journal');
        registerSettings();

        MonksEnhancedJournal._oldSheetClass = CONFIG.JournalEntry.sheetClass;
        CONFIG.JournalEntry.sheetClass = EnhancedJournalSheet;

        let types = MonksEnhancedJournal.getEntityTypes();
        game.system.entityTypes.JournalEntry = Object.keys(types);
        CONFIG.JournalEntry.typeLabels = types;

        const oldOnClickEntityName = JournalDirectory._onClickEntityName;
        function onClickEntityName(event) {
            event.preventDefault();
            const element = event.currentTarget;
            const entityId = element.parentElement.dataset.entityId;
            const entity = this.constructor.collection.get(entityId);

            //if the enhanced journal is already open, then just pass it the new object, if not then let it render as normal
            if (MonksEnhancedJournal.journal != undefined)
                MonksEnhancedJournal.journal.open(entity);
            else {
                const sheet = entity.sheet;

                if (sheet._minimized) return sheet.maximize();
                else return sheet._render(true).then(() => {
                    MonksEnhancedJournal.journal.open(entity);
                });
            }
        }
        JournalDirectory.prototype._onClickEntityName = onClickEntityName;

        JournalDirectory.prototype.renderPopout = function () {
            let entry = new JournalEntry();
            let ejs = new EnhancedJournalSheet(entry);
            ejs._render(true).then(() => {
                MonksEnhancedJournal.journal.activateTab(MonksEnhancedJournal.journal.tabs.active());
            });
        }

        Journal.prototype.constructor._showEntry = MonksEnhancedJournal._showEntry;
    }

    static async _showEntry(entryId, mode = "text", force = true) {
        let entry = await fromUuid(entryId);
        if (entry.entity !== "JournalEntry") return;
        if (!force && !entry.visible) return;

        // Don't show an entry that has no content
        if (!entry.data.content) return;

        // Show the sheet with the appropriate mode
        entry.sheet._render(true, { sheetMode: mode }).then(() => {
            MonksEnhancedJournal.journal.open(entry);
        });
    }

    static async ready() {
        //this.journal = new EnhancedJournal();
        //this.hookSwapMode();
        //Hooks.on("closeJournalSheet", (app, html, data) => {
        //    this._onJournalRemoved(app);
        //});
    }

    static initPopout() {
        /*
        Object.defineProperty(JournalSheet.prototype, "options", {
            get: function () {
                var _a;
                if (!this.entity) {
                    return this._options;
                }
                const detaching = (_a = window.oneJournal) === null || _a === void 0 ? void 0 : _a.shell.detachedJournals.has(this.entity.uuid);
                return {
                    ...this._options,
                    popOutModuleDisable: !detaching,
                };
            },
            set: function (value) {
                this._options = value;
            },
        });*/
    }

    static getIcon(type) {
        switch (type) {
            case 'picture': return 'fa-image';
            case 'person': return 'fa-user';
            case 'place': return 'fa-place-of-worship';
            case 'slideshow': return 'fa-photo-video';
            case 'encounter': return 'fa-toolbox';
            case 'quest': return 'fa-map-signs';
            case 'journalentry':
            default:
                return 'fa-book-open';
        }
    }
}

Hooks.on("renderJournalDirectory", (app, html, options) => {
    //add journal indicators
    log('rendering journal directory', app, html, options);
    $('.entity.journal', html).each(function () {
        let id = this.dataset.entityId;
        let entry = app.entities.find(e => e.id == id);
        let type = entry.getFlag('monks-enhanced-journal', 'type');
        let icon = MonksEnhancedJournal.getIcon(type);

        $('.entity-name', this).prepend($('<i>').addClass('fas fa-fw ' + icon));
    });
    if (MonksEnhancedJournal.journal)
        MonksEnhancedJournal.journal.render(true);
});

Hooks.on("renderJournalSheet", (app, html) => {
});

Hooks.once("init", async function () {
    MonksEnhancedJournal.init();
});

Hooks.once("ready", async function () {
    MonksEnhancedJournal.ready();
    if (game.modules?.popout?.active) {
        MonksEnhancedJournal.initPopout();
    }
});

Hooks.on("preCreateJournalEntry", (data, options, userId) => {
    data.flags = {
        'monks-enhanced-journal': { type: data.type }
    };
    data.content = (data.type == 'journalentry' ? '' : '{}');
});