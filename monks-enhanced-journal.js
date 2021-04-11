import { registerSettings } from "./settings.js";
import { EnhancedJournal, initJournalSheet } from "./apps/enhanced-journal.js"
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

class MonksEnhancedJournal {
    constructor() {
    }

    init() {
        log('Initializing Monks Enhanced Journal');
        registerSettings();

        const mej = initJournalSheet();
        CONFIG.JournalEntry.sheetClass = mej;

        /*
        const oldOnClickEntityName = JournalDirectory._onClickEntityName;
        function onClickEntityName(event) {
            event.preventDefault();
            const element = event.currentTarget;
            const entityId = element.parentElement.dataset.entityId;
            const entity = game.journal.get(entityId);
            const sheet = entity.sheet;

            if (sheet._minimized) return sheet.maximize();
            else return sheet.render(true);
        }
        //@ts-ignore
        JournalDirectory.prototype._onClickEntityName = onClickEntityName;
        */
    }

    ready() {
        this.journal = new EnhancedJournal();
        //this.hookSwapMode();
        //Hooks.on("closeJournalSheet", (app, html, data) => {
        //    this._onJournalRemoved(app);
        //});
    }

    initPopout() {
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
        });
    }
}

Hooks.on("renderJournalSheet", (app, html) => {
});

Hooks.once("init", async function () {
    MonksEnhancedJournal.init();
});

Hooks.once("ready", function () {
    MonksEnhancedJournal.ready();
    if (game.modules?.popout?.active) {
        MonksEnhancedJournal.initPopout();
    }
});