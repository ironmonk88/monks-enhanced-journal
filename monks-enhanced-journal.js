import { registerSettings } from "./settings.js";
import { EnhancedJournal } from "./apps/enhanced-journal.js"
import { SlideshowWindow } from "./apps/slideshow-window.js"
import { CheckListSheet } from "./sheets/CheckListSheet.js"
import { EncounterSheet } from "./sheets/EncounterSheet.js"
import { JournalEntrySheet } from "./sheets/JournalEntrySheet.js"
import { PersonSheet } from "./sheets/PersonSheet.js"
import { PictureSheet } from "./sheets/PictureSheet.js"
import { PlaceSheet } from "./sheets/PlaceSheet.js"
import { PointOfInterestSheet } from "./sheets/PointOfInterestSheet.js"
import { QuestSheet } from "./sheets/QuestSheet.js"
import { SlideshowSheet } from "./sheets/SlideshowSheet.js"
import { OrganizationSheet } from "./sheets/OrganizationSheet.js"
import { ShopSheet } from "./sheets/ShopSheet.js"
import { backgroundinit } from "./plugins/background.plugin.js"
import { NoteHUD } from "./apps/notehud.js"

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

            if (entry.data?.flags['monks-enhanced-journal']?.type)
                entry.data.type = entry.data?.flags['monks-enhanced-journal']?.type;
            if (entry.data.type == 'journalentry')
                entry.data.type = 'base';

            if (game.MonksActiveTiles?.waitingInput || !MonksEnhancedJournal.openJournalEntry(entry))
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
                if (entry.data.flags['monks-enhanced-journal']?.type)
                    entry.data.type = entry.data.flags['monks-enhanced-journal']?.type;
                if (entry.data.type == 'journalentry')
                    entry.data.type = 'base';
                return entry.sheet.render(true, { sheetMode: mode });
            }
        }

        let clickNote = function (wrapped, ...args) {
            if (this.entry) {
                if (this.data.flags['monks-enhanced-journal']?.chatbubble === true) {
                    MonksEnhancedJournal.showAsChatBubble(this, this.document.entry);
                }else if (!MonksEnhancedJournal.openJournalEntry(this.entry)) {
                    return wrapped(...args);
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

            let text = this._getTextNodes(html);

            if (options.documents) {
                const rgxe = new RegExp(`@(Picture)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g');
                this._replaceTextContent(text, rgxe, MonksEnhancedJournal._createPictureLink);
            }

            //const rgx = /%\[(\/[a-zA-Z]+\s)?(.*?)([0-9]{1,3})(\]%)?/gi;
            const rgx = /%(Request)\[([^\]]+)\](?:{([^}]+)})?/gi;
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
                const collection = game.collections.get(a.dataset.entity);
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
                if (event.altKey || setting('open-outside') || !MonksEnhancedJournal.openJournalEntry(doc, { newtab: event.ctrlKey })) {
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

        SceneNavigation._getContextMenuOptions

        Handlebars.registerHelper({ selectGroups: MonksEnhancedJournal.selectGroups });
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

    static openJournalEntry(entry, options = {}) {
        if (!game.user.isGM && !setting('allow-player'))
            return false;

        if (game.modules.get('monks-common-display')?.active) {
            let data = game.settings.get("monks-common-display", 'playerdata');
            let playerdata = data[game.user.id] || { display: false, mirror: false, selection: false };

            if (playerdata.display)
                return false;
        }

        if (entry) {
            if (entry.data?.content?.includes('QuickEncountersTutorial'))
                return false;

            let entrytype = entry.data.type;
            entry.data.type = (entrytype == 'journalentry' || entrytype == 'oldentry' ? 'base' : entrytype);
            let sheet = (!entry?._sheet ? entry?._getSheetClass() : entry?._sheet);
            if (sheet?.constructor?.name == 'QuestPreviewShim')
                return false;
            entry.data.type = entrytype;
        }

        if (options.render == false || options.activate == false)
            return false;

        const allowed = Hooks.call(`openJournalEntry`, entry, options, game.user.id);
        if (allowed === false)
            return false;

        if (!game.user.isGM && entry.getUserLevel(game.user) === CONST.ENTITY_PERMISSIONS.LIMITED) {
            if (entry.data.img) {
                let img = new ImagePopout(entry.data.img, {
                    title: entry.name,
                    uuid: entry.uuid,
                    shareable: false,
                    editable: false
                });
                img._render(true);
            }
            return true;
        }

        //if the enhanced journal is already open, then just pass it the new object, if not then let it render as normal
        if (MonksEnhancedJournal.journal) {
            if (entry)
                MonksEnhancedJournal.journal.open(entry, options.newtab);
            else
                MonksEnhancedJournal.journal.render(true);
        }
        else
            MonksEnhancedJournal.journal = new EnhancedJournal(entry).render(true);
        /*
        if (MonksEnhancedJournal.journal != undefined) {
            log('JournalID', MonksEnhancedJournal.journal.appId, MonksEnhancedJournal.journal.tabs);
            if (!MonksEnhancedJournal.journal.rendered) {
                MonksEnhancedJournal.journal._render(true).then(() => {
                    MonksEnhancedJournal.journal.open(entry);
                })
            } else
                MonksEnhancedJournal.journal.open(entry, options.newtab);
        }
        else {
            const sheet = entry.sheet;

            if (sheet._minimized) return sheet.maximize();
            else return sheet._render(true).then(() => {
                if (MonksEnhancedJournal.journal)
                    MonksEnhancedJournal.journal.open(entry);
            });
        }*/

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
        let [request, dc] = options.split(' ');

        const data = {
            cls: ["inline-request-roll"],
            title: `Request Roll: ${request} ${dc}`,
            label: name || 'Request Roll',
            dataset: {
                requesttype: command,
                request: request,
                dc: dc
            }
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
                let type = entry.data?.flags['monks-enhanced-journal']?.type;
                entry.data.type = (type == 'journalentry' || type == 'oldentry' ? 'base' : type);    //set the type of all entries since Foundry won't save the new type
            }
        }

        $('<div>').attr('id', 'slideshow-canvas').addClass('monks-journal-sheet flexrow').append($('<div>').addClass('slideshow-container flexcol playing').append($('<div>').addClass('slide-showing'))).append($('<div>').addClass('slide-padding')).appendTo($('body'));
        new SlideshowWindow().render(true);
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

        if (game.modules.get("polyglot")?.active) {
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
            let document = game.journal.get(data.entityId);
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
                $('.slide-showing', MonksEnhancedJournal.slideshow.element).append(newSlide);
                if (newSlide)
                    newSlide.css({ opacity: 0 }).animate({ opacity: 1 }, 1000, 'linear');

                for (let text of slide.texts) {
                    if (!isNaN(text.fadein)) {
                        window.setTimeout(function () {
                            $('.slide-showing text[id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).animate({ opacity: 1 }, 500, 'linear');
                        }, text.fadein * 1000);
                    }
                    if (!isNaN(text.fadeout)) {
                        window.setTimeout(function () {
                            $('.slide-showing text[id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).animate({ opacity: 0 }, 500, 'linear');
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

        let textBackground = hexToRGBAString(colorStringToHex(slide.text?.background || '#000000'), 0.5);

        function getNode(n, v) {
            n = document.createElementNS("http://www.w3.org/2000/svg", n);
            for (var p in v)
                n.setAttributeNS(null, p.replace(/[A-Z]/g, function (m, p, o, s) { return "-" + m.toLowerCase(); }), v[p]);
            return n
        }

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttributeNS(null, 'viewBox', '0 0 350 80');
        for (let text of slide.texts) {
            let svgtext = getNode('text', { id: text.id, fill: text.color, x: text.left + "%", y: text.top + "%", textAnchor: text.align });
            svgtext.textContent = text.text;
            if (text.fadein && !isNaN(text.fadein))
                svgtext.setAttribute("style", "opacity:0");
            svg.appendChild(svgtext);
        }

        return $('<div>').addClass("slide").attr('data-slide-id', slide.id)
            .append($('<div>').addClass('slide-background').append($('<div>').attr('style', background)))
            .append($('<img>').attr('src', slide.img).css({ 'object-fit': slide.sizing}))
            .append($('<div>').addClass('slide-text flexcol').append(svg));
    }

    static refreshObjectives() {
        let display = $('#objective-display').empty();

        let quests = $('<ul>');
        //find all in progress quests
        for (let quest of game.journal) {
            if (quest.getFlag('monks-enhanced-journal', 'type') == 'quest' && quest.testUserPermission(game.user, "OBSERVER") && quest.getFlag('monks-enhanced-journal', 'display') && quest.getFlag('monks-enhanced-journal', 'display')) {
                //find all objectives
                let objectives = $('<ul>');
                $('<li>').append(quest.getFlag('monks-enhanced-journal', 'completed') ? '<i class="fas fa-check"></i> ' : '').append(`<b>${quest.name}</b>`).append(objectives).appendTo(quests);

                if (setting('use-objectives')) {
                    for (let objective of (quest.getFlag('monks-enhanced-journal', 'objectives') || [])) {
                        if (objective.available)
                            objectives.append($('<li>').html(objective.title || objective.content).attr('completed', objective.status));
                    }
                }
            }
        }

        if (quests.children().length > 0) {
            display.append($('<div>').addClass('title').html('Quests')).append(quests);
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

    static async purchaseItem(data) {
        let document = await fromUuid(data.uuid);
        let items = document.getFlag('monks-enhanced-journal', 'items');
        if (items) {
            let item = items.find(i => i.id == data.itemid);
            if (item) {
                item.remaining = Math.max(item.remaining - 1, 0);
                this.object.setFlag('monks-enhanced-journal', 'items', items);
            }
        }
    }

    static findVacantSpot(pos, size) {
        let width = size.width * canvas.scene.data.size;
        let height = size.height * canvas.scene.data.size;

        let tokenCollide = function (pt) {
            let ptWidth = width / 2;
            let checkpt = duplicate(pt);
            checkpt.x += (width / 2);
            checkpt.y += (height / 2);

            let found = canvas.scene.tokens.find(tkn => {
                let tokenX = tkn.data.x + (width / 2);
                let tokenY = tkn.data.y + (height / 2);

                let distSq = parseInt(Math.sqrt(Math.pow(checkpt.x - tokenX, 2) + Math.pow(checkpt.y - tokenY, 2)));
                let radSumSq = ((tkn.data.width * canvas.scene.data.size) / 2) + ptWidth;

                let result = (distSq < radSumSq - 5);

                return result;
            })

            return found != undefined;
        }

        let wallCollide = function (ray) {
            return canvas.walls.checkCollision(ray);
        }

        let count = 0;
        const tw = width;
        let dist = 0;
        let angle = null;
        let rotate = 1; //should be set first thing, but if it isn't just make sure it's not 0
        let spot = duplicate(pos);
        let checkspot = duplicate(spot);
        checkspot.x -= (width / 2);
        checkspot.y -= (height / 2);
        checkspot.x = checkspot.x.toNearest(canvas.scene.data.size);
        checkspot.y = checkspot.y.toNearest(canvas.scene.data.size);
        let ray = new Ray({ x: pos.x, y: pos.y }, { x: checkspot.x, y: checkspot.y });
        while (tokenCollide(checkspot) || wallCollide(ray)) {
            count++;
            //move the point along
            if (angle == undefined || angle > 2 * Math.PI) {
                dist += canvas.scene.data.size;
                angle = 0;
                rotate = Math.atan2(tw, dist); //What's the angle to move, so at this distance, the arc travles the token width
            } else {
                //rotate
                angle += rotate;
            }
            spot.x = pos.x + (Math.cos(angle) * dist);
            spot.y = pos.y + (-Math.sin(angle) * dist);
            checkspot = duplicate(spot);

            //need to check that the resulting snap to grid isn't going to put this out of bounds
            checkspot.x -= (width / 2);
            checkspot.y -= (height / 2);
            checkspot.x = checkspot.x.toNearest(canvas.scene.data.size);
            checkspot.y = checkspot.y.toNearest(canvas.scene.data.size);

            ray.B.x = checkspot.x + (width / 2);
            ray.B.y = checkspot.y + (height / 2);

            if (count > 50) {
                //if we've exceeded the maximum spots to check then set it to the original spot
                checkspot = pos;
                break;
            }
        }

        return checkspot;
    }

    static async acceptItem(accept) {
        let message = this;

        let content = $(message.data.content);
        $('.request-buttons', content).remove();
        $('.request-msg', content).html((accept ? '<i class="fas fa-check"></i> Item has been added to inventory' : '<i class="fas fa-times"></i> Request has been rejected'));

        if (accept) {
            //find the actor
            let msgactor = message.getFlag('monks-enhanced-journal', 'actor');
            let actor = game.actors.get(msgactor.id);
            //find the item
            let msgitems = message.getFlag('monks-enhanced-journal', 'items');
            let item = await fromUuid(msgitems[0].uuid);
            //Add it to the actor
            const additem = await Item.implementation.fromDropData({ type: 'Item', data: item.data });
            const itemData = additem.toObject();
            actor.createEmbeddedDocuments("Item", [itemData]);
            //deduct the gold

            //shop
            let msgshop = message.getFlag('monks-enhanced-journal', 'shop');
            let shop = game.journal.get(msgshop.id);
            if (shop) {
                let items = duplicate(shop.getFlag('monks-enhanced-journal', 'items'));
                let itm = items.find(i => i.id == msgitems[0].id);
                itm.qty = Math.max(itm.qty - 1, 0);
                await shop.setFlag('monks-enhanced-journal', 'items', items);
            }
        }

        message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { accepted: accept } } });
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
        entry.data.type = data.type;
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
                (data?.flags && (data?.flags['monks-enhanced-journal']?.actor != undefined ||
                    data?.flags['monks-enhanced-journal']?.actors != undefined ||
                    data?.flags['monks-enhanced-journal']?.shops != undefined ||
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

Hooks.on('dropActorSheetData', async (actor, sheet, data) => {
    //check to see if an item was dropped from either the encounter or quest and record what actor it was
    if (MonksEnhancedJournal.journal && data.id == MonksEnhancedJournal._dragItem) {
        let entry = await fromUuid(data.uuid);
        const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
        if (cls && cls.itemDropped) {
            cls.itemDropped.call(entry, data.id, actor);
            /*
            if (MonksEnhancedJournal.journal.object.data.flags['monks-enhanced-journal']?.type == 'shop') {
                //start the purchase process
                MonksEnhancedJournal.journal.itemPurchased(data.id, actor);
            } else {
                MonksEnhancedJournal.journal.itemDropped(data.id, actor);
            }*/
        }
        MonksEnhancedJournal._dragItem = null;
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
});

Hooks.on("preDocumentSheetRegistrarInit", (settings) => {
    settings["JournalEntry"] = true;
});

Hooks.on("renderChatMessage", (message, html, data) => {
    if (message.data.flags['monks-enhanced-journal']) {
        if (!game.user.isGM)
            html.find(".gm-only").remove();
        if (game.user.isGM)
            html.find(".player-only").remove();

        $('.request-accept', html).click(MonksEnhancedJournal.acceptItem.bind(message, true));
        $('.request-reject', html).click(MonksEnhancedJournal.acceptItem.bind(message, false));

        $('.actor-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'actor')).attr('onerror', "$(this).attr('src', 'icons/svg/mystery-man.svg');");
        $('.shop-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'shop')).attr('onerror', "$(this).attr('src', 'modules/monks-enhanced-journal/assets/shop.png');");
        $('.item-list .item-name .item-image', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'item'));
    }
});

Hooks.on('canvasInit', () => {
    canvas.hud.note = new NoteHUD();
});

Hooks.on("renderActorDirectory", (app, html, data) => {
    if (setting("assign-actor")) {
        $(`li[data-document-id="${setting("assign-actor")}"] h4`, html).append(
            $('<div>').addClass('assign-icon').attr('title', 'Assign items to this Actor').append(
                $('<i>').addClass('fas fa-suitcase')
            )
        );
    }
});

Hooks.on("getActorDirectoryEntryContext", (html, entries) => {
    entries.push({
        name: "Assign Items to this Actor",
        icon: '<i class="fas fa-suitcase"></i>',
        condition: li => {
            return game.user.isGM;
        },
        callback: async (li) => {
            await game.settings.set("monks-enhanced-journal", "assign-actor", li.data("documentId"));
            ui.actors.render(true);
        }
    });
});

//Try and fix what data toolbox is breaking
Hooks.on('getJournalSheetHeaderButtons', (app, actions) => {
    if (app.object.data?.flags['monks-enhanced-journal']?.type)
        app.object.data.type = app.object.data?.flags['monks-enhanced-journal']?.type;
    if (app.object.data.type == 'journalentry')
        app.object.data.type = 'base';
});