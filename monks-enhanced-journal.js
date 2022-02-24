import { registerSettings } from "./settings.js";
import { EnhancedJournal } from "./apps/enhanced-journal.js"
import { SlideshowWindow } from "./apps/slideshow-window.js"
import { CheckListSheet } from "./sheets/CheckListSheet.js"
import { EncounterSheet } from "./sheets/EncounterSheet.js"
import { JournalEntrySheet, JournalEntrySheetTextOnly } from "./sheets/JournalEntrySheet.js"
import { PersonSheet } from "./sheets/PersonSheet.js"
import { PictureSheet } from "./sheets/PictureSheet.js"
import { PlaceSheet } from "./sheets/PlaceSheet.js"
import { PointOfInterestSheet } from "./sheets/PointOfInterestSheet.js"
import { QuestSheet } from "./sheets/QuestSheet.js"
import { SlideshowSheet } from "./sheets/SlideshowSheet.js"
import { OrganizationSheet } from "./sheets/OrganizationSheet.js"
import { ShopSheet } from "./sheets/ShopSheet.js"
import { LootSheet } from "./sheets/LootSheet.js"
import { backgroundinit } from "./plugins/background.plugin.js"
import { NoteHUD } from "./apps/notehud.js"
import { EnhancedJournalSheet } from "./sheets/EnhancedJournalSheet.js";

export let debugEnabled = 0;

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

export let makeid = () => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 16; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export let oldSheetClass = () => {
    return MonksEnhancedJournal._oldSheetClass;
};

export class MonksEnhancedJournal {
    static _oldSheetClass;
    static journal;

    static pricename = "price";
    static quantityname = "quantity";
    static currencyname = "currency";

    constructor() {
    }

    static getDocumentTypes() {
        return {
            checklist: CheckListSheet,
            encounter: EncounterSheet,
            organization: OrganizationSheet,
            person: PersonSheet,
            picture: PictureSheet,
            place: PlaceSheet,
            poi: PointOfInterestSheet,
            quest: QuestSheet,
            shop: ShopSheet,
            loot: LootSheet,
            slideshow: SlideshowSheet
        };
    }

    static getTypeLabels() {
        return {
            base: "MonksEnhancedJournal.base",
            slideshow: "MonksEnhancedJournal.slideshow",
            picture: "MonksEnhancedJournal.picture",
            person: "MonksEnhancedJournal.person",
            place: "MonksEnhancedJournal.place",
            poi: "MonksEnhancedJournal.poi",
            quest: "MonksEnhancedJournal.quest",
            encounter: "MonksEnhancedJournal.encounter",
            organization: "MonksEnhancedJournal.organization",
            shop: "MonksEnhancedJournal.shop",
            loot: "MonksEnhancedJournal.loot",
            checklist: "MonksEnhancedJournal.checklist"
        };
    }

    static emit(action, args = {}) {
        args.action = action;
        args.senderId = game.user.id;
        game.socket.emit(MonksEnhancedJournal.SOCKET, args, (resp) => { });
    }

    static init() {
        log('Initializing Monks Enhanced Journal');
        registerSettings();

        if (game.system.id == "tormenta20") {
            MonksEnhancedJournal.pricename = "preco";
            MonksEnhancedJournal.quantityname = "qtd";
            MonksEnhancedJournal.currencyname = "dinheiro";
        }

        game.MonksEnhancedJournal = this;

        MonksEnhancedJournal.SOCKET = "module.monks-enhanced-journal";

        //MonksEnhancedJournal._oldSheetClass = CONFIG.JournalEntry.sheetClass;
        //CONFIG.JournalEntry.sheetClass = EnhancedJournalSheet;

        if (!(CONFIG.TinyMCE.content_css instanceof Array))
            CONFIG.TinyMCE.content_css = [CONFIG.TinyMCE.content_css];
        CONFIG.TinyMCE.content_css.push('modules/monks-enhanced-journal/css/editor.css');
        if (game.modules.get("polyglot")?.active)
            CONFIG.TinyMCE.content_css.push('modules/polyglot/css/polyglot.css');

        CONFIG.TinyMCE.style_formats.push({
            title: 'Enhanced Journal', items: [
                { block: "section", classes: "readaloud", title: "Read Aloud", wrapper: true },
                { inline: "span", classes: "drop-cap", title: "Drop Cap" }]
        });

        Note.prototype._canHUD = function(user, event) {
            return game.user.isGM && this.entry;
        }

        Object.defineProperty(NotesLayer.prototype, 'hud', {
            get: function () {
                return canvas.hud.note;
            }
        });

        if (JournalEntry.prototype.type == undefined) {
            Object.defineProperty(JournalEntry.prototype, 'type', {
                get: function () {
                    return this.data.type || this.getFlag('monks-enhanced-journal', 'type') || 'base';
                }
            });
        }

        let oldOnLayerClickRight = TokenLayer.prototype._onClickRight;
        TokenLayer.prototype._onClickRight = function (event) {
            oldOnLayerClickRight.call(this, event);
            canvas.hud.note.clear();
        }

        let oldOnLayerClickLeft = TokenLayer.prototype._onClickLeft;
        TokenLayer.prototype._onClickLeft = function (event) {
            oldOnLayerClickLeft.call(this, event);
            canvas.hud.note.clear();
        }

        let oldOnClickRight = Token.prototype._onClickRight;
        Token.prototype._onClickRight = function (event) {
            oldOnClickRight.call(this, event);
            canvas.hud.note.clear();
        }

        let clickDocumentName = function (wrapped, ...args) {
            let event = args[0];
            event.preventDefault();
            const element = event.currentTarget;
            const documentId = element.parentElement.dataset.documentId;
            const entry = this.constructor.collection.get(documentId);

            MonksEnhancedJournal.fixType(entry);

            let hasBlank = MonksEnhancedJournal?.journal?.object?.data?.type == "blank";
            if (game.MonksActiveTiles?.waitingInput || !MonksEnhancedJournal.openJournalEntry(entry, { newtab: setting('open-new-tab') && !hasBlank }))
                wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalDirectory.prototype._onClickDocumentName", clickDocumentName, "MIXED");
        } else {
            const oldClickDocumentName = JournalDirectory.prototype._onClickDocumentName;
            JournalDirectory.prototype._onClickDocumentName = function () {
                return clickDocumentName.call(this, oldClickDocumentName.bind(this), ...arguments);
            }
        }

        if (game.modules.get("lib-wrapper")?.active)
            libWrapper.ignore_conflicts("monks-enhanced-journal", "monks-active-tiles", "JournalDirectory.prototype._onClickDocumentName");

        let oldRenderPopout = JournalDirectory.prototype.renderPopout;
        JournalDirectory.prototype.renderPopout = function () {
            if (!MonksEnhancedJournal.openJournalEntry())
                return oldRenderPopout.call(this);
        }

        Journal.prototype.constructor._showEntry = async function(entryId, mode = null, force = true, showid) {
            let entry = await fromUuid(entryId);
            if (entry.documentName !== "JournalEntry") return;
            if (!force && !entry.visible) return;
            if (!entry.data.img && !entry.data.content) return; // Don't show an entry that has no content

            // Show the sheet with the appropriate mode
            if (!MonksEnhancedJournal.openJournalEntry(entry)) {
                MonksEnhancedJournal.fixType(entry);
                return entry.sheet.render(true, { sheetMode: mode });
            }
        }

        let clickNote = function (wrapped, ...args) {
            if (this.entry) {
                if (this.data.flags['monks-enhanced-journal']?.chatbubble === true) {
                    MonksEnhancedJournal.showAsChatBubble(this, this.document.entry);
                } else if (!MonksEnhancedJournal.openJournalEntry(this.entry)) {
                    if (this.entry.testUserPermission(game.user, "OBSERVER") || (this.entry.testUserPermission(game.user, "LIMITED") && !!this.entry.data.img))
                        return wrapped(...args);
                    else
                        return ui.notifications.warn(`You do not have permission to view this ${this.entry.documentName} sheet.`);
                }
            }
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Note.prototype._onClickLeft2", clickNote, "MIXED");
        } else {
            const oldClickNote = Note.prototype._onClickLeft2;
            Note.prototype._onClickLeft2 = function (event) {
                return clickNote.call(this, oldClickNote.bind(this));
            }
        }

        let oldEnrichHTML = TextEditor.prototype.constructor.enrichHTML;
        TextEditor.prototype.constructor.enrichHTML = function (content, options = {}) {
            let data = oldEnrichHTML.call(this, content, options);

            const html = document.createElement("div");
            html.innerHTML = String(data);

            let updateTextArray = true;
            let text = [];

            if (options.documents) {
                if (updateTextArray) text = this._getTextNodes(html);
                const rgx = new RegExp(`@(Picture)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g');
                this._replaceTextContent(text, rgx, MonksEnhancedJournal._createPictureLink);
            }

            if (updateTextArray) text = this._getTextNodes(html);
            //const rgx = /%\[(\/[a-zA-Z]+\s)?(.*?)([0-9]{1,3})(\]%)?/gi;
            //const rgx = new RegExp(`@(Request)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g');
            //const rgx = new RegExp(`@(Request)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g');
            const rgx = /@(Request|Contested)\[([^\]]+)\](?:{([^}]+)})?/gi;
            this._replaceTextContent(text, rgx, MonksEnhancedJournal._createRequestRoll);

            return html.innerHTML;
        }

        let oldClickContentLink = TextEditor.prototype.constructor._onClickContentLink;
        TextEditor.prototype.constructor._onClickContentLink = async function (event) {
            event.preventDefault();
            const a = event.currentTarget;
            let doc = null;
            let id = a.dataset.id;

            // Target 1 - Compendium Link
            if (a.dataset.pack) {
                const pack = game.packs.get(a.dataset.pack);
                if (a.dataset.lookup) {
                    if (!pack.index.length) await pack.getIndex();
                    const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
                    if (entry) {
                        a.dataset.id = id = entry.id;
                        delete a.dataset.lookup;
                    }
                }
                doc = id ? await pack.getDocument(id) : null;
            }

            // Target 2 - PlaylistSound Link
            else if (a.dataset.soundId) {
                const playlist = game.playlists.get(a.dataset.playlistId);
                doc = playlist?.sounds.get(a.dataset.soundId);
            }

            // Target 3 - World Document Link
            else {
                const collection = game.collections.get(a.dataset.type);
                if (!collection)
                    return;
                doc = collection.get(id);
                if (!doc) return;
                if ((doc.documentName === "Scene") && doc.journal) doc = doc.journal;
                if (!doc.testUserPermission(game.user, "LIMITED")) {
                    return ui.notifications.warn(`You do not have permission to view this ${doc.documentName} sheet.`);
                }
            }
            if (!doc) return;

            // Action 1 - Execute an Action
            if (doc.documentName === "Macro") {
                if (!doc.testUserPermission(game.user, "LIMITED")) {
                    return ui.notifications.warn(`You do not have permission to use this ${doc.documentName}.`);
                }
                return doc.execute();
            }

            // Action 2 - Play the sound
            else if (doc.documentName === "PlaylistSound") return TextEditor._onPlaySound(doc);

            // Action 3 - Render the Entity sheet
            if (doc.documentName == 'Actor' || doc.documentName == 'JournalEntry') {
                if (event.altKey || setting('open-outside') || !MonksEnhancedJournal.openJournalEntry(doc, { newtab: event.ctrlKey && !setting("open-new-tab") })) {
                    return doc.sheet.render(true);
                }
            }
            else {
                if (doc.documentName === "Scene")
                    game.scenes.get(id).view();
                else
                    return doc.sheet.render(true);
            }
        }
        /*
        let oldOnClickEntry = Compendium.prototype._onClickEntry;
        Compendium.prototype._onClickEntry = async function (event) {
            let li = event.currentTarget.parentElement;
            const document = await this.collection.getDocument(li.dataset.documentId);
            if (document instanceof JournalEntry) {
                MonksEnhancedJournal.openJournalEntry(document, { editable: game.user.isGM && !this.collection.locked });
            } else
                return oldOnClickEntry.call(this, event);
        }*/

        let clickCompendiumEntry = async function (wrapped, ...args) {
            let event = args[0];
            let li = event.currentTarget.parentElement;
            const document = await this.collection.getDocument(li.dataset.documentId);
            if (document instanceof JournalEntry) {
                if (!MonksEnhancedJournal.openJournalEntry(document, { editable: game.user.isGM && !this.collection.locked })) {
                    return wrapped(...args);
                }
            } else
                wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Compendium.prototype._onClickEntry", clickCompendiumEntry, "MIXED");
        } else {
            const oldOnClickEntry = Compendium.prototype._onClickEntry;
            Compendium.prototype._onClickEntry = function (event) {
                return clickCompendiumEntry.call(this, oldOnClickEntry.bind(this), ...arguments);
            }
        }

        let createJournalEntry = async function (wrapped, ...args) {
            let [data, options, userid] = args;
            if (game.user.id !== userid)
                return;

            MonksEnhancedJournal.fixType(this);

            if (MonksEnhancedJournal.compendium !== true && !MonksEnhancedJournal.openJournalEntry(this, options))
                return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalEntry.prototype._onCreate", createJournalEntry, "MIXED");
        } else {
            const oldOnCreate = JournalEntry.prototype._onCreate;
            JournalEntry.prototype._onCreate = function (event) {
                return createJournalEntry.call(this, oldOnCreate.bind(this), ...arguments);
            }
        }

        /*
        let oldOnCreateDocument = JournalDirectory.prototype._onCreateDocument;
        JournalDirectory.prototype._onCreateDocument = async function (event) {
            let result = oldOnCreateDocument.call(this, event).then((html) => {
                log('create document', html);
            });
            log(result);
        }*/

        let stripData = function(data) {
            if (data.flags['monks-enhanced-journal'] != undefined) {
                for (let [k, v] of Object.entries(data.flags['monks-enhanced-journal'])) {
                    if (v.notes != undefined)
                        delete data.flags['monks-enhanced-journal'][k];
                }

                if (data.flags['monks-enhanced-journal']?.type == 'encounter' && data.flags['monks-enhanced-journal'].items) {
                    for (let item of data.flags['monks-enhanced-journal'].items) {
                        delete item.received;
                    }
                }
            }

            return data;
        }

        let oldToCompendium = JournalEntry.prototype.toCompendium;
        JournalEntry.prototype.toCompendium = function (pack) {
            return stripData(oldToCompendium.call(this, pack));
        }

        let oldImportDocument = CompendiumCollection.prototype.importDocument;
        CompendiumCollection.prototype.importDocument = function (document) {
            MonksEnhancedJournal.compendium = true;
            return oldImportDocument.call(this, document).then((data) => {
                if (document.documentName == 'JournalEntry' && document.data.flags['monks-enhanced-journal']) {
                    //make sure that Enhanced Journal info is added
                    let update = stripData(duplicate(document.data));
                    data.update({ 'flags.monks-enhanced-journal': update.flags['monks-enhanced-journal'] });
                }
                MonksEnhancedJournal.compendium = false;
                return data;
            });
        }

        let oldImportFromCompendium = Journal.prototype.importFromCompendium;
        Journal.prototype.importFromCompendium = async function (pack, id, updateData = {}, options = {}) {
            MonksEnhancedJournal.compendium = true;
            return oldImportFromCompendium.call(this, pack, id, updateData, options).then(async (data) => {
                if (pack.documentName == 'JournalEntry') {
                    //make sure that Enhanced Journal info is added
                    const document = await pack.getDocument(id);
                    if (document.data.flags['monks-enhanced-journal']) {
                        await data.update({ 'flags.monks-enhanced-journal': document.data.flags['monks-enhanced-journal'] });
                        ui.journal.render();
                    }
                }
                MonksEnhancedJournal.compendium = false;
                return data;
            });
        }

        DocumentSheetConfig.prototype._updateObject = async function (event, formData) {
            event.preventDefault();
            const original = this.getData({});

            let fromEnhancedJournal = (this.object._sheet == null);

            // De-register the current sheet class
            const sheet = this.object.sheet;
            await sheet.close();
            this.object._sheet = null;
            delete this.object.apps[sheet.appId];

            // Update world settings
            if (game.user.isGM && (formData.defaultClass !== original.defaultClass)) {
                const setting = await game.settings.get("core", "sheetClasses") || {};
                const type = this.object.data.type || CONST.BASE_DOCUMENT_TYPE;
                foundry.utils.mergeObject(setting, { [`${this.object.documentName}.${type}`]: formData.defaultClass });
                await game.settings.set("core", "sheetClasses", setting);
            }

            // Update the document-specific override
            if (formData.sheetClass !== original.sheetClass) {
                await this.object.setFlag("core", "sheetClass", formData.sheetClass);
            }

            // Re-draw the updated sheet
            if (!fromEnhancedJournal)
                this.object.sheet.render(true);
        }

        let canView = function (wrapped, ...args) {
            let [ user ] = args;
            if (!user.isGM && this.data.flags['monks-enhanced-journal']?.chatbubble)
                return true;
            else
                return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Token.prototype._canView", canView, "MIXED");
        } else {
            const oldCanView = Token.prototype._canView;
            Token.prototype._canView = function (event) {
                return canView.call(this, oldCanView.bind(this), ...arguments);
            }
        }

        let onTokenClickLeft2 = function (wrapped, ...args) {
            if (!game.user.isGM && this.data.flags['monks-enhanced-journal']?.chatbubble && !this.isOwner) {
                let journal = game.journal.get(this.data.flags['monks-enhanced-journal']?.chatbubble);
                if(journal)
                    MonksEnhancedJournal.showAsChatBubble(this, journal);
            }
            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Token.prototype._onClickLeft2", onTokenClickLeft2, "WRAPPER");
        } else {
            const oldOnClickEntry2 = Token.prototype._onClickLeft2;
            Token.prototype._onClickLeft2 = function (event) {
                return onTokenClickLeft2.call(this, oldOnClickEntry2.bind(this), ...arguments);
            }
        }

        let onSceneContextMenu = function (wrapped, ...args) {
            let context = wrapped(...args);

            let menu = context.find(c => c.name == "SCENES.Notes");
            if (menu) {
                let oldcallback = 
                menu.callback = (li) => {
                    const scene = game.scenes.get(li.data("sceneId"));
                    const entry = scene.journal;
                    if (entry) {
                        if (!MonksEnhancedJournal.openJournalEntry(entry)) {
                            const sheet = entry.sheet;
                            sheet.options.sheetMode = "text";
                            sheet.render(true);
                        }
                    }
                }
            }

            return context;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "SceneNavigation.prototype._getContextMenuOptions", onSceneContextMenu, "WRAPPER");
        } else {
            const oldSceneContextMenu = SceneNavigation.prototype._getContextMenuOptions;
            SceneNavigation.prototype._getContextMenuOptions = function (event) {
                return onSceneContextMenu.call(this, oldSceneContextMenu.bind(this), ...arguments);
            }
        }

        let notesOnDropData = async function(...args) {
            let [ event, data ] = args;
            // Acquire Journal entry
            let entry = await JournalEntry.fromDropData(data);
            if (entry.compendium) {
                const journalData = game.journal.fromCompendium(entry);
                entry = await JournalEntry.implementation.create(journalData);
            }

            // Get the world-transformed drop position
            const coords = this._canvasCoordinatesFromDrop(event);
            if (!coords) return false;
            const noteData = { entryId: entry.id, x: coords[0], y: coords[1] };
            if (entry.type == 'shop')
                noteData.icon = "icons/svg/hanging-sign.svg";
            else if (entry.type == 'loot')
                noteData.icon = "icons/svg/chest.svg";
            else if (entry.type == 'encounter')
                noteData.icon = "icons/svg/sword.svg";
            else if (entry.type == 'place')
                noteData.icon = "icons/svg/village.svg";

            return this._createPreview(noteData, { top: event.clientY - 20, left: event.clientX + 40 });
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "NotesLayer.prototype._onDropData", notesOnDropData, "OVERRIDE");
        } else {
            NotesLayer.prototype._onDropData = function (event) {
                return notesOnDropData.call(this, ...arguments);
            }
        }

        //Make sure that players can't see inline links that they don't know about.
        if (setting("hide-inline")) {
            let oldCreateContentLink = TextEditor._createContentLink;
            TextEditor._createContentLink = function (match, type, target, name) {
                if (CONST.DOCUMENT_TYPES.includes(type)) {
                    const collection = game.collections.get(type);
                    const doc = /^[a-zA-Z0-9]{16}$/.test(target) ? collection.get(target) : collection.getName(target);

                    if (doc && !doc.testUserPermission(game.user, "OBSERVER"))
                        return document.createElement('span');
                }

                return oldCreateContentLink.call(this, match, type, target, name);
            }
        }

        Handlebars.registerHelper({ selectGroups: MonksEnhancedJournal.selectGroups });
    }

    static async fixItems(reset = false) {
        let isFix = false;

        let doFix = async (items, actor) => {
            return (await Promise.all(items.map(async (i) => {
                if (i._id) return i;
                //if (i?.uuid?.indexOf('Actor') >= 0) return null;

                let doc;
                if (i.uuid)
                    doc = await fromUuid(i.uuid);
                else {
                    doc = game.items.get(i.id);
                    if (!doc && actor)
                        doc = actor.items.get(i.id);
                }

                if (doc) {
                    isFix = true;
                    let item = doc.toObject();
                    item.data[MonksEnhancedJournal.quantityname] = (item.data[MonksEnhancedJournal.quantityname]?.hasOwnProperty("value") ? { value: i.qty } : i.qty);
                    item.data[MonksEnhancedJournal.pricename] = (item.data[MonksEnhancedJournal.pricename].hasOwnProperty("value") ? { value: i.price } : i.price);

                    if (i.cost != undefined)
                        item.data.cost = i.cost;
                    if (i.remaining != undefined)
                        item.data.remaining = i.remaining;
                    if (i.lock != undefined)
                        item.lock = i.lock;
                    if (i.hide != undefined)
                        item.hide = i.hide;
                    if (i.received != undefined)
                        item.received = i.received;
                    if (i.assigned != undefined)
                        item.assigned = i.assigned;

                    return item;
                }
            }))).filter(i => !!i);
        }

        for (let journal of game.journal) {
            let type = journal.getFlag('monks-enhanced-journal', 'type');
            if (["shop", "encounter", "quest"].includes(type)) {
                isFix = false;
                if (type == "quest") {
                    let rewardFix = false;
                    let rewards = duplicate(journal.getFlag('monks-enhanced-journal', 'rewards') || []);
                    for (let reward of rewards) {
                        isFix = false;

                        if (reset && reward.olditems)
                            reward.items = reward.olditems;

                        let olditems = reward.items || [];
                        let items = await doFix(olditems);
                        if (isFix) {
                            rewardFix = true;
                            reward.olditems = olditems;
                            reward.items = items;
                        }
                    }

                    if (rewardFix)
                        await journal.setFlag('monks-enhanced-journal', 'rewards', rewards);
                } else {
                    if (reset) {
                        if (journal.getFlag('monks-enhanced-journal', 'olditems'))
                            await journal.setFlag('monks-enhanced-journal', 'items', journal.getFlag('monks-enhanced-journal', 'olditems'));
                    }

                    let olditems = journal.getFlag('monks-enhanced-journal', 'items') || [];
                    let actor;
                    if (type == 'shop' && journal.getFlag('monks-enhanced-journal', 'actor')) {
                        let actorData = journal.getFlag('monks-enhanced-journal', 'actor');
                        if (actorData.id) {
                            actorData = actorData.id;
                            await journal.setFlag('monks-enhanced-journal', 'actor', actorData);
                        }

                        actor = game.actors.get(actorData);
                    }

                    let items = await doFix(olditems, actor);
                    if (isFix) {
                        await journal.setFlag('monks-enhanced-journal', 'olditems', olditems);
                        await journal.setFlag('monks-enhanced-journal', 'items', items);
                    }
                }

                if (type == "encounter") {
                    let fixMonsters = false;
                    let monsters = journal.getFlag('monks-enhanced-journal', 'actors') || [];
                    for (let monster of monsters) {
                        if (monster.qty) {
                            monster.quantity = monster.qty;
                            delete monster.qty;
                            fixMonsters = true;
                        }
                    }
                    if (fixMonsters)
                        await journal.setFlag('monks-enhanced-journal', 'actors', monsters);
                }
            } else if (type == "person") {
                //+++fix the actor
            }
        }
    }

    static async fixRelationships() {
        if (setting('fix-relationships')) {
            for (let journal of game.journal) {
                if (["person", "place"].includes(journal.type) && journal.getFlag('monks-enhanced-journal', 'relationships') == undefined) {
                    let actors = journal.getFlag('monks-enhanced-journal', 'actors') || [];
                    let shops = journal.getFlag('monks-enhanced-journal', 'shops') || [];
                    await journal.setFlag('monks-enhanced-journal', 'relationships', actors.concat(shops));
                    //journal.unsetFlag('monks-enhanced-journal', 'actors');
                }

                //cheak to make sure the relationships go both ways
                if (["person", "place", "organization", "shop", "quest"].includes(journal.type)) {
                    let relationships = journal.getFlag('monks-enhanced-journal', 'relationships') || [];
                    for (let relationship of relationships) {
                        let other = game.journal.get(relationship.id);
                        if (other) {
                            let refs = duplicate(other.getFlag("monks-enhanced-journal", "relationships") || []);
                            if (!refs.find(r => r.id == journal.id)) {
                                log(`Fixing ${other.name}, adding relationship with ${journal.name}`);
                                refs.push({ id: journal.id, hidden: relationship.hidden });
                                other.setFlag("monks-enhanced-journal", "relationships", refs);
                            }
                        }
                    }
                }
            }
        }
    }

    static registerSheetClasses() {
        let types = MonksEnhancedJournal.getDocumentTypes();
        let labels = MonksEnhancedJournal.getTypeLabels();

        for (let [k, v] of Object.entries(labels)) {
            if (CONFIG.JournalEntry.sheetClasses[k] == undefined)
                CONFIG.JournalEntry.sheetClasses[k] = {};
            Journal.registerSheet?.("monks-enhanced-journal", types[k] || JournalEntrySheet, {
                types: [k],
                makeDefault: true,
                label: i18n(v)
            });
        }
        //CONFIG.JournalEntry.sheetClasses.base.JournalEntry.default = false;

        Journal.registerSheet?.("monks-enhanced-journal", JournalEntrySheetTextOnly, {
            types: ["base"],
            makeDefault: false,
            label: i18n("MonksEnhancedJournal.journalentrytextonly")
        });

        game.system.documentTypes.JournalEntry = game.system.documentTypes.JournalEntry.concat(Object.keys(types)).sort();
        CONFIG.JournalEntry.typeLabels = mergeObject((CONFIG.JournalEntry.typeLabels || {}), labels);
    }

    static showAsChatBubble(object, journal) {
        let content = journal.data.content;
        let $el = $(content);

        let text = '';
        let tagName = $el.prop("tagName").toLowerCase();
        if (tagName == 'ul' || tagName == 'ol') {
            let items = $('li', $el);
            let idx = 0;
            if (tagName == 'ul') {
                idx = Math.floor(Math.random() * items.length);
            } else {
                idx = object.data.flags['monks-enhanced-journal']?.chatbubbleidx || 0;
                idx = (idx + 1) % items.length;
                idx = Math.clamped(idx, 0, items.length - 1);
                if (game.user.isGM)
                    object.document.setFlag('monks-enhanced-journal', 'chatbubbleidx', idx);
                else
                    MonksEnhancedJournal.emit("setChatBubbleIdx", { uuid: object.uuid, idx: idx });
            }
            text = items[idx].innerHTML;
        } else {
            text = content;
        }

        if (!object.w)
            object.w = 0;

        canvas.hud.bubbles.say(object, text);
    }

    static openObjectiveLink(ev) {
        let id = $(ev.currentTarget).closest('li')[0].dataset.documentId;
        let document = game.journal.get(id);
        if (!MonksEnhancedJournal.openJournalEntry(document))
            return document.sheet.render(true);
    }

    static openJournalEntry(document, options = {}) {
        if (!game.user.isGM && !setting('allow-player'))
            return false;

        if (game.modules.get('monks-common-display')?.active) {
            let data = game.settings.get("monks-common-display", 'playerdata');
            let playerdata = data[game.user.id] || { display: false, mirror: false, selection: false };

            if (playerdata.display)
                return false;
        }

        if (document) {
            if (document.data?.content?.includes('QuickEncountersTutorial'))
                return false;

            MonksEnhancedJournal.fixType(document);

            let sheet = (!document?._sheet ? document?._getSheetClass() : document?._sheet);
            if (sheet?.constructor?.name == 'QuestPreviewShim')
                return false;
            if (document.data.flags["forien-quest-log"] && game.modules.get('forien-quest-log')?.active)
                return false;
        }

        if (options.render == false || options.activate == false)
            return false;

        const allowed = Hooks.call(`openJournalEntry`, document, options, game.user.id);
        if (allowed === false)
            return false;

        if (!game.user.isGM && document?.getUserLevel(game.user) === CONST.ENTITY_PERMISSIONS.LIMITED) {
            if (document.data.img) {
                let img = new ImagePopout(document.data.img, {
                    title: document.name,
                    uuid: document.uuid,
                    shareable: false,
                    editable: false
                });
                img._render(true);
            } else
                ui.notifications.warn(`You do not have permission to view this ${document.documentName} sheet.`);
            return true;
        }

        //if the enhanced journal is already open, then just pass it the new object, if not then let it render as normal
        if (MonksEnhancedJournal.journal) {
            if (document)
                MonksEnhancedJournal.journal.open(document, options.newtab);
            else
                MonksEnhancedJournal.journal.render(true);
        }
        else
            MonksEnhancedJournal.journal = new EnhancedJournal(document).render(true);

        return true;
    }

    static selectGroups(choices, options) {
        const localize = options.hash['localize'] ?? false;
        let selected = options.hash['selected'] ?? null;
        let blank = options.hash['blank'] || null;
        selected = selected instanceof Array ? selected.map(String) : [String(selected)];

        // Create an option
        const option = (groupid, id, label) => {
            if (localize) label = game.i18n.localize(label);
            let key = (groupid ? groupid + ":" : "") + id;
            let isSelected = selected.includes(key);
            html += `<option value="${key}" ${isSelected ? "selected" : ""}>${label}</option>`
        };

        // Create the options
        let html = "";
        if (blank) option("", blank);
        if (choices instanceof Array) {
            for (let group of choices) {
                let label = (localize ? game.i18n.localize(group.text) : group.text);
                html += `<optgroup label="${label}">`;
                Object.entries(group.groups).forEach(e => option(group.id, ...e));
                html += `</optgroup>`;
            }
        } else {
            Object.entries(group.groups).forEach(e => option(...e));
        }
        return new Handlebars.SafeString(html);
    }

    static _createRequestRoll(match, command, options, name, ...args) {
        // Define default inline data
        let [request, ...props] = options.split(' ');

        let dataset = {
            requesttype: command,
            request: request,
        }

        if (command == "Contested") {
            dataset.request1 = props[0];
        }

        let dc = props.filter(p => $.isNumeric(p) || p.toLowerCase().startsWith('dc')).map(p => !$.isNumeric(p) ? parseInt(p.toLowerCase().replace('dc:', '')) : p);
        if (dc.length)
            dataset.dc = parseInt(dc[0]);
        let rollmode = props.filter(p => { if ($.isNumeric(p)) return false; return p.toLowerCase().startsWith('rollmode') }).map(p => p.toLowerCase().replace('rollmode:', ''));
        if (rollmode.length) {
            if (["roll", "gmroll", "blindroll", "selfroll"].includes(rollmode[0]))
                dataset.rollmode = rollmode;
        }
        if (props.find(p => p == 'silent') != undefined)
            dataset.silent = true;
        if (props.find(p => p == 'fastForward') != undefined)
            dataset.fastForward = true;
        if (name)
            dataset.flavor = name;

        const data = {
            cls: ["inline-request-roll"],
            title: `Request Roll: ${request} ${dc}`,
            label: name || 'Request Roll',
            dataset: dataset
        };

        // Construct and return the formed link element
        const a = document.createElement('a');
        a.classList.add(...data.cls);
        a.title = data.title;
        for (let [k, v] of Object.entries(data.dataset)) {
            a.dataset[k] = v;
        }
        a.innerHTML = `<i class="fas fa-dice-d20"></i> ${data.label}`;
        return a;
    }

    static _createPictureLink(match, type, target, name) {
        const data = {
            cls: ["picture-link"],
            icon: 'fas fa-image',
            dataset: {},
            name: name
        };
        let broken = false;

        const doc = /^[a-zA-Z0-9]{16}$/.test(target) ? game.journal.get(target) : game.journal.getName(target);
        if (!doc) broken = true;

        if (!doc.testUserPermission(game.user, "OBSERVER"))
            return document.createElement('span');

        // Update link data
        data.name = data.name || (broken ? target : doc.name);
        data.dataset = { entity: 'JournalEntry', id: broken ? null : doc.id };

        // Flag a link as broken
        if (broken) {
            data.icon = "fas fa-unlink";
            data.cls.push("broken");
        }

        // Construct the formed link
        const a = document.createElement('a');
        a.classList.add(...data.cls);
        a.draggable = true;
        for (let [k, v] of Object.entries(data.dataset)) {
            a.dataset[k] = v;
        }
        a.innerHTML = `<i class="${data.icon}"></i> ${data.name}`;
        return a;
    }

    static async ready() {
        game.socket.on(MonksEnhancedJournal.SOCKET, MonksEnhancedJournal.onMessage);

        MonksEnhancedJournal.registerSheetClasses();

        for (let entry of game.journal) {
            if (entry.data?.flags['monks-enhanced-journal']?.type) {
                MonksEnhancedJournal.fixType(entry);
            }
        }

        if (game.user.isGM) {
            MonksEnhancedJournal.fixItems();
            MonksEnhancedJournal.fixRelationships();
        }

        $('<div>').attr('id', 'slideshow-canvas').addClass('monks-journal-sheet flexrow').append($('<div>').addClass('slideshow-container flexcol playing').append($('<div>').addClass('slide-showing'))).append($('<div>').addClass('slide-padding')).appendTo($('body'));
        //new SlideshowWindow().render(true);
        new ResizeObserver(() => {
            //change font size to match height
            let size = $('#slideshow-canvas .slide-textarea').outerHeight() / 20;
            $('#slideshow-canvas .slide-textarea').css({ 'font-size': `${size}px` });
        }).observe($('#slideshow-canvas')[0]);
        //this.journal = new EnhancedJournal();
        //this.hookSwapMode();
        //Hooks.on("closeJournalSheet", (app, html, data) => {
        //    this._onJournalRemoved(app);
        //});
        //Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Oswald=oswald; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats
        let font_formats = (CONFIG.TinyMCE.font_formats || '').split(';').reduce((obj, f, index) => { let parts = f.split('='); if (parts[0] && parts[1]) obj[parts[0]] = parts[1]; return obj; }, {});
        mergeObject(font_formats, {
            'Andale Mono':'andale mono, times',
            'Arial':'arial, helvetica, sans- serif',
            'Arial Black':'arial black, avant garde',
            'Book Antiqua':'book antiqua, palatino',
            'Comic Sans MS':'comic sans ms, sans - serif',
            'Courier New':'courier new, courier',
            'Georgia':'georgia, palatino',
            'Helvetica':'helvetica',
            'Impact':'impact, chicago',
            'Oswald':'oswald',
            'Symbol':'symbol',
            'Tahoma':'tahoma, arial, helvetica, sans - serif',
            'Terminal':'terminal, monaco',
            'Times New Roman':'times new roman, times',
            'Trebuchet MS':'trebuchet ms, geneva',
            'Verdana':'verdana, geneva',
            'Webdings':'webdings',
            'Wingdings':'wingdings, zapf dingbats',
            'Anglo Text': 'anglo_textregular',
            'Lovers Quarrel': 'lovers_quarrelregular',
            'Play': 'Play - Regular'
        });
        CONFIG.TinyMCE.font_formats = Object.entries(font_formats).map(([k, v]) => k + '=' + v).join(';');

        //CONFIG.TinyMCE.font_formats = CONFIG.TinyMCE.font_formats = (CONFIG.TinyMCE.font_formats ? CONFIG.TinyMCE.font_formats + ";" : "") + "Anglo Text=anglo_textregular;Lovers Quarrel=lovers_quarrelregular;Play=Play-Regular";

        tinyMCE.PluginManager.add('background', backgroundinit);

        if (game.modules.get("polyglot")?.active && !isNewerVersion(game.modules.get("polyglot").data.version, "1.7.30")) {
            let root = $('<div>').attr('id', 'enhanced-journal-fonts').appendTo('body');
            for (let [k, v] of Object.entries(polyglot.polyglot.LanguageProvider.alphabets)) {
                $('<span>').attr('lang', k).css({ font: v }).appendTo(root);
            }
        }
    }

    static getIcon(type) {
        switch (type) {
            case 'picture': return 'fa-image';
            case 'person': return 'fa-user';
            case 'place': return 'fa-place-of-worship';
            case 'slideshow': return 'fa-photo-video';
            case 'encounter': return 'fa-toolbox';
            case 'quest': return 'fa-map-signs';
            case 'journalentry': return 'fa-book-open';
            case 'actor': return 'fa-users';
            case 'organization': return 'fa-flag';
            case 'shop': return 'fa-dolly-flatbed';
            case 'loot': return 'fa-donate';
            case 'poi': return 'fa-map-marker-alt';
            case 'checklist': return 'fa-list';
            default:
                return 'fa-book-open';
        }
    }

    static onMessage(data) {
        MonksEnhancedJournal[data.action].call(MonksEnhancedJournal, data);
    }

    static saveUserData(data) {
        if (game.user.isGM) {
            let document = game.journal.get(data.documentId);
            let update = {};
            update["flags.monks-enhanced-journal." + data.userId] = data.userdata;

            document.update(update);
        }
    }

    static async showEntry(data) {
        if (data.users == undefined || data.users.includes(game.user.id)) {
            //show an entry
            if (data.image != undefined) {
                let img = new ImagePopout(data.image, {
                    title: data.title,
                    uuid: data.uuid,
                    shareable: false,
                    editable: false
                });
                await img._render(true);
                $(img.element).attr('data-show-id', data.showid);
            } else {
                Journal._showEntry(data.uuid, null, true);
            }
        }
    }

    static async setChatBubbleIdx(data) {
        let object = await fromUuid(data.uuid);
        if(object)
            object.setFlag('monks-enhanced-journal', 'chatbubbleidx', data.idx);
    }

    static cancelShow(data) {
        let app = $('.image-popout[data-show-id="' + data.showid + '"]');
        if (app.length > 0) {
            $('.window-header .close', app).click();
        } else {
            //check to see if this is a tab
        }
    }

    static async playSlideshow(data) {
        if (!game.user.isGM) {
            //clear any old ones
            if (MonksEnhancedJournal.slideshow != undefined && MonksEnhancedJournal.slideshow.id != data.id)
                MonksEnhancedJournal.stopSlideshow();

            let slideshow = game.journal.find(e => e.id == data.id);
            if (slideshow) {
                MonksEnhancedJournal.slideshow = {
                    id: data.id,
                    object: slideshow,
                    content: slideshow.data.flags["monks-enhanced-journal"]
                }

                let showas = MonksEnhancedJournal.slideshow.content.showas;
                if (showas == 'window') {
                    //if for some reason the slideshow window isn't there, recreate it
                    if ($('#slideshow-display').length == 0) {
                        let display = new SlideshowWindow();
                        await display._render(true);
                        new ResizeObserver(() => {
                            //change font size to match height
                            let size = $('#slideshow-display .slide-textarea').outerHeight() / 20;
                            $('#slideshow-display .slide-textarea').css({ 'font-size': `${size}px` });
                        }).observe($('#slideshow-display')[0]);
                    }
                    $('#slideshow-display header h4.window-title').html(MonksEnhancedJournal.slideshow.object.data.name)
                    MonksEnhancedJournal.slideshow.element = $('#slideshow-display');
                } else {
                    MonksEnhancedJournal.slideshow.element = $('#slideshow-canvas');
                    $('.slide-padding', MonksEnhancedJournal.slideshow.element).css({ flex: '0 0 ' + $('#sidebar').width() + 'px' });
                    MonksEnhancedJournal.slideshow.element.toggleClass('fullscreen', showas == 'fullscreen');
                }
                MonksEnhancedJournal.slideshow.element.addClass('active');

                if (MonksEnhancedJournal.slideshow.content.audiofile != undefined && MonksEnhancedJournal.slideshow.content.audiofile != '' && MonksEnhancedJournal.slideshow.sound == undefined)
                    AudioHelper.play({ src: MonksEnhancedJournal.slideshow.content.audiofile, loop: true }).then((sound) => {
                        if (MonksEnhancedJournal.slideshow)
                            MonksEnhancedJournal.slideshow.sound = sound;
                        return sound;
                    });

                if (data.idx != undefined)
                    MonksEnhancedJournal.playSlide(data);
            }
        }
    }

    static playSlide(data) {
        //start up a new slideshow if there isn't one
        if (MonksEnhancedJournal.slideshow == undefined) {
            MonksEnhancedJournal.playSlideshow(data);
        }

        if (MonksEnhancedJournal.slideshow != undefined) {
            if (MonksEnhancedJournal.slideshow.element == undefined) {
                MonksEnhancedJournal.slideshow.callback = data;
            } else {
                let slide = MonksEnhancedJournal.slideshow.content.slides[data.idx];

                //remove any that are still on the way out
                $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).remove();

                //remove any old slides
                let oldSlide = $('.slide-showing .slide', MonksEnhancedJournal.slideshow.element);
                oldSlide.addClass('out').animate({ opacity: 0 }, 1000, 'linear', function () { $(this).remove() });

                //bring in the new slide
                let newSlide = MonksEnhancedJournal.createSlide(slide);
                $('.slide-textarea', newSlide).css({ 'font-size': '48px' });
                $('.slide-showing', MonksEnhancedJournal.slideshow.element).append(newSlide);
                if (newSlide)
                    newSlide.css({ opacity: 0 }).animate({ opacity: 1 }, 1000, 'linear');

                for (let text of slide.texts) {
                    if ($.isNumeric(text.fadein)) {
                        window.setTimeout(function () {
                            if (MonksEnhancedJournal.slideshow)
                                $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).animate({ opacity: 1 }, 500, 'linear');
                        }, text.fadein * 1000);
                    }
                    if ($.isNumeric(text.fadeout)) {
                        window.setTimeout(function () {
                            if (MonksEnhancedJournal.slideshow)
                                $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).animate({ opacity: 0 }, 500, 'linear');
                        }, text.fadeout * 1000);
                    }
                }
            }
        }
    }

    static stopSlideshow(data) {
        if (!game.user.isGM) {
            if (MonksEnhancedJournal.slideshow != undefined) {
                MonksEnhancedJournal.slideshow?.element?.removeClass('active');
                if (MonksEnhancedJournal.slideshow?.element.attr('id') == "slideshow-display")
                    $('.close', MonksEnhancedJournal.slideshow?.element).click();

                if (MonksEnhancedJournal.slideshow?.sound?.src != undefined) {
                    MonksEnhancedJournal.slideshow?.sound.stop();
                }
                delete MonksEnhancedJournal.slideshow;
            }
        }
    }

    static createSlide(slide) {
        if (slide == undefined)
            return false;

        let background = '';
        if (slide.background?.color == '')
            background = `background-image:url(\'${slide.img}\');`;
        else
            background = `background-color:${slide.background?.color}`;

        let textarea = $('<div>').addClass('slide-textarea');
        for (let t of slide.texts) {
            
            let style = {
                color: t.color,
                'background-color': hexToRGBAString(colorStringToHex(t.background || '#000000'), (t.opacity != undefined ? t.opacity : 0.5)),
                'text-align': (t.align == 'middle' ? 'center' : t.align),
                top: (t.top || 0) + "%",
                left: (t.left || 0) + "%",
                right: (t.right || 0) + "%",
                bottom: (t.bottom || 0) + "%",
            };
            if ($.isNumeric(t.fadein))
                style.opacity = 0;

            textarea.append($('<div>').addClass('slide-text').attr({'data-id': t.id}).html(t.text).css(style));
        }

        return $('<div>').addClass("slide").attr('data-slide-id', slide.id)
            .append($('<div>').addClass('slide-background').append($('<div>').attr('style', background)))
            .append($('<img>').addClass('slide-image').attr('src', slide.img).css({ 'object-fit': slide.sizing}))
            .append(textarea);
    }

    static refreshObjectives() {
        let display = $('#objective-display').empty();

        if (setting('show-dialog')) {
            let quests = $('<ul>');
            //find all in progress quests
            for (let quest of game.journal) {
                if (quest.getFlag('monks-enhanced-journal', 'type') == 'quest' && quest.testUserPermission(game.user, "OBSERVER") && quest.getFlag('monks-enhanced-journal', 'display') && quest.getFlag('monks-enhanced-journal', 'display')) {
                    //find all objectives
                    let objectives = $('<ul>');
                    $('<li>')
                        .attr('data-document-id', quest.id)
                        .append(quest.getFlag('monks-enhanced-journal', 'completed') ? '<i class="fas fa-check"></i> ' : '')
                        .append(`<b>${quest.name}</b>`)
                        .append(objectives)
                        .on('click', MonksEnhancedJournal.openObjectiveLink.bind(this))
                        .appendTo(quests);

                    if (setting('use-objectives')) {
                        for (let objective of (quest.getFlag('monks-enhanced-journal', 'objectives') || [])) {
                            if (objective.available) {
                                let li = $('<li>').addClass('flexrow').append($('<span>').html(objective.title || objective.content)).attr('completed', objective.status);
                                if ($.isNumeric(objective.required))
                                    li.append($('<span>').html(`${objective.done || 0}/${objective.required}`).css({ 'flex': '0 0 50px', 'text-align': 'right' }));
                                objectives.append(li);
                            }
                        }
                    }
                }
            }

            if (quests.children().length > 0) {
                display.append($('<div>').addClass('title').html('Quests')).append(quests);
            }
        }
    }

    static updateDirectory(html) {
        if (setting("show-folder-sort")) {
            $('.folder', html).each(function () {
                let id = this.dataset.folderId;
                const folder = game.folders.get(id);

                if (folder.data?.sorting !== "a") {
                    $('header h3 i', this).removeClass('fas').addClass('far');
                }
            });
        }
        $('.document.journalentry', html).each(function () {
            let id = this.dataset.documentId;
            let document = game.journal.get(id);
            let type = document.getFlag('monks-enhanced-journal', 'type');// || (entry.data.img != "" && entry.data.content == "" ? 'picture' : 'journalentry'); //we'll add the picture later
            let icon = MonksEnhancedJournal.getIcon(type);

            if ($('.document-name .journal-type', this).length)
                $('.document-name .journal-type', this).attr('class', 'journal-type fas fa-fw ' + icon);
            else
                $('.document-name', this).prepend($('<i>').addClass('journal-type fas fa-fw ' + icon));

            if (type == 'quest') {
                //let permission = entry.data.permission.default;
                //let completed = entry.getFlag('monks-enhanced-journal', 'completed');
                let status = document.getFlag('monks-enhanced-journal', 'status') || (document.getFlag('monks-enhanced-journal', 'completed') ? 'completed' : 'inactive');
                $(this).attr('status', status);
            }

            $('.document-name .permissions', this).remove();
            if (setting('show-permissions') && game.user.isGM && (document.data.permission.default > 0 || Object.keys(document.data.permission).length > 1)) {
                let permissions = $('<div>').addClass('permissions');
                if (document.data.permission.default > 0) {
                    const permission = Object.keys(CONST.ENTITY_PERMISSIONS)[document.data.permission.default];
                    permissions.append($('<i>').addClass('fas fa-users').attr('title', 'Everyone: ' + i18n(`PERMISSION.${permission}`)));
                }
                else {
                    for (let [key, value] of Object.entries(document.data.permission)) {
                        let user = game.users.find(u => {
                            return u.id == key && !u.isGM;
                        });
                        if (user != undefined && value > 0) {
                            const permission = Object.keys(CONST.ENTITY_PERMISSIONS)[value];
                            permissions.append($('<div>').css({ backgroundColor: user.data.color }).html(user.name[0]).attr('title', user.name + ': ' + i18n(`PERMISSION.${permission}`)));
                        }
                    }
                }
                $('h4', this).append(permissions);
            }
        });

        /*
        $('.folder', html).each(function () {
            let id = this.dataset.folderId;
            let folder = ui.journal.folders.find(e => e.id == id);

            if (folder) {
                let type = folder.getFlag('monks-enhanced-journal', 'defaulttype');
                if (type && type != 'journalentry') {
                    let icon = MonksEnhancedJournal.getIcon(type);

                    $('<span>').addClass('default-type').html(`<i class="fas ${icon}"></i>`).insertBefore($('.create-folder', this));
                }
            }
        });*/
    }

    static purchaseItem(data) {
        if (game.user.isGM) {
            let entry = game.journal.get(data.shopid);
            let actor = game.actors.get(data.actorid);

            if (entry && actor) {
                const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
                if (cls && cls.purchaseItem) {
                    cls.purchaseItem.call(cls, entry, data.itemid, actor, data.quantity, data.user);
                    if (data.purchase === true) {
                        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == data.itemid);
                        if (item) {
                            let price = cls.getPrice(item.data.cost);
                            price.value = price.value * (data.quantity ?? 1);
                            cls.actorPurchase(price, actor);
                        }
                    }
                }
            }
        }
    }

    static requestLoot(data) {
        if (game.user.isGM) {
            let entry = game.journal.get(data.shopid);
            let actor = game.actors.get(data.actorid);

            if (entry && actor) {
                let items = duplicate(entry.getFlag('monks-enhanced-journal', 'items') || []);
                let item = items.find(i => i._id == data.itemid);
                if (item) {
                    let requests = item.requests || {};
                    requests[data.senderId] = !requests[data.senderId];
                    item.requests = requests;
                }
                entry.setFlag('monks-enhanced-journal', 'items', items);
            }
        }
    }

    static addItem(data) {
        if (game.user.isGM) {
            let entry = game.journal.get(data.lootid);
            const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
            const sheet = new cls(entry, { render: false });

            sheet.addItem(data.itemdata);
        }
    }

    static async sellItem(data) {
        if (game.user.isGM) {
            let entry = game.journal.get(data.shopid);
            const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
            const sheet = new cls(entry, { render: false });

            sheet.addItem({ data: data.itemdata });
        }
    }

    static findVacantSpot(pos, size) {
        let ring = 0;
        let width = size.width * canvas.scene.data.size;
        let height = size.height * canvas.scene.data.size;

        let tokenCollide = function (pt) {
            let rect1 = { x1: pt.x + 10, y1: pt.y + 10, x2: pt.x + width - 10, y2: pt.y + height - 10 };
            let found = canvas.scene.tokens.find(tkn => {
                let rect2 = { x1: tkn.data.x + 10, y1: tkn.data.y + 10, x2: tkn.data.x + (tkn.data.width * canvas.scene.data.size) - 10, y2: tkn.data.y + (tkn.data.height * canvas.scene.data.size) - 10 };

                return !(rect1.x2 < rect2.x1 || rect1.x1 > rect2.x2 || rect1.y1 > rect2.y2 || rect1.y2 < rect2.y1);
            })

            return found != undefined;
        }

        pos = {
            x: (Math.floor(pos.x / canvas.scene.data.size) * canvas.scene.data.size) + (width / 2),
            y: (Math.floor(pos.y / canvas.scene.data.size) * canvas.scene.data.size) + (height / 2)
        };
        let spot = null;

        while (spot == undefined && ring < 10) {
            for (let x = -ring; x <= ring; x++) {
                for (let y = -ring; y <= ring; y++) {
                    if (Math.abs(x) == ring || Math.abs(y) == ring) {
                        let checkspot = { x: pos.x + (x * canvas.scene.data.size), y: pos.y + (y * canvas.scene.data.size) };

                        //is this on the other side of a wall?
                        let ray = new Ray({ x: pos.x, y: pos.y }, { x: checkspot.x, y: checkspot.y });
                        if (canvas.walls.checkCollision(ray))
                            continue;

                        //are there any tokens at this position?
                        checkspot.x -= (width / 2);
                        checkspot.y -= (height / 2);
                        if (tokenCollide(checkspot))
                            continue;

                        spot = checkspot;
                        break;
                    }
                }

                if (spot != undefined)
                    break;
            }
            ring++;
        }

        if (spot == undefined) {
            spot.x = pos.x - (width / 2);
            spot.y = pos.y - (height / 2);
        }

        return spot;
    }

    static notify(data) {
        if (game.user.isGM) {
            ui.notifications.info(`${data.actor} requested a ${data.item}`);
        }
    }

    static async acceptItem(status) {
        let message = this;

        let content = $(message.data.content);
  
        let offered = message.getFlag('monks-enhanced-journal', 'offered');
        let approved = message.getFlag('monks-enhanced-journal', 'approved');
        let accepted = message.getFlag('monks-enhanced-journal', 'accepted');

        if (status == 'accept') {
            //find the shop        
            let msgshop = message.getFlag('monks-enhanced-journal', 'shop');
            let entry = game.journal.get(msgshop.id);
            if (!entry)
                return;
            //find the actor
            let msgactor = message.getFlag('monks-enhanced-journal', 'actor');
            let actor = game.actors.get(msgactor.id);
            if (!actor)
                return;

            let action = message.getFlag('monks-enhanced-journal', 'action');
            if (action == "buy") {
                accepted = true;
                let msg = `<span class="request-msg"><i class="fas fa-check"></i> Item has been added to inventory</span>`;
                //find the item
                let msgitems = message.getFlag('monks-enhanced-journal', 'items');
                for (let msgitem of msgitems) {
                    if (msgitem.quantity == 0)
                        continue;
                    let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == msgitem._id);
                    if (!item)
                        continue;

                    if (parseInt(item.data[MonksEnhancedJournal.quantityname]) < msgitem.quantity) {
                        //check to see if there's enough quantity
                        ui.notifications.warn("Cannot transfer this item, not enough of this item remains.");
                        msg = `<span class="request-msg"><i class="fas fa-times"></i> Cannot transfer this item, not enough of this item remains.</span>`
                        continue;
                    }

                    const cls = (entry._getSheetClass ? entry._getSheetClass() : null);

                    if (msgitem.sell > 0) {
                        //check if the player can afford it
                        if (!cls.canAfford((msgitem.sell * msgitem.quantity) + " " + msgitem.currency, actor)) {
                            ui.notifications.warn(`Cannot transfer this item, ${actor.name} cannot afford it.`);
                            msg = `<span class="request-msg"><i class="fas fa-times"></i> Cannot transfer this item, ${actor.name} cannot afford it.</span>`;
                            continue;
                        }
                    }

                    //Add it to the actor
                    let itemData = duplicate(item);
                    if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                        itemData = await cls.createScrollFromSpell(itemData);
                    }
                    itemData.data[MonksEnhancedJournal.quantityname] = msgitem.quantity;
                    if (msgitem.sell > 0)
                        itemData.data[MonksEnhancedJournal.pricename] = msgitem.sell + " " + msgitem.currency;
                    delete itemData._id;
                    actor.createEmbeddedDocuments("Item", [itemData]);
                    //deduct the gold
                    if (msgitem.sell > 0)
                        cls.actorPurchase({ value: (msgitem.sell * msgitem.quantity), currency: msgitem.currency }, actor);
                    cls.purchaseItem.call(cls, entry, item._id, actor, msgitem.quantity, null, 'nochat');
                }

                $('.request-buttons', content).remove();
                $('input', content).remove();
                $('.item-quantity span, .item-price span', content).removeClass('player-only').show();
                $('.card-footer', content).html(msg);
            } else if (action == "sell") {
                if (game.user.isGM) {
                    offered = !offered;
                    approved = false;   //technically this shouldn't happen, but any time the GM changes, the player response should be cancelled
                }
                else
                    approved = !approved;

                $('.card-footer', content).html(`<span class="request-msg">${offered ? 'Shop made an offer, Do you accept?' : 'Shop is considering an offer'}</span>`);

                if (offered && approved) {
                    accepted = true;
                    const cls = (entry._getSheetClass ? entry._getSheetClass() : null);

                    let msgitems = message.getFlag('monks-enhanced-journal', 'items');
                    for (let msgitem of msgitems) {
                        if (msgitem.quantity == 0)
                            continue;

                        let actoritem = actor.items.get(msgitem._id);
                        if (!actoritem)
                            continue;

                        //give the player the money
                        await cls.actorPurchase({ value: -(msgitem.sell * msgitem.quantity), currency: msgitem.currency }, actor);

                        //remove the item from the actor
                        if (msgitem.quantity == msgitem.maxquantity) {
                            await actoritem.delete();
                        } else {
                            let qty = msgitem.maxquantity - msgitem.quantity;
                            let newQty = (actoritem.data.data[MonksEnhancedJournal.quantityname]?.hasOwnProperty("value") ? { value: qty } : qty);
                            let data = {};
                            data[MonksEnhancedJournal.quantityname] = newQty;
                            await actoritem.update({ data: data });
                        }

                        //add the item to the shop
                        msgitem.data.quantity = msgitem.quantity;
                        msgitem.data[MonksEnhancedJournal.pricename] = (msgitem.sell * 2) + " " + msgitem.currency;
                        msgitem.lock = true;
                        msgitem.from = actor.name;
                        delete msgitem.quantity;
                        delete msgitem.sell;
                        delete msgitem.currency;
                        delete msgitem.maxquantity;

                        if (!game.user.isGM)
                            MonksEnhancedJournal.emit("sellItem", { shopid: msgshop.id, itemdata: msgitem });
                        else {
                            const sheet = new cls(entry, { render: false });
                            await sheet.addItem(msgitem);
                        }

                        $('input', content).remove();
                        $('.item-quantity span, .item-price span', content).removeClass('player-only').show();
                        $('.request-buttons', content).remove();
                        $('.card-footer', content).html(`<span class="request-msg"><i class="fas fa-check"></i> Sold to the shop</span>`);
                    }
                }
            }
        } else {
            accepted = false;
            $('.request-buttons', content).remove();
            $('.card-footer', content).html(`<span class="request-msg"><i class="fas fa-times"></i> Sale has been ${(status == 'reject' ? 'rejected' : 'canceled')}</span>`);
        }

        message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { accepted: !!accepted, offered: !!offered, approved: !!approved } } });
    }

    static updateSale(event) {
        let message = this;

        let content = $(message.data.content);
        let id = $(event.currentTarget).closest('li').attr('data-id');

        let items = duplicate(message.getFlag('monks-enhanced-journal', 'items') || []);
        let item = items.find(i => i._id == id);
        if (item == undefined)
            return;

        let html = $(event.currentTarget).closest('ol.items-list');

        item.quantity = parseInt($(`li[data-id="${id}"] input[name="quantity"]`, html).val());
        let sell = $(`li[data-id="${id}"] input[name="sell"]`, html).val();
        let price = ShopSheet.getPrice(sell);

        item.sell = price.value;
        item.currency = price.currency;
        item.total = item.quantity * item.sell;

        $(`li[data-id="${id}"] input[name="sell"]`, html).val(item.sell + ' ' + price.currency);
        $(`li[data-id="${id}"] .item-quantity span`, content).html(item.quantity);
        $(`li[data-id="${id}"] .item-price span`, content).html(item.sell + ' ' + price.currency);
        $(`li[data-id="${id}"] .item-total span`, content).html(item.total + ' ' + price.currency);

        message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { items: items } } });
    }

    static async openRequestItem(type, event) {
        let document;
        if (type == 'actor') {
            document = game.actors.get(this.data.flags['monks-enhanced-journal'].actor.id);
        } else if (type == 'shop') {
            document = game.journal.get(this.data.flags['monks-enhanced-journal'].shop.id);
        } else if (type == 'item') {
            let li = $(event.currentTarget).closest('li')[0]
            document = await fromUuid(li.dataset.uuid);
        }

        if (document)
            document.sheet.render(true);
    }

    static journalListing(ctrl, html, id, name, documentId = 'documentId') {
        function selectItem(event) {
            event.preventDefault();
            event.stopPropagation();
            $(`[name="${documentId}"]`, html).val(this.id);
            $('.journal-select > div > span', html).html(this.name);
            $('.journal-list.open').removeClass('open');
            $(event.currentTarget).addClass('selected').siblings('.selected').removeClass('selected');
        }

        function getFolders(folders) {
            return folders.sort((a, b) => { return a.data.sort < b.data.sort ? -1 : a.data.sort > b.data.sort ? 1 : 0; }).map(f => {
                return $('<li>').addClass('journal-item folder flexcol collapse').append($('<div>').addClass('journal-title').html(f.name)).append(
                    $('<ul>')
                        .addClass('subfolder')
                        .append(getFolders(f.children))
                        .append(f.content
                            .sort((a, b) => { return a.data.sort < b.data.sort ? -1 : a.data.sort > b.data.sort ? 1 : 0; })
                            .map(e => { return $('<li>').addClass('journal-item flexrow').toggleClass('selected', id == e.id).attr('id', e.id).html($('<div>').addClass('journal-title').html(e.name)).click(selectItem.bind(e)) })))
                    .click(function (event) { event.preventDefault(); event.stopPropagation(); $(this).toggleClass('collapse'); });
            });
        }

        let list = $('<ul>')
            .addClass('journal-list')
            .append($('<li>').addClass('journal-item flexrow').toggleClass('selected', !id).attr('id', '').html($('<div>').addClass('journal-title').html('')).click(selectItem.bind({ id: '', name: '' })))
            .append(getFolders(game.journal.directory.folders.filter(f => f.parentFolder == null)))
            .append(game.journal.contents
                .filter(j => j.folder == null)
                .sort((a, b) => { return a.data.sort < b.data.sort ? -1 : a.data.sort > b.data.sort ? 1 : 0; })
                .map(j => { return $('<li>').addClass('journal-item').attr('id', j.id).html($('<div>').addClass('journal-title').html(j.name)).click(selectItem.bind(j)); }));

        return $('<div>')
            .addClass('journal-select')
            .attr('tabindex', '0')
            .append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').html(name)).append($('<i>').addClass('fas fa-chevron-down')))
            .append(list)
            //.focus(function () { list.addClass('open') })
            //.blur(function () { list.removeClass('open') })
            .click(function () { list.toggleClass('open') });
    }

    static convertReward() {
        if (MonksEnhancedJournal.journal) {
            if (!(MonksEnhancedJournal.journal.subsheet instanceof QuestSheet)) {
                console.log('Invalid journal type');
                return;
            }

            let rewards = MonksEnhancedJournal.journal.subsheet.convertRewards();
            MonksEnhancedJournal.journal.object.data.flags['monks-enhanced-journal'].reward = rewards[0].id;
            MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
            MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'reward', rewards[0].id);
            MonksEnhancedJournal.journal.render(true);
        }
    }

    static fixType(object, settype) {
        if (object.documentName == 'JournalEntry') {
            let type = settype || object.data?.flags['monks-enhanced-journal']?.type;
            type = (type == 'journalentry' || type == 'oldentry' ? 'base' : type);

            if (game.modules.get('_document-sheet-registrar')?.active) {
                object.setFlag('_document-sheet-registrar', 'type', type);
                object.data.flags["_document-sheet-registrar"] = { type: type };
                warn(`Lib: Document Sheet Registrar is causing errors with Enhanced Journal.  It's recommended that you disable it`);
            } else {
                object.data.type = type;    //set the type of all entries since Foundry won't save the new type
            }

            return type;
        } else if (object.data?.flags['monks-enhanced-journal']?.type == 'blank') {
            object.data.type = 'blank';
        }
    }

    static getLootSheetOptions(lootType) {
        let lootsheetoptions = { 'monks-enhanced-journal': "Monk's Enhanced Journal" };
        if (game.modules.get("lootsheetnpc5e")?.active)
            lootsheetoptions['lootsheetnpc5e'] = "Loot Sheet NPC 5e";
        if (game.modules.get("merchantsheetnpc")?.active)
            lootsheetoptions['merchantsheetnpc'] = "Merchant Sheet NPC";
        if (game.modules.get("item-piles")?.active)
            lootsheetoptions['item-piles'] = "Item Piles";

        return lootsheetoptions;
    }

    static get config() {
        let system = game.system.id.toUpperCase();
        if (game.system.id == 'dnd4e' && !CONFIG[system])
            system = "DND4EBETA";
        if (game.system.id == 'tormenta20')
            system = "T20";

        return CONFIG[system] || {};
    }

    static get currencies() {
        let system = game.system.id.toUpperCase();
        if (game.system.id == 'dnd4e' && !CONFIG[system])
            system = "DND4EBETA";

        if (game.system.id == "sw5e")
            return { gc: "", cr: "" };
        else if (game.system.id == "swade")
            return { gp: "Gold" };
        else if (game.system.id == "tormenta20")
            return { to: "TO", tp: "T$", tc: "TC"};
        return MonksEnhancedJournal.config.currencies || {};
    }

    static isLootActor(lootsheet) {
        return ['lootsheetnpc5e', 'merchantsheetnpc', 'item-piles'].includes(lootsheet);
    }
}

Hooks.on("renderJournalDirectory", async (app, html, options) => {
    //add journal indicators
    log('rendering journal directory', app, html, options);
    if (MonksEnhancedJournal.journal) {
        let jdir = await MonksEnhancedJournal.journal.renderDirectory();
        MonksEnhancedJournal.updateDirectory(jdir);
    }

    MonksEnhancedJournal.updateDirectory(html);
});

Hooks.on("renderSettingsConfig", (app, html, data) => {
    
    $('[name="monks-enhanced-journal.loot-entity"]', html).on('change', () => {
        //folder is only needed if entity is create
        let sheet = $('[name="monks-enhanced-journal.loot-sheet"]', html).val() || setting('loot-sheet');
        let list = [];

        if (($('[name="monks-enhanced-journal.loot-entity"]', html).val() || setting('loot-entity')) == 'create') {
            list.push({ id: '', name: '' });
            if (MonksEnhancedJournal.isLootActor(sheet)) {
                //find Actors Folders
                for (let entry of game.folders) {
                    if (entry.data.type == 'Actor')
                        list.push({ id: entry.id, name: entry.name });
                }
            } else if (sheet == 'monks-enhanced-journal') {
                //find Journal Entry Folders
                for (let entry of game.folders) {
                    if (entry.data.type == 'JournalEntry')
                        list.push({ id: entry.id, name: entry.name });
                }
            }
        }

        let folderid = setting('loot-folder');
        $('[name="monks-enhanced-journal.loot-folder"]', html).empty().append(list.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); }).map((e) => { return $('<option>').attr('value', e.id).prop('selected', e.id == folderid).html(e.name) }));
    });

    $('[name="monks-enhanced-journal.loot-sheet"]', html).on('change', () => {
        let sheet = $('[name="monks-enhanced-journal.loot-sheet"]', html).val() || setting('loot-sheet');
        let list = [];

        list.push({ id: 'create', name: '-- Create new --' });
        if (MonksEnhancedJournal.isLootActor(sheet)) {
            //find Actors
            for (let entry of game.actors) {
                if (entry.getFlag('core', 'sheetClass') == (sheet == 'lootsheetnpc5e' ? 'dnd5e.LootSheetNPC5e' : (sheet == 'merchantsheetnpc' ? 'core.a' : '')))
                    list.push({ id: entry.id, name: entry.name });
            }
        } else if (sheet == 'monks-enhanced-journal') {
            //find Journal Entries
            for (let entry of game.journal) {
                if (entry.getFlag('monks-enhanced-journal', 'type') == 'loot')
                    list.push({ id: entry.id, name: entry.name });
            }
        }

        let entityid = setting('loot-entity');
        $('[name="monks-enhanced-journal.loot-entity"]', html).empty().append(list.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); }).map((e) => { return $('<option>').attr('value', e.id).prop('selected', e.id == entityid).html(e.name) })).change();
    }).change();
});

Hooks.once("init", async function () {
    MonksEnhancedJournal.init();
});

Hooks.once("ready", async function () {
    MonksEnhancedJournal.ready();

    $('<div>').attr('id', 'objective-display').appendTo('body');
});

Hooks.on("preCreateJournalEntry", (entry, data, options, userId) => {
    let flags = { type: data.type };//(data.type == 'base' ? 'journalentry' : data.type) };
    if (data.type) {
        if (entry.id)
            MonksEnhancedJournal.fixType(entry);
        else {
            if (game.modules.get("_document-sheet-registrar")?.active)
                entry.data.flags["_document-sheet-registrar"] = { type: data.type };
            else
                entry.data.type = data.type;
        }

        const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
        if (cls && cls.defaultObject)
            flags = mergeObject(flags, cls.defaultObject);
    }
    /*
    switch (data.type) {
        case 'encounter':
            flags = mergeObject(flags, EncounterSheet.defaultObject);
            break;
        case 'checklist':
            flags = mergeObject(flags, CheckListSheet.defaultObject);
            break;
        case 'shop':
            flags = mergeObject(flags, ShopSheet.defaultObject);
            break;
        case 'place':
            flags = mergeObject(flags, PlaceSheet.defaultObject);
            break;
        case 'slideshow':
            flags = mergeObject(flags, SlideshowSheet.defaultObject);
            break;
        case 'quest':
            flags = mergeObject(flags, QuestSheet.defaultObject);
            break;
        case 'person':
            flags = mergeObject(flags, PersonSheet.defaultObject);
            break;
    }
    */
    entry.data._source.flags['monks-enhanced-journal'] = flags;
});

Hooks.on("updateJournalEntry", (document, data, options, userId) => {
    let type = document.data.flags['monks-enhanced-journal']?.type;
    if (type == 'quest' && ui.controls.activeControl == 'notes' && setting('show-objectives'))
        MonksEnhancedJournal.refreshObjectives();

    if (MonksEnhancedJournal.journal) {
        if (data.name) {
            MonksEnhancedJournal.journal.updateTabNames(document.uuid, document.name);
        }

        if (MonksEnhancedJournal.journal.tabs.active().entityId?.endsWith(data._id) &&
            (data.content != undefined ||
            data.permission != undefined ||
                (data?.flags && (data?.flags['monks-enhanced-journal']?.actor != undefined ||
                    data?.flags['monks-enhanced-journal']?.actors != undefined ||
                    data?.flags['monks-enhanced-journal']?.relationships != undefined ||
                    data?.flags['monks-enhanced-journal']?.currency != undefined ||
                    data?.flags['monks-enhanced-journal']?.items != undefined ||
                    data?.flags['monks-enhanced-journal']?.type != undefined ||
                    data?.flags['monks-enhanced-journal']?.fields != undefined ||
                    data?.flags['monks-enhanced-journal']?.slides != undefined ||
                    data?.flags['monks-enhanced-journal']?.dcs != undefined ||
                    data?.flags['monks-enhanced-journal']?.traps != undefined ||
                    data?.flags['monks-enhanced-journal']?.objectives != undefined ||
                    data?.flags['monks-enhanced-journal']?.folders != undefined ||
                    data?.flags['monks-enhanced-journal']?.reward != undefined ||
                    data?.flags['monks-enhanced-journal']?.rewards != undefined ||
                    data?.flags['core']?.sheetClass != undefined)))) {
            //if (data?.flags['core']?.sheetClass != undefined)
            //    MonksEnhancedJournal.journal.object._sheet = null;
            MonksEnhancedJournal.journal.render();
        }
    }
});

Hooks.on("deleteJournalEntry", (document, html, userId) => {
    if (MonksEnhancedJournal.journal) {
        MonksEnhancedJournal.journal.deleteEntity(document.uuid);
        if (document.data.flags['monks-enhanced-journal']?.type == 'quest' && ui.controls.activeControl == 'notes' && setting('show-objectives'))
            MonksEnhancedJournal.refreshObjectives();
    }
});

Hooks.on('renderSceneControls', (controls) => {
    let showObjectives = (controls.activeControl == 'notes' && setting('show-objectives'));
    $('#objective-display').toggleClass('active', showObjectives);
    if (showObjectives)
        MonksEnhancedJournal.refreshObjectives();
});

Hooks.on('dropActorSheetData', (actor, sheet, data) => {
    //check to see if an item was dropped from either the encounter or quest and record what actor it was
    if (data.id == MonksEnhancedJournal._dragItem) {
        MonksEnhancedJournal._dragItem = null;
        let entry = game.journal.get(data.journalid);
        const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
        if (cls && cls.itemDropped) {
            cls.itemDropped.call(cls, data.id, actor, entry).then((result) => {
                if (!!result) {
                    data.data.data.quantity = cls.setQuantity(data.data.data.quantity, result);
                    sheet._onDropItem(null, data);
                }
            });

            return false;
        }
    }
});

Hooks.on('dropCanvasData', async (canvas, data) => {
    //check to see if an item was dropped from either the encounter or quest and record what actor it was
    if (MonksEnhancedJournal.journal) {
        if (data.type == 'JournalTab' && data.uuid) {
            let document = await fromUuid(data.uuid);
            if (document)
                document.sheet.render(true);
        } else if (data.type == 'CreateEncounter' || data.type == 'CreateCombat') {
            if (!game.user.can("TOKEN_CREATE")) {
                return ui.notifications.warn(`You do not have permission to create new Tokens!`);
            }

            let encounter = game.journal.get(data.id);
            if (encounter) {
                const cls = (encounter._getSheetClass ? encounter._getSheetClass() : null);
                if (cls && cls.createEncounter) {
                    cls.createEncounter.call(encounter, data.x, data.y, data.type == 'CreateCombat');
                }
            }
        }
    }
});

/*
Hooks.on("renderFolderConfig", (app, html, options) => {
    let defaultType = app.object.getFlag('monks-enhanced-journal', 'defaulttype');

    $('<div>')
        .addClass('form-group')
        .append($('<label>').html('Default Entry Type'))
        .append($('<div>')
            .addClass('form-fields')
            .append($('<select>')
                .attr('name', 'flags.monks-enhanced-journal.defaulttype')
                .append(Object.entries(MonksEnhancedJournal.getTypeLabels()).map(([k, v]) => {
                    return $('<option>').attr('value', k).html(i18n(v)).prop('selected', defaultType == k);
                }))))
        .insertAfter($('input[name="sorting"]', html).closest('.form-group'));

    $(html).css({height: $(html).height() + 30});
});*/

Hooks.on('renderNoteConfig', (app, html, data) => {
    let ctrl = $('select[name="entryId"]', html);

    MonksEnhancedJournal.journalListing(ctrl, html, app.object.data.entryId, data.entry.name).insertAfter(ctrl);
    ctrl.hide();

    $('<div>').addClass('form-group')
        .append($('<label>').html(i18n("MonksEnhancedJournal.ChatBubble")))
        .append(
            $('<div>').addClass('form-fields')
                .append($('<input>').attr('type', 'checkbox').attr('name', 'flags.monks-enhanced-journal.chatbubble').prop('checked', app.object.data.flags['monks-enhanced-journal']?.chatbubble))
    ).insertAfter($('select[name="textAnchor"]', html).closest('.form-group'));

    app.setPosition({ height: 'auto' });
});

Hooks.on("renderTokenConfig", (app, html, data) => {
    if (game.user.isGM) {
        let ctrl = $('<input>').attr('type', 'text').attr('name', 'flags.monks-enhanced-journal.chatbubble');
        let group = $('<div>').addClass('form-group')
            .append($('<label>').html('Token Dialog Journal Entry'))
            .append(ctrl);

        let journalId = app.object.data.flags['monks-enhanced-journal']?.chatbubble;
        let journal = game.journal.get(journalId);

        let journalSelect = MonksEnhancedJournal.journalListing(ctrl, group, journal?.id, journal?.name, 'flags.monks-enhanced-journal.chatbubble');
        ctrl.hide();
        group.append(journalSelect);

        let select = $('.journal-select', group);
        let ul = $('.journal-list', group).appendTo(app.element);
        window.setTimeout(function () {
            ul.css({ left: select.position().left, top: (select.position().top + select.height() + 1), width: select.outerWidth() });
        }, 100);

        $('div[data-tab="character"]', html).append(group);

        app.setPosition({height: 'auto'});
    }
});

Hooks.on("preDocumentSheetRegistrarInit", (settings) => {
    settings["JournalEntry"] = true;
});

Hooks.on("renderChatMessage", (message, html, data) => {
    if (message.data.flags['monks-enhanced-journal']) {
        if (!game.user.isGM)
            html.find(".gm-only").remove();
        if (game.user.isGM)
            html.find(".player-only").hide();

        $('.request-accept', html).click(MonksEnhancedJournal.acceptItem.bind(message, 'accept'));
        $('.request-reject', html).click(MonksEnhancedJournal.acceptItem.bind(message, game.user.isGM ? 'reject' : 'cancel'));
        if (message.getFlag('monks-enhanced-journal', 'action') == "sell") {
            let offered = message.getFlag('monks-enhanced-journal', 'offered');
            let approved = message.getFlag('monks-enhanced-journal', 'approved');

            $('.request-accept', html).toggleClass('active', (game.user.isGM ? !!offered : !!approved)).prop('disabled', !game.user.isGM && !offered);
        }

        $('input[name="quantity"]', html).change(MonksEnhancedJournal.updateSale.bind(message));
        $('input[name="sell"]', html).change(MonksEnhancedJournal.updateSale.bind(message));

        let items = message.getFlag('monks-enhanced-journal', 'items') || [];
        for (let item of items) {
            $(`li[data-id="${item._id}"] input[name="quantity"]`, html).val(item.quantity);
            $(`li[data-id="${item._id}"] input[name="sell"]`, html).val(item.sell + " " + item.currency);
        }

        $('.actor-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'actor')).attr('onerror', "$(this).attr('src', 'icons/svg/mystery-man.svg');");
        $('.shop-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'shop')).attr('onerror', "$(this).attr('src', 'modules/monks-enhanced-journal/assets/shop.png');");
        $('.item-list .item-name .item-image', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'item'));
    }
});

Hooks.on('canvasInit', () => {
    canvas.hud.note = new NoteHUD();
});

Hooks.on("renderActorDirectory", (app, html, data) => {
    $(`li[data-document-id="${setting("loot-entity")}"] h4`, html).append(
        $('<div>').addClass('assign-icon').attr('title', 'Assign items to this Actor').append(
            $('<i>').addClass('fas fa-suitcase')
        )
    );
});

Hooks.on("getActorDirectoryEntryContext", (html, entries) => {
    entries.push({
        name: "Assign Items to this Actor",
        icon: '<i class="fas fa-suitcase"></i>',
        condition: li => {
            return game.user.isGM && (game.modules.get("merchantsheetnpc")?.active || game.modules.get("lootsheetnpc5e")?.active);
        },
        callback: async (li) => {
            await game.settings.set("monks-enhanced-journal", "loot-entity", li.data("documentId"));
            if (!MonksEnhancedJournal.isLootActor(setting("loot-sheet"))){
                if (game.modules.get("lootsheetnpc5e")?.active)
                    await game.settings.set("monks-enhanced-journal", "loot-sheet", "lootsheetnpc5e");
                else if (game.modules.get("merchantsheetnpc")?.active)
                    await game.settings.set("monks-enhanced-journal", "loot-sheet", "merchantsheetnpc");
                else if (game.modules.get("item-piles")?.active)
                    await game.settings.set("monks-enhanced-journal", "loot-sheet", "item-piles");
            }
            ui.actors.render(true);
        }
    });
});

Hooks.on("getJournalDirectoryEntryContext", (html, entries) => {
    entries.push({
        name: "Assign Items to this Loot Entry",
        icon: '<i class="fas fa-suitcase"></i>',
        condition: li => {
            let id = li.data("documentId");
            let journal = game.journal.get(id);
            return game.user.isGM && journal && journal.getFlag('monks-enhanced-journal', 'type') == 'loot';
        },
        callback: async (li) => {
            await game.settings.set("monks-enhanced-journal", "loot-entity", li.data("documentId"));
            if (setting("loot-sheet") != "monks-enhanced-journal")
                await game.settings.set("monks-enhanced-journal", "loot-sheet", "monks-enhanced-journal");
            ui.actors.render(true);
        }
    });
});

//Try and fix what data toolbox is breaking
Hooks.on('getJournalSheetHeaderButtons', (app, actions) => {
    MonksEnhancedJournal.fixType(app.object);
});

Hooks.on("getSceneControlButtons", (controls) => {
    if (setting('show-objectives')) {
        let noteControls = controls.find(control => control.name === "notes")
        noteControls.tools.push({
            name: "toggledialog",
            title: "MonksEnhancedJournal.toggledialog",
            icon: "fas fa-calendar-day",
            toggle: true,
            active: setting('show-dialog'),
            onClick: toggled => {
                game.settings.set('monks-enhanced-journal', 'show-dialog', toggled);
                MonksEnhancedJournal.refreshObjectives();
            }
        });
    }
});

Hooks.on("renderItemSheet", (app, html, options) => {
    //Change the price so we can specify the currency type
    $('input[name="data.price"]', html).attr('data-dtype', 'String');
});

Hooks.on("updateSetting", (setting, data, options, userid) => {
    if (setting.key == "core.sheetClasses" && MonksEnhancedJournal.journal) {
        let value = JSON.parse(data.value);
        if (value.hasOwnProperty("JournalEntry")) {
            MonksEnhancedJournal.journal.render();
        }
    }
});

Hooks.on("polyglot.ready", () => {
    let root = $('<div>').attr('id', 'enhanced-journal-fonts').appendTo('body');
    for (let [k, v] of Object.entries(game.polyglot.LanguageProvider.alphabets)) {
        $('<span>').attr('lang', k).css({ font: v }).appendTo(root);
    }
});

Hooks.on("renderItemSheet", (sheet, html, data) => {
    if (data.options.addcost == true) {
        let priceGroup = $('input[name="data.price"]', html).closest('.form-group');
        $('<div>').addClass('form-group')
            .append($('<label>').html("Cost"))
            .append($('<input>').attr('type', 'text').attr('name', 'data.cost').attr('data-dtype', 'String').val(data.data.cost))
            .insertAfter(priceGroup);
    }
})