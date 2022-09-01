import { registerSettings } from "./settings.js";
import { EnhancedJournal } from "./apps/enhanced-journal.js"
import { SlideshowWindow } from "./apps/slideshow-window.js"
import { ObjectiveDisplay } from "./apps/objective-display.js"
import { CheckListSheet } from "./sheets/CheckListSheet.js"
import { EncounterSheet } from "./sheets/EncounterSheet.js"
import { PersonSheet } from "./sheets/PersonSheet.js"
import { PictureSheet } from "./sheets/PictureSheet.js"
import { PlaceSheet } from "./sheets/PlaceSheet.js"
import { PointOfInterestSheet } from "./sheets/PointOfInterestSheet.js"
import { QuestSheet } from "./sheets/QuestSheet.js"
import { SlideshowSheet } from "./sheets/SlideshowSheet.js"
import { OrganizationSheet } from "./sheets/OrganizationSheet.js"
import { ShopSheet } from "./sheets/ShopSheet.js"
import { LootSheet } from "./sheets/LootSheet.js"
import { TextEntrySheet } from "./sheets/TextEntrySheet.js"
import { backgroundinit } from "./plugins/background.plugin.js"
import { dcconfiginit } from "./plugins/dcconfig.plugin.js"
import { NoteHUD } from "./apps/notehud.js"
import { EnhancedJournalSheet } from "./sheets/EnhancedJournalSheet.js";
import { getValue, setValue, MEJHelpers } from "./helpers.js";

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
export let format = (key, data = {}) => {
    return game.i18n.format(key, data);
};
export let setting = key => {
    return game.settings.get("monks-enhanced-journal", key);
};

export let quantityname = () => {
    return MonksEnhancedJournal.quantityname
}
export let pricename = () => {
    return MonksEnhancedJournal.pricename;
}
export let currencyname = () => {
    return MonksEnhancedJournal.currencyname;
}

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
    static sounds = [];

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
            slideshow: SlideshowSheet,
            journalentry: TextEntrySheet
        };
    }

    static getTypeLabels() {
        return {
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
            checklist: "MonksEnhancedJournal.checklist",
            journalentry: "MonksEnhancedJournal.journalentry"
        };
    }

    static get effectTypes() {
        return {
            'none': "MonksEnhancedJournal.effect.none",
            'slide-fade': "MonksEnhancedJournal.effect.slide-fade",
            'slide-fade-left': "MonksEnhancedJournal.effect.slide-fade-left",
            'slide-fade-right': "MonksEnhancedJournal.effect.slide-fade-right",
            'slide-zoom-in': "MonksEnhancedJournal.effect.slide-zoom-in",
            'slide-slide-left': "MonksEnhancedJournal.effect.slide-slide-left",
            'slide-slide-right': "MonksEnhancedJournal.effect.slide-slide-right",
            'slide-bump-left': "MonksEnhancedJournal.effect.slide-bump-left",
            'slide-bump-right': "MonksEnhancedJournal.effect.slide-bump-right",
            'slide-rotate': "MonksEnhancedJournal.effect.slide-rotate",
            'slide-hinge': "MonksEnhancedJournal.effect.slide-hinge",
            'slide-flip': "MonksEnhancedJournal.effect.slide-flip",
            'slide-page-turn': "MonksEnhancedJournal.effect.slide-page-turn"
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

        MonksEnhancedJournal.registerSheetClasses();

        MonksEnhancedJournal.system = CONFIG[game.system.id.toUpperCase()];
        if (game.system.id == "tormenta20")
            MonksEnhancedJournal.system = CONFIG["T20"];

        if (game.system.id == "tormenta20") {
            MonksEnhancedJournal.pricename = "preco";
            MonksEnhancedJournal.quantityname = "qtd";
            MonksEnhancedJournal.currencyname = "dinheiro";
        } else if (game.system.id == "shadowrun5e") {
            MonksEnhancedJournal.quantityname = "technology.quantity";
        } else if (game.system.id == "earthdawn4e") {
            MonksEnhancedJournal.currencyname = "money";
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
            title: "Enhanced Journal", items: [
                { block: "section", classes: "readaloud", title: "Read Aloud", wrapper: true },
                { inline: "span", classes: "drop-cap", title: "Drop Cap" }]
        });

        const moreNoteIcons = {
            "Acid": "icons/svg/acid.svg",
            "Angel": "icons/svg/angel.svg",
            "Aura": "icons/svg/aura.svg",
            "Blind": "icons/svg/blind.svg",
            "Blood": "icons/svg/blood.svg",
            "Bones": "icons/svg/bones.svg",
            "Circle": "icons/svg/circle.svg",
            "Clockwork": "icons/svg/clockwork.svg",
            "Combat": "icons/svg/combat.svg",
            "Cowled": "icons/svg/cowled.svg",
            "Daze": "icons/svg/daze.svg",
            "Deaf": "icons/svg/deaf.svg",
            "Direction": "icons/svg/direction.svg",
            "Door-Closed": "icons/svg/door-closed.svg",
            "Door-Exit": "icons/svg/door-exit.svg",
            "Down": "icons/svg/down.svg",
            "Explosion": "icons/svg/explosion.svg",
            "Eye": "icons/svg/eye.svg",
            "Falling": "icons/svg/falling.svg",
            "Frozen": "icons/svg/frozen.svg",
            "Hazard": "icons/svg/hazard.svg",
            "Heal": "icons/svg/heal.svg",
            "Holy Shield": "icons/svg/holy-shield.svg",
            "Ice Aura": "icons/svg/ice-aura.svg",
            "Lightning": "icons/svg/lightning.svg",
            "Net": "icons/svg/net.svg",
            "Padlock": "icons/svg/padlock.svg",
            "Paralysis": "icons/svg/paralysis.svg",
            "Poison": "icons/svg/poison.svg",
            "Radiation": "icons/svg/radiation.svg",
            "Sleep": "icons/svg/sleep.svg",
            "Sound": "icons/svg/sound.svg",
            "Sun": "icons/svg/sun.svg",
            "Terror": "icons/svg/terror.svg",
            "Up": "icons/svg/up.svg",
            "Wing": "icons/svg/wing.svg"
        }
        Object.assign(CONFIG.JournalEntry.noteIcons, moreNoteIcons);

        CONFIG.JournalEntry.noteIcons = Object.entries(CONFIG.JournalEntry.noteIcons)
            .sort(([a,], [b,]) => a.localeCompare(b))
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        CONFIG.TextEditor.enrichers.push({ id: 'MonksEnhancedJournalPicture', pattern: new RegExp(`@(Picture)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g'), enricher: MonksEnhancedJournal._createPictureLink });
        CONFIG.TextEditor.enrichers.push({ id: 'MonksEnhancedJournalRequest', pattern: /@(Request|Contested)\[([^\]]+)\](?:{([^}]+)})?/gi, enricher: MonksEnhancedJournal._createRequestRoll });

        Note.prototype._canHUD = function(user, event) {
            return game.user.isGM && this.entry;
        }

        Object.defineProperty(NotesLayer.prototype, 'hud', {
            get: function () {
                return canvas.hud.note;
            }
        });

        /*
        if (JournalEntry.prototype.type == undefined) {
            Object.defineProperty(JournalEntry.prototype, 'type', {
                get: function () {
                    return this.getFlag('monks-enhanced-journal', 'type') || 'base';
                }
            });
        }*/

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

            let hasBlank = MonksEnhancedJournal?.journal?.object?.type == "blank";
            if (this._groupSelect || game.MonksActiveTiles?.waitingInput || !MonksEnhancedJournal.openJournalEntry(entry, { newtab: setting('open-new-tab') && !hasBlank }))
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

        let dragStart = function (...args) {
            let event = args[0];
            event.stopPropagation();
            if (ui.context) ui.context.close({ animate: false });
            const li = event.currentTarget.closest(".directory-item");
            const documentName = this.constructor.documentName;
            const isFolder = li.classList.contains("folder") && !li.classList.contains("journalentry");
            const doc = isFolder
                ? game.folders.get(li.dataset.folderId)
                : CONFIG[documentName].collection.instance.get(li.dataset.documentId);
            const page = li.dataset.pageId ? doc.pages.get(li.dataset.pageId) : null;
            const dragData = page ? page.toDragData() : doc.toDragData();
            if (isFolder) foundry.utils.mergeObject(dragData, { documentName });
            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalDirectory.prototype._onDragStart", dragStart, "OVERRIDE");
        } else {
            JournalDirectory.prototype._onDragStart = dragStart;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.ignore_conflicts("monks-enhanced-journal", "monks-active-tiles", "JournalDirectory.prototype._onClickDocumentName");
            libWrapper.ignore_conflicts("monks-enhanced-journal", "multiple-directory-selection", "JournalDirectory.prototype._onClickDocumentName");
        }

        let oldRenderPopout = JournalDirectory.prototype.renderPopout;
        JournalDirectory.prototype.renderPopout = function () {
            if (!MonksEnhancedJournal.openJournalEntry())
                return oldRenderPopout.call(this);
        }

        Journal.prototype.constructor._showEntry = async function(entryId, mode = null, force = true, showid) {
            let entry = await fromUuid(entryId);
            if (entry.documentName !== "JournalEntry") return;
            if (!force && !entry.visible) return;
            if (!entry.img && !entry.content && ["base", "journalentry"].includes(entry.type)) return; // Don't show an entry that has no content

            // Show the sheet with the appropriate mode
            if (!MonksEnhancedJournal.openJournalEntry(entry)) {
                MonksEnhancedJournal.fixType(entry);
                return entry.sheet.render(true, { sheetMode: mode });
            }
        }

        Journal.prototype.constructor.showDialog = async function (doc) {
            if (!((doc instanceof JournalEntry) || (doc instanceof JournalEntryPage))) return;
            if (!doc.isOwner) return ui.notifications.error("JOURNAL.ShowBadPermissions", { localize: true });
            if (game.users.size < 2) return ui.notifications.warn("JOURNAL.ShowNoPlayers", { localize: true });

            const users = game.users.filter(u => u.id !== game.userId);
            const userCount = users.length;
            const ownership = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
            if (!doc.isEmbedded) ownership.shift();
            const levels = [
                { level: CONST.DOCUMENT_META_OWNERSHIP_LEVELS.NOCHANGE, label: "OWNERSHIP.NOCHANGE" },
                ...ownership.map(([name, level]) => ({ level, label: `OWNERSHIP.${name}` }))
            ];
            const hasImage = (doc instanceof JournalEntryPage) && (["loot", "organization", "person", "place", "poi", "quest", "shop", "image"].includes(doc.type) && !!doc.src);
            let showAs = doc.getFlag("monks-enhanced-journal", "showAs") || (doc.type == "image" ? "image" : "journal");
            if (!hasImage && showAs != "journal")
                showAs = "journal";
            const html = await renderTemplate("modules/monks-enhanced-journal/templates/dialog-show.html", { users, levels, hasImage, showAs });

            return Dialog.prompt({
                title: game.i18n.format("JOURNAL.ShowEntry", { name: doc.name }),
                label: game.i18n.localize("JOURNAL.ActionShow"),
                content: html,
                render: html => {
                    const form = html.querySelector("form");
                    /*
                    form.elements.allPlayers.addEventListener("change", event => {
                        const checked = event.currentTarget.checked;
                        form.querySelectorAll('[name="players"]').forEach(i => {
                            i.checked = checked;
                            i.disabled = checked;
                        });
                    });
                    */
                    html.querySelector('[name="selectAll"]').addEventListener("click", event => {
                        form.querySelectorAll('[name="players"]').forEach(i => {
                            i.checked = true;
                        });
                    });
                    html.querySelector('[name="deselectAll"]').addEventListener("click", event => {
                        form.querySelectorAll('[name="players"]').forEach(i => {
                            i.checked = false;
                        });
                    });
                },
                callback: async html => {
                    const form = html.querySelector("form");
                    const fd = new FormDataExtended(form).object;
                    const users = Array.from(form.querySelectorAll('[name="players"]:checked')).map(el => el.value);

                    if (users.length == 0) {
                        ui.notification.warn("Cannot share this Journal Entry as no users have been selected");
                        return false;
                    }

                    if (fd.ownership > -2) {
                        const ownership = doc.ownership;
                        // if all the users have been selected, then change the default.
                        let allUsers = (users.length == userCount);
                        if (allUsers) {
                            ownership.default = fd.ownership;
                        }
                        users.forEach(id => {
                            //If any users are less than the default, boost them up, and if greater and force is true, then bring them down.
                            if ((ownership[id] < fd.ownership || fd.forceDowngrade) && (!allUsers || ownership[id] > CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT))
                                ownership[id] = fd.ownership;
                        });
                        await doc.update({ ownership });
                    }
                    if (fd.showAs != "journal") return this.showImage(doc.src, {
                        users,
                        title: doc.name,
                        showTitle: fd.showAs == "image",
                        uuid: doc.uuid
                    });
                    return this.show(doc, { force: true, users });
                },
                rejectClose: false,
                options: { jQuery: false }
            });
        }

        /*
        let oldEnrichHTML = TextEditor.prototype.constructor.enrichHTML;
        TextEditor.prototype.constructor.enrichHTML = function (content, options = {}) {
            let { async } = options;
            let data = oldEnrichHTML.call(this, content, options);

            const html = document.createElement("div");
            html.innerHTML = async ? Promise.resolve(data) : String(data);

            $('a[href]', html).each(function () {
                if ($(this).attr('href').startsWith("#"))
                    $(this).addClass("journal-link");
            });

            let updateTextArray = true;
            let text = [];

            if (options.documents) {
                if (updateTextArray) text = this._getTextNodes(html);
                const rgx = new RegExp(`@(Picture)\\[([^\\]]+)\\](?:{([^}]+)})?`, 'g');
                this._replaceTextContent(text, rgx, MonksEnhancedJournal._createPictureLink);
            }

            if (updateTextArray) text = this._getTextNodes(html);
            const rgx = /@(Request|Contested)\[([^\]]+)\](?:{([^}]+)})?/gi;
            this._replaceTextContent(text, rgx, MonksEnhancedJournal._createRequestRoll);

            return html.innerHTML;
        }*/

        let oldClickContentLink = TextEditor.prototype.constructor._onClickContentLink;
        TextEditor.prototype.constructor._onClickContentLink = async function (event) {
            event.preventDefault();
            const a = event.currentTarget;
            const app = a.closest('.app');
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
                    return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: doc.documentName}));
                }
            }
            if (!doc) return;

            // Action 1 - Execute an Action
            if (doc.documentName === "Macro") {
                if (!doc.testUserPermission(game.user, "LIMITED")) {
                    return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentUsePermissions", { documentName: doc.documentName}));
                }
                return doc.execute();
            }

            // Action 2 - Play the sound
            else if (doc.documentName === "PlaylistSound") return TextEditor._onPlaySound(doc);

            // Action 3 - Render the Entity sheet
            if (doc.documentName == 'Actor' || doc.documentName == 'JournalEntry' || doc.documentName == 'JournalEntryPage') {
                if (event.altKey || setting('open-outside') || ["SFDialog", "forge-compendium-browser"].includes(app?.id) || !MonksEnhancedJournal.openJournalEntry(doc, { newtab: event.ctrlKey && !setting("open-new-tab"), anchor: a.dataset.anchor })) {
                    return doc.sheet.render(true, { anchor: a.dataset.anchor });
                }
            }
            else {
                if (doc.documentName === "Scene") {
                    let scene = game.scenes.get(id);
                    if (event.ctrlKey)
                        scene.activate();
                    else
                        scene.view();
                } else
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

            // Pre create a new page
            let type = getProperty(data, "flags.monks-enhanced-journal.type");
            if (type) {
                // video, pdf, image, everything else is text
                //let realtype = (["video", "pdf", "image"].includes(type) ? type : "text");
                await JournalEntryPage.create({ type: type, name: data.name, flags: { "monks-enhanced-journal": { type: type } } }, { parent: game.journal.get(data._id) });
            } else {

                if (!!getProperty(this, "flags.forien-quest-log") || (MonksEnhancedJournal.compendium !== true && !MonksEnhancedJournal.openJournalEntry(this, options)))
                    return wrapped(...args);
            }
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
        let createJournalEntryPage = async function (wrapped, ...args) {
            let [data, options, userid] = args;
            if (game.user.id !== userid)
                return;

            if (!!getProperty(this, "flags.forien-quest-log") || (MonksEnhancedJournal.compendium !== true && !MonksEnhancedJournal.openJournalEntry(this, options)))
                return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalEntryPage.prototype._onCreate", createJournalEntryPage, "MIXED");
        } else {
            const oldOnCreate = JournalEntryPage.prototype._onCreate;
            JournalEntryPage.prototype._onCreate = function (event) {
                return createJournalEntryPage.call(this, oldOnCreate.bind(this), ...arguments);
            }
        }*/

        let sceneActivate = function (wrapped, ...args) {
            if (this.journal && this.journal.type == 'slideshow') {
                if (game.user.isGM) {
                    //start slideshow for everyone
                    MonksEnhancedJournal.fixType(this.journal);
                    const cls = (this.journal._getSheetClass ? this.journal._getSheetClass() : null);
                    const sheet = new cls(this.journal, { render: false });
                    if (sheet.playSlideshow)
                        sheet.playSlideshow();
                }
            }
            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Scene.prototype.activate", sceneActivate, "WRAPPER");
        } else {
            const oldSceneActivate = Scene.prototype.activate;
            Scene.prototype.activate = function (event) {
                return sceneActivate.call(this, oldSceneActivate.bind(this), ...arguments);
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
                if (document.documentName == 'JournalEntry' && document.flags['monks-enhanced-journal']) {
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
                    if (document.flags['monks-enhanced-journal']) {
                        await data.update({ 'flags.monks-enhanced-journal': document.flags['monks-enhanced-journal'] });
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
                const type = this.object.type || CONST.BASE_DOCUMENT_TYPE;
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

        let clickNote2 = function (wrapped, ...args) {
            let entity = this.page || this.entry;
            if (entity) {
                if (!MonksEnhancedJournal.openJournalEntry(entity)) {
                    if (entity.testUserPermission(game.user, "OBSERVER") || (entity.testUserPermission(game.user, "LIMITED") && !!entity.img))
                        return wrapped(...args);
                    else
                        return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentname: entity.documentName}));
                }
            }
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Note.prototype._onClickLeft2", clickNote2, "MIXED");
        } else {
            const oldClickNote = Note.prototype._onClickLeft2;
            Note.prototype._onClickLeft2 = function (event) {
                return clickNote2.call(this, oldClickNote.bind(this));
            }
        }

        let clickNote = function (wrapped, ...args) {
            if (setting("show-chat-bubbles") && this.document.flags['monks-enhanced-journal']?.chatbubble) {
                let journal = game.journal.get(this.entryId);
                if (journal && !journal.testUserPermission(game.user, "OBSERVER"))
                    MonksEnhancedJournal.showAsChatBubble(this, journal);
            }
            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Note.prototype._onClickLeft", clickNote, "WRAPPER");
        } else {
            const oldClickNote = Note.prototype._onClickLeft;
            Note.prototype._onClickLeft = function (event) {
                return clickNote.call(this, oldClickNote.bind(this), ...arguments);
            }
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Note.prototype._canControl", clickNote, "WRAPPER");
        } else {
            const oldOnCanControl = Note.prototype._canControl;
            Note.prototype._canControl = function (event) {
                return clickNote.call(this, oldOnCanControl.bind(this), ...arguments);
            }
        }

        let onCanControlToken = function (wrapped, ...args) {
            if (setting("show-chat-bubbles") && this.document.flags['monks-enhanced-journal']?.chatbubble) {
                let journal = game.journal.get(this.document.flags['monks-enhanced-journal']?.chatbubble);
                if (journal)
                    MonksEnhancedJournal.showAsChatBubble(this, journal);
            }
            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Token.prototype._canControl", onCanControlToken, "WRAPPER");
        } else {
            const oldOnCanControl = Token.prototype._canControl;
            Token.prototype._canControl = function (event) {
                return onCanControlToken.call(this, oldOnCanControl.bind(this), ...arguments);
            }
        }

        let onSceneContextMenu = function (wrapped, ...args) {
            let context = wrapped(...args);

            let menu = context.find(c => c.name == "SCENES.Notes");
            if (menu) {
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

        let notesCreatePreview = async function (wrapped, ...args) {
            let [noteData] = args;
            // Acquire Journal entry
            let entry = game.journal.get(noteData.entryId);

            if (entry.pages.size == 1) {
                let page = entry.pages.contents[0];
                noteData.pageId = page.id;

                MonksEnhancedJournal.fixType(page);

                if (page.type == 'shop')
                    noteData.icon = "icons/svg/hanging-sign.svg";
                else if (page.type == 'loot')
                    noteData.icon = "icons/svg/chest.svg";
                else if (page.type == 'encounter')
                    noteData.icon = "icons/svg/sword.svg";
                else if (page.type == 'place')
                    noteData.icon = "icons/svg/village.svg";

            }

            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "NotesLayer.prototype._createPreview", notesCreatePreview, "WRAPPER");
        } else {
            const oldCreatePreview = NotesLayer.prototype._createPreview;
            NotesLayer.prototype._createPreview = function (event) {
                return notesCreatePreview.call(this, oldCreatePreview.bind(this), ...arguments);
            }
        }

        //Make sure that players can't see inline links that they don't know about.
        let oldCreateContentLink = TextEditor._createContentLink;
        TextEditor._createContentLink = function (match, type, target, name) {
            let parts = [target];
            if (type == "JournalEntry") {
                parts = target.split('#');
            }
            if (setting("hide-inline")) {
                if (CONST.DOCUMENT_TYPES.includes(type)) {
                    const collection = game.collections.get(type);
                    
                    const doc = /^[a-zA-Z0-9]{16}$/.test(parts[0]) ? collection.get(parts[0]) : collection.getName(parts[0]);

                    if (doc && !doc.testUserPermission(game.user, "LIMITED")) {
                        const span = document.createElement('span');
                        span.classList.add("unknown-link");
                        span.innerHTML = `<i class="fas fa-eye-slash"></i> Hidden`;
                        return span;
                    }
                }
            }

            let a = oldCreateContentLink.call(this, match, type, parts[0], name);
            if (parts.length > 1) {
                $(a).attr("data-anchor", parts[1]).append(`, ${parts[1]}`);
            }
            return a;
        }

        let onCreateDialog = async function (wrapped, ...args) {
            let [data, options] = args;
            options.journalentry = true;
            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalEntry.prototype.constructor.createDialog", onCreateDialog, "WRAPPER");
        } else {
            const oldCreateDialog = JournalEntry.prototype.constructor.createDialog;
            JournalEntry.prototype.constructor.createDialog = function (event) {
                return onCreateDialog.call(this, oldCreateDialog.bind(this), ...arguments);
            }
        }

        let onCreatePageDialog = async function (wrapped, ...args) {
            let [data, options] = args;
            options.journalentrypage = true;
            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalEntryPage.prototype.constructor.createDialog", onCreatePageDialog, "WRAPPER");
        } else {
            const oldCreateDialog = JournalEntryPage.prototype.constructor.createDialog;
            JournalEntryPage.prototype.constructor.createDialog = function (event) {
                return onCreatePageDialog.call(this, oldCreateDialog.bind(this), ...arguments);
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
                    item.system[MonksEnhancedJournal.quantityname] = (item.system[MonksEnhancedJournal.quantityname]?.hasOwnProperty("value") ? { value: i.qty } : i.qty);
                    item.system[MonksEnhancedJournal.pricename] = (item.system[MonksEnhancedJournal.pricename]?.hasOwnProperty("value") ? { value: i.price } : i.price);

                    if (i.cost != undefined)
                        item.system.cost = i.cost;
                    if (i.remaining != undefined)
                        item.system.remaining = i.remaining;
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

    static async fixPages() {
        for (let journal of game.journal) {
            let type = getProperty(journal, "flags.monks-enhanced-journal.type");
            if (!!type && !getProperty(journal, "flags.monks-enhanced-journal.pagefix")) {
                if (journal.pages.size == 2) {
                    let picturePage = journal.pages.find(p => p.type == "image" && p.name == `${journal.name} Image`);
                    let textPage = journal.pages.find(p => p.type == "text" && p.name == `${journal.name} Text`);
                    if (picturePage && textPage) {
                        if (type == "picture") {
                            await textPage.delete();
                            await picturePage.update({ flags: { "monks-enhanced-journal": journal.flags['monks-enhanced-journal'] } });
                        } else {
                            await textPage.update({ src: picturePage.src, name: journal.name });
                            await picturePage.delete();
                        }
                    }
                }
                for (let page of journal.pages) {
                    let journalFlags = journal.flags['monks-enhanced-journal'];
                    if (journalFlags.items) {
                        for (let item of journalFlags.items) {
                            if (item.data) {
                                let data = item.data;
                                delete item.data;
                                item = mergeObject(item, data);
                                item.system = item.data;
                                let quantity = getValue(item, quantityname()) ?? getValue(item.system, quantityname());
                                let price = MEJHelpers.getSystemPrice(item, "price");
                                item.flags = mergeObject((item.flags || {}), {
                                    "monks-enhanced-jorunal": {
                                        remaining: item.system?.remaining,
                                        received: item.received,
                                        lock: item.lock,
                                        hide: item.hide,
                                        from: item.from,
                                        assigned: item.assigned,
                                        price: `${price.value} ${price.currency}`,
                                        cost: item.system?.cost,
                                        quantity: quantity
                                    }
                                });
                                setProperty(item, "system." + quantityname(), 1);
                                delete item.data;
                            }
                        }
                    }
                    if (journalFlags.rewards) {
                        for (let reward of journalFlags.rewards) {
                            for (let item of reward.items) {
                                if (item.data) {
                                    let data = item.data;
                                    delete item.data;
                                    item = mergeObject(item, data);
                                    item.system = item.data;
                                    let quantity = getValue(item, quantityname()) ?? getValue(item.system, quantityname());
                                    let price = MEJHelpers.getSystemPrice(item, "price");
                                    item.flags = mergeObject((item.flags || {}), {
                                        "monks-enhanced-jorunal": {
                                            remaining: item.system.remaining,
                                            received: item.received,
                                            lock: item.lock,
                                            hide: item.hide,
                                            from: item.from,
                                            assigned: item.assigned,
                                            price: `${price.value} ${price.currency}`,
                                            cost: item.system.cost,
                                            quantity: quantity
                                        }
                                    });
                                    setProperty(item, "system." + quantityname(), 1);
                                    delete item.data;
                                }
                            }
                        }
                    }
                    await page.update({ flags: { "monks-enhanced-journal": journalFlags } });
                }
                
            }
        }
        // now fix relationships
        for (let journal of game.journal) {
            let type = getProperty(journal, "flags.monks-enhanced-journal.type");
            if (!!type && !getProperty(journal, "flags.monks-enhanced-journal.pagefix")) {
                for (let page of journal.pages) {
                    let relationships = getProperty(page, "flags.monks-enhanced-journal.relationships");
                    if (relationships) {
                        for (let rel of relationships) {
                            let relEntry = game.journal.get(rel.id);
                            if (relEntry) {
                                let newRel = relEntry.pages.find(p => getProperty(p, "flags.monks-enhanced-journal.type") == getProperty(relEntry, "flags.monks-enhanced-journal.type"));
                                if (newRel) {
                                    rel.uuid = newRel.uuid;
                                }
                            }
                        }
                        await page.update({ flags: { "monks-enhanced-journal": { "relationships": relationships } } });
                    }
                }
                await journal.setFlag("monks-enhanced-journal", "pagefix", true);
            }
        }

        if (setting("loot-entity").length == 16) {
            let sheet = setting("loot-sheet");
            let entity = game[sheet == "monks-enhanced-journal" ? journal : actors].get(setting("loot-entity"));
            if (entity) {
                if (entity instanceof JournalEntry) {
                    let page = entity.pages.find(p => getProperty(p, "flags.monks-enahnced-journal.type") == "loot");
                    entity = page || entity;
                }
                game.settings.set("monks-enhanced-journal", "loot-entity", entity.uuid);
            }
        } else if (setting("loot-entity") == "create") {
            let folder = game.folders.get(setting("loot-folder"));
            game.settings.set("monks-enhanced-journal", "loot-entity", folder.uuid);
        }
    }

    static registerSheetClasses() {
        let types = MonksEnhancedJournal.getDocumentTypes();
        let labels = MonksEnhancedJournal.getTypeLabels();

        game.documentTypes.JournalEntryPage

        for (let [k, v] of Object.entries(labels)) {
            if (CONFIG.JournalEntryPage.sheetClasses[k] == undefined)
                CONFIG.JournalEntryPage.sheetClasses[k] = {};
            DocumentSheetConfig.registerSheet(JournalEntryPage, "monks-enhanced-journal", types[k] || JournalPageSheet, {
                types: [k],
                makeDefault: true,
                label: i18n(v)
            });
        }

        game.system.documentTypes.JournalEntryPage = game.system.documentTypes.JournalEntryPage.concat(Object.keys(types)).sort();
        CONFIG.JournalEntryPage.typeLabels = mergeObject((CONFIG.JournalEntryPage.typeLabels || {}), labels);
    }

    static showAsChatBubble(object, journal) {
        let content = journal.content;
        let $el = $(content);

        let text = '';
        let tagName = $el.prop("tagName").toLowerCase();
        if (tagName == 'ul' || tagName == 'ol') {
            let items = $('li', $el);
            let idx = 0;
            if (tagName == 'ul') {
                idx = Math.floor(Math.random() * items.length);
            } else {
                idx = object.flags['monks-enhanced-journal']?.chatbubbleidx || 0;
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

        let broadcast = true;
        if (text.trim().startsWith('<section class="secret">')) {
            broadcast = false;
            text = text.trim().replace('<section class="secret">', "");
            let idx = text.lastIndexOf('</section>');
            text = text.slice(0, idx) + text.slice(idx + 10, text.length);
        }

        canvas.hud.bubbles.say(object, text);
        if (broadcast) {
            MonksEnhancedJournal.emit('chatbubble', { entityId: object.id, text: text });
        }
    }

    static chatbubble(data) {
        let object = canvas.tokens.get(data.entityId);
        if (!object) {
            object = canvas.notes.get(data.entityId);
            if (object) {
                //make sure we're either on the notes layer, or notes are visible
                if (!(game.settings.get("core", NotesLayer.TOGGLE_SETTING) || ui.controls.activeControl == 'notes'))
                    object = null;
            }
        } else {
            //check on line of sight for the token?
        }
        if (object) {
            canvas.hud.bubbles.say(object, data.text);
        }
    }

    static openObjectiveLink(ev) {
        let id = $(ev.currentTarget).closest('li')[0].dataset.documentId;
        let document = game.journal.get(id);
        if (!MonksEnhancedJournal.openJournalEntry(document))
            return document.sheet.render(true);
    }

    static openJournalEntry(doc, options = {}) {
        if (!game.user.isGM && !setting('allow-player'))
            return false;

        if (game.modules.get('monks-common-display')?.active) {
            let data = game.settings.get("monks-common-display", 'playerdata');
            let playerdata = data[game.user.id] || { display: false, mirror: false, selection: false };

            if (playerdata.display)
                return false;
        }

        if (doc) {
            if (doc.content?.includes('QuickEncountersTutorial'))
                return false;

            MonksEnhancedJournal.fixType(doc);

            let sheet = (!doc?._sheet ? doc?._getSheetClass() : doc?._sheet);
            if ((sheet?.name || sheet?.constructor?.name) == 'QuestPreviewShim')
                return false;
            if ((sheet?.name || sheet?.constructor?.name) == 'NoteSheet')
                return false;
            if ((sheet?.name || sheet?.constructor?.name) == 'DscrybApp')
                return false;
            if ((sheet?.name || sheet?.constructor?.name) == 'NearbyApp')
                return false;
            if (doc.flags["pdfoundry"])
                return false;
        }

        if (options.render == false || options.activate == false)
            return false;

        if (doc instanceof JournalEntry) {
            const allowed = Hooks.call(`openJournalEntry`, doc, options, game.user.id);
            if (allowed === false)
                return false;
        }
        if (doc instanceof JournalEntryPage) {
            const allowed = Hooks.call(`openJournalEntryPage`, doc, options, game.user.id);
            if (allowed === false)
                return false;
        }

        if (!game.user.isGM && doc?.getUserLevel(game.user) === CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
            if (doc.img) {
                let img = new ImagePopout(doc.img, {
                    title: doc.name,
                    uuid: doc.uuid,
                    shareable: false,
                    editable: false
                });
                img._render(true);
            } else
                ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: doc.documentName} ));
            return true;
        }

        //if the enhanced journal is already open, then just pass it the new object, if not then let it render as normal
        if (MonksEnhancedJournal.journal) {
            if (doc)
                MonksEnhancedJournal.journal.open(doc, options.newtab, { anchor: options?.anchor, autoPage: true });
            else
                MonksEnhancedJournal.journal.render(true, { anchor: options?.anchor });
        }
        else
            MonksEnhancedJournal.journal = new EnhancedJournal(doc, { anchor: options?.anchor }).render(true, { autoPage: true });

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

    static _createRequestRoll(match, ...args) {
        let [command, options, name] = match.slice(1, 5);
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
            title: `${i18n("MonksEnhancedJournal.RequestRoll")}: ${request} ${dc}`,
            label: name || i18n("MonksEnhancedJournal.RequestRoll"),
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

    static _createPictureLink(match, { async = false, relativeTo } = {}) {
        let [type, target, name] = match.slice(1, 5);
        const data = {
            cls: ["picture-link"],
            icon: 'fas fa-image',
            dataset: {},
            name: name
        };

        let doc;
        let broken = false;

        data.dataset = { id: null, uuid: target };
        if (async) {
            doc = fromUuid(target, relativeTo);
        } else {
            try {
                doc = fromUuidSync(target, relativeTo);
            } catch (err) {
                [type, ...target] = target.split(".");
                broken = TextEditor._createLegacyContentLink(type, target.join("."), name, data);
            }
        }

        // Flag a link as broken
        if (broken) {
            data.icon = "fas fa-unlink";
            data.cls.push("broken");
        }

        const constructAnchor = doc => {
            if (doc) {
                if (doc.documentName) {
                    const attrs = { draggable: true };
                    if (hash) attrs["data-hash"] = hash;
                    return doc.toAnchor({ attrs, classes: data.cls, name: data.name });
                }
                data.name = data.name || doc.name || target;
                const type = game.packs.get(doc.pack)?.documentName;
                data.dataset.type = type;
                data.dataset.id = doc._id;
                data.dataset.pack = doc.pack;
                if (hash) data.dataset.hash = hash;
            } else {
                data.icon = "fas fa-unlink";
                data.cls.push("broken");
            }

            const a = document.createElement("a");
            a.classList.add(...data.cls);
            a.draggable = true;
            for (let [k, v] of Object.entries(data.dataset)) {
                a.dataset[k] = v;
            }
            a.innerHTML = `<i class="${data.icon}"></i>${data.name}`;
            return a;
        };

        if (doc instanceof Promise) return doc.then(constructAnchor).catch(() => {
            return constructAnchor()
        });
        return constructAnchor(doc);
    }

    static async ready() {
        game.socket.on(MonksEnhancedJournal.SOCKET, MonksEnhancedJournal.onMessage);

        if (game.system.id == "sfrpg") {
            let cls = CONFIG.Actor.sheetClasses.character["sfrpg.ActorSheetSFRPGCharacter"].cls;
            let oldProcessDroppedData = cls.prototype.processDroppedData;
            cls.prototype.processDroppedData = async function (event, parsedDragData) {
                if (parsedDragData.from && parsedDragData.data) {

                    let entry = await fromUuid(parsedDragData.pageUuid);
                    if (entry) {
                        MonksEnhancedJournal.fixType(entry);
                        const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
                        if (cls && cls.itemDropped) {
                            cls.itemDropped.call(cls, parsedDragData.id, this.actor, entry).then(async (result) => {
                                if ((result?.quantity ?? 0) > 0) {
                                    setValue(parsedDragData.data, quantityname(), result.quantity);

                                    delete parsedDragData.data._id;
                                    const addedItemResult = await this.actor.createEmbeddedDocuments("Item", [parsedDragData.data], {});
                                    if (addedItemResult) {
                                        const addedItem = this.actor.items.get(addedItemResult.id);

                                        if (game.settings.get('sfrpg', 'scalingCantrips') && sidebarItem.type === "spell") {
                                            _onScalingCantripDrop(addedItem, this.actor);
                                        }
                                    }
                                }
                            });

                            return false;
                        }
                    }
                } else
                    return oldProcessDroppedData.call(this, event, parsedDragData);
            }
        }

        let chatbubbles = game.settings.settings.get("monks-enhanced-journal.show-chat-bubbles");
        if (chatbubbles)
            chatbubbles.default = !game.user.isGM;

        $('body').toggleClass("inline-roll-styling", setting("inline-roll-styling"));

        for (let entry of game.journal) {
            if (entry?.flags['monks-enhanced-journal']?.type) {
                MonksEnhancedJournal.fixType(entry);
            }
        }

        if (game.user.isGM) {
            MonksEnhancedJournal.fixItems();
            MonksEnhancedJournal.fixRelationships();
            MonksEnhancedJournal.fixPages();
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
        tinyMCE.PluginManager.add('dcconfig', dcconfiginit);

        // Preload fonts for polyglot so there isn't a delay in showing them, and possibly revealing something
        if (game.modules.get("polyglot")?.active && !isNewerVersion(game.modules.get("polyglot").version, "1.7.30")) {
            let root = $('<div>').attr('id', 'enhanced-journal-fonts').appendTo('body');
            for (let [k, v] of Object.entries(polyglot.polyglot.LanguageProvider.alphabets)) {
                $('<span>').attr('lang', k).css({ font: v }).appendTo(root);
            }
        }

        let oldDragMouseUp = Draggable.prototype._onDragMouseUp;
        Draggable.prototype._onDragMouseUp = function (event) {
            Hooks.call(`dragEnd${this.app.constructor.name}`, this.app);
            return oldDragMouseUp.call(this, event);
        }
    }

    static getIcon(type) {
        switch (type) {
            case 'picture':
            case 'image':
                return 'fa-image';
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
        log('message', data);
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

    static async stopSlideshowAudio(data) {
        if (MonksEnhancedJournal.slideshow?.sound?.src != undefined) {
            MonksEnhancedJournal.slideshow.sound.stop();
            MonksEnhancedJournal.slideshow.sound = undefined;
        }
    }

    static async stopSlideAudio(data) {
        if (MonksEnhancedJournal.slideshow?.slidesound?.src != undefined) {
            MonksEnhancedJournal.slideshow.slidesound.stop();
            MonksEnhancedJournal.slideshow.slidesound = undefined;
        }
    }

    static async playSlideshow(data) {
        if (!game.user.isGM) {
            //clear any old ones
            if (MonksEnhancedJournal.slideshow != undefined && MonksEnhancedJournal.slideshow.id != data.id)
                MonksEnhancedJournal.stopSlideshow();

            let slideshow = await fromUuid(data.uuid);
            if (slideshow) {
                MonksEnhancedJournal.slideshow = {
                    id: data.id,
                    object: slideshow,
                    content: slideshow.flags["monks-enhanced-journal"]
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
                    $('#slideshow-display header h4.window-title').html(MonksEnhancedJournal.slideshow.object.name)
                    MonksEnhancedJournal.slideshow.element = $('#slideshow-display');
                } else {
                    MonksEnhancedJournal.slideshow.element = $('#slideshow-canvas');
                    let canvascolor = slideshow.flags["monks-enhanced-journal"].canvascolor || "";
                    $(MonksEnhancedJournal.slideshow.element).css({ 'background-color': canvascolor});
                    $('.slide-padding', MonksEnhancedJournal.slideshow.element).css({ flex: '0 0 ' + $('#sidebar').width() + 'px' });
                    MonksEnhancedJournal.slideshow.element.toggleClass('fullscreen', showas == 'fullscreen');
                }
                MonksEnhancedJournal.slideshow.element.addClass('active');

                if (MonksEnhancedJournal.slideshow.content.audiofile != undefined && MonksEnhancedJournal.slideshow.content.audiofile != '' && MonksEnhancedJournal.slideshow.sound == undefined) {
                    let volume = MonksEnhancedJournal.slideshow.content.volume ?? 1;
                    AudioHelper.play({
                        src: MonksEnhancedJournal.slideshow.content.audiofile,
                        loop: MonksEnhancedJournal.slideshow.content.loopaudio,
                        volume: volume //game.settings.get("core", "globalInterfaceVolume")
                    }).then((sound) => {
                        if (MonksEnhancedJournal.slideshow)
                            MonksEnhancedJournal.slideshow.sound = sound;
                        MonksEnhancedJournal.sounds.push(sound);
                        sound._mejvolume = volume;
                        return sound;
                    });
                }

                MonksEnhancedJournal.slideshow.playing = true;
                MonksEnhancedJournal.slideshow.slideAt = -1;

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
                if (MonksEnhancedJournal.slideshow.slideAt == data.idx)
                    return;

                MonksEnhancedJournal.slideshow.slideAt = data.idx;
                let slide = MonksEnhancedJournal.slideshow.slide = MonksEnhancedJournal.slideshow.content.slides[data.idx];

                //remove any that are still on the way out
                $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).remove();

                //remove any old slides
                $('.slide-showing .slide', MonksEnhancedJournal.slideshow.element).addClass('out');

                //bring in the new slide
                let effect = (slide.transition?.effect == 'fade' ? null : slide.transition?.effect) || MonksEnhancedJournal.slideshow?.content?.transition?.effect || 'none';

                let newSlide = MonksEnhancedJournal.createSlide(slide);
                $('.slide-textarea', newSlide).css({ 'font-size': '48px' });
                $('.slide-showing', MonksEnhancedJournal.slideshow.element).append(newSlide);
                if (newSlide) {
                    var img = $('.slide-image', newSlide);

                    function loaded() {
                        newSlide.removeClass('loading');
                        if (effect != 'none' && $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).length) {
                            let realeffect = effect;
                            if (effect == 'slide-bump-left') {
                                realeffect = 'slide-slide-left';
                                $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-slide-out-right');
                            } else if (effect == 'slide-bump-right') {
                                realeffect = 'slide-slide-right';
                                $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-slide-out-left');
                            } else if (effect == 'slide-flip') {
                                realeffect = 'slide-flip-in';
                                $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-flip-out');
                            } else if (effect == 'slide-page-turn') {
                                realeffect = '';
                                $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).addClass('slide-page-out');
                                newSlide.css({ opacity: 1 });
                            }
                            newSlide.addClass(realeffect).on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function (evt) {
                                if ($(evt.target).hasClass('slide')) {
                                    $('.slide-showing .slide.out', MonksEnhancedJournal.slideshow.element).remove();
                                    newSlide.removeClass(realeffect);

                                    if (MonksEnhancedJournal.slideshow.slidesound?.src != undefined) {
                                        MonksEnhancedJournal.slideshow.slidesound.stop();
                                        MonksEnhancedJournal.slideshow.slidesound = undefined;
                                    }
                                    if (MonksEnhancedJournal.slideshow.slide.audiofile != undefined && MonksEnhancedJournal.slideshow.slide.audiofile != '') {
                                        let volume = MonksEnhancedJournal.slideshow.slide.volume ?? 1;
                                        AudioHelper.play({
                                            src: MonksEnhancedJournal.slideshow.slide.audiofile,
                                            loop: false,
                                            volume: volume //game.settings.get("core", "globalInterfaceVolume")
                                        }).then((sound) => {
                                            MonksEnhancedJournal.slideshow.slidesound = sound;
                                            MonksEnhancedJournal.sounds.push(sound);
                                            sound._mejvolume = volume;
                                            return sound;
                                        });
                                    }
                                }
                            });
                        } else {
                            newSlide.css({ opacity: 1 });
                            $('.slide-showing .slide.out', this.element).remove();
                            if (MonksEnhancedJournal.slideshow.slidesound?.src != undefined) {
                                MonksEnhancedJournal.slideshow.slidesound.stop();
                                MonksEnhancedJournal.slideshow.slidesound = undefined;
                            }
                            if (MonksEnhancedJournal.slideshow.slide.audiofile != undefined && MonksEnhancedJournal.slideshow.slide.audiofile != '') {
                                let volume = MonksEnhancedJournal.slideshow.slide.volume ?? 1;
                                AudioHelper.play({
                                    src: MonksEnhancedJournal.slideshow.slide.audiofile,
                                    loop: false,
                                    volume: volume //game.settings.get("core", "globalInterfaceVolume")
                                }).then((sound) => {
                                    MonksEnhancedJournal.slideshow.slidesound = sound;
                                    MonksEnhancedJournal.sounds.push(sound);
                                    sound._mejvolume = volume;
                                    return sound;
                                });
                            }
                        }

                        for (let text of slide.texts) {
                            if ($.isNumeric(text.fadein)) {
                                let fadein = text.fadein + (effect != 'none' ? 1 : 0);
                                $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element)
                                    .css({ 'animation-delay': fadein + 's' })
                                    .addClass('text-fade-in')
                                    .on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function () {
                                        if ($.isNumeric(text.fadeout)) {
                                            $(this).css({ 'animation-delay': text.fadeout + 's' }).removeClass('text-fade-in').addClass('text-fade-out');
                                        }
                                    });
                            }
                            else if ($.isNumeric(text.fadeout)) {
                                let fadeout = ($.isNumeric(text.fadein) ? text.fadein : 0) + (effect != 'none' ? 1 : 0) + text.fadeout;
                                $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).css({ 'animation-delay': fadeout + 's' }).addClass('text-fade-out');
                            }
                        }
                    }

                    if (img[0].complete) {
                        loaded.call(this);
                    } else {
                        img.on('load', loaded.bind(this))
                        img.on('error', function () {
                            loaded.call(this);
                        })
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
                if (MonksEnhancedJournal.slideshow?.slidesound?.src != undefined) {
                    MonksEnhancedJournal.slideshow?.slidesound.stop();
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
            let color = Color.from(t.background || '#000000');
            let style = {
                color: t.color,
                'background-color': color.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
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

        return $('<div>').addClass("slide animate-slide loading").attr('data-slide-id', slide.id)
            .append($('<div>').addClass('slide-background').append($('<div>').attr('style', background)))
            .append($('<img>').addClass('slide-image').attr('src', slide.img).css({ 'object-fit': slide.sizing}))
            .append(textarea);
    }

    static refreshObjectives(resize = false) {
        let showObjectives = (ui.controls.activeControl == 'notes' && setting('show-objectives') && setting('show-dialog'));
        if (showObjectives) {
            if (!MonksEnhancedJournal.objdisp)
                MonksEnhancedJournal.objdisp = new ObjectiveDisplay();
            MonksEnhancedJournal.objdisp.render(true);
            if (resize)
                MonksEnhancedJournal.objdisp.setPosition();
        } else if (MonksEnhancedJournal.objdisp)
            MonksEnhancedJournal.objdisp.close({ properClose: true });


        /*
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
        }*/
    }

    static updateDirectory(html, main) {
        if (setting("show-folder-sort")) {
            $('.folder', html).each(function () {
                let id = this.dataset.folderId;
                const folder = game.folders.get(id);

                if (folder.data?.sorting !== "a") {
                    $('header h3 i', this).removeClass('fas').addClass('far');
                }
            });
        }
        const levels = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
        $('.document.journalentry', html).each(function () {
            let id = this.dataset.documentId;
            let document = game.journal.get(id);

            let canShow = (game.user.isGM || setting('allow-player'));

            let docIcon = "fa-book";
            let type = "journalbook";
            if (document.pages.size == 1) {
                type = document.pages.contents[0].getFlag('monks-enhanced-journal', 'type');
                docIcon = MonksEnhancedJournal.getIcon(type);
            }

            if ($('.document-name .journal-type', this).length)
                $('.document-name .journal-type', this).attr('class', 'journal-type fas fa-fw ' + docIcon);
            else {
                let icon = $('<i>').addClass('fas fa-fw ' + docIcon);
                /*
                if (type == "journalfolder" && document.pages.contents.length > 1 && canShow) {
                    icon.on("click", (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        let collapsed = !document.getFlag('monks-enhanced-journal', 'collapsed');
                        game.folders._expanded[document.id] = !collapsed;
                        document.setFlag('monks-enhanced-journal', 'collapsed', collapsed);
                        $(`.document.journalentry.folder[data-document-id="${document.id}"]`).toggleClass("collapsed", collapsed);
                        $(`.document.journalentry.folder[data-document-id="${document.id}"] .document-name i`).toggleClass('fa-angle-down', !collapsed).toggleClass('fa-angle-right', collapsed);
                    });
                } else
                */
                    icon.addClass("journal-type");
                $('.document-name', this).prepend(icon);
            }

            /*
            if (type == "journalfolder" && !$('.subdirectory', this).length && document.pages.contents.length > 1 && canShow) {
                $(this).addClass("folder flexcol").removeClass("flexrow").attr('data-folder-id', document.id);
                if (!document.getFlag('monks-enhanced-journal', 'collapsed'))
                    game.folders._expanded[document.id] = true;
                else
                    $(this).addClass("collapsed");
                let pageList = $('<ol>').addClass("subdirectory").insertAfter($('.document-name', this));
                for (let page of document.pages.contents) {
                    let pageType = page.getFlag('monks-enhanced-journal', 'type');
                    let pageIcon = MonksEnhancedJournal.getIcon(pageType);
                    let liPage = $('<li>')
                        .addClass("directory-item document journalentrypage flexrow")
                        .attr({ "data-page-id": page.id, "data-document-id": id, "draggable": true })
                        .append(
                            $("<h4>")
                                .addClass("document-name")
                                .append($("<i>").addClass(`journal-type fas fa-fw ${pageIcon}`))
                                .append($("<a>").html(page.name))
                        )
                        .on("click", (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!MonksEnhancedJournal.openJournalEntry(page, { newtab: setting('open-new-tab') })) {
                                let sheet = page._getSheetClass();
                                new sheet(page).render(true);
                            }
                        }).appendTo(pageList);

                    if (pageType == 'quest') {
                        //let ownership = entry.ownership.default;
                        //let completed = entry.getFlag('monks-enhanced-journal', 'completed');
                        let status = page.getFlag('monks-enhanced-journal', 'status') || (page.getFlag('monks-enhanced-journal', 'completed') ? 'completed' : 'inactive');
                        $(liPage).attr('status', status);
                    }
                }
                ui.journal._dragDrop.forEach(d => d.bind(pageList[0]));
            }*/

            if (type == 'quest') {
                //let ownership = entry.ownership.default;
                //let completed = entry.getFlag('monks-enhanced-journal', 'completed');
                let status = document.getFlag('monks-enhanced-journal', 'status') || (document.getFlag('monks-enhanced-journal', 'completed') ? 'completed' : 'inactive');
                $(this).attr('status', status);
            }

            $('.document-name .permissions', this).remove();
            if ((setting('show-permissions') == 'true' || (setting('show-permissions') == 'mej' && !main)) && game.user.isGM && (document.ownership.default > 0 || Object.keys(document.ownership).length > 1)) {
                let permissions = $('<div>').addClass('permissions');

                if (document.ownership.default > 0) {
                    const [ownership] = levels.find(([, level]) => level === document.ownership.default);
                    permissions.append($('<i>').addClass('fas fa-users').attr('title', `${i18n("MonksEnhancedJournal.Everyone")}: ${i18n(`OWNERSHIP.${ownership}`)}`));
                }
                else {
                    for (let [key, value] of Object.entries(document.ownership)) {
                        let user = game.users.find(u => {
                            return u.id == key && !u.isGM;
                        });
                        if (user != undefined && value > 0) {
                            const [ownership] = levels.find(([, level]) => level === value);
                            permissions.append($('<div>').css({ backgroundColor: user.color }).html(user.name[0]).attr('title', user.name + ': ' + i18n(`OWNERSHIP.${ownership}`)));
                        }
                    }
                }
                $('h4', this).append(permissions);
            }
        });
    }

    static refreshDirectory(data) {
        ui[data.name]?.render();
    }

    static purchaseItem(data) {
        if (game.user.isGM) {
            let entry = game.journal.get(data.shopid);
            let actor = game.actors.get(data.actorid);

            if (entry) {
                MonksEnhancedJournal.fixType(entry);
                const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
                if (cls && cls.purchaseItem) {
                    cls.purchaseItem.call(cls, entry, data.itemid, data.quantity, { actor, user: data.user, chatmessage: data.chatmessage, purchased: data.purchased, remaining: data.remaining });
                    if (data.purchase === true) {
                        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == data.itemid);
                        if (item) {
                            let price = MEJHelpers.getPrice(getProperty(item, "flags.monks-enhanced-journal.cost"));
                            price.value = price.value * (data.quantity ?? 1);
                            cls.actorPurchase(actor, price);
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
            MonksEnhancedJournal.fixType(entry);
            const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
            const sheet = new cls(entry, { render: false });

            sheet.addItem({ data: data.itemdata });
        }
    }

    static async sellItem(data) {
        if (game.user.isGM) {
            let entry = game.journal.get(data.shopid);
            MonksEnhancedJournal.fixType(entry);
            const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
            const sheet = new cls(entry, { render: false });

            sheet.addItem({ data: data.itemdata });
        }
    }

    static findVacantSpot(pos, size, newTokens) {
        let tokenList = canvas.scene.tokens.contents.concat(...newTokens);

        let ring = 0;
        let width = size.width * canvas.scene.dimensions.size;
        let height = size.height * canvas.scene.dimensions.size;

        let tokenCollide = function (pt) {
            let rect1 = { x1: pt.x - (width / 2) + 10, y1: pt.y - (height / 2) + 10, x2: pt.x + (width / 2) - 10, y2: pt.y + (height / 2) - 10 };
            let found = tokenList.find(tkn => {
                let rect2 = { x1: tkn.x + 10, y1: tkn.y + 10, x2: tkn.x + (tkn.width * canvas.scene.dimensions.size) - 10, y2: tkn.y + (tkn.height * canvas.scene.dimensions.size) - 10 };

                return !(rect1.x2 < rect2.x1 || rect1.x1 > rect2.x2 || rect1.y1 > rect2.y2 || rect1.y2 < rect2.y1);
            })

            return found != undefined;
        }

        let wallCollide = function (ray) {
            for (let wall of canvas.scene.walls) {
                if (lineSegmentIntersects(ray.A, ray.B, { x: wall.c[0], y: wall.c[1] }, { x: wall.c[2], y: wall.c[3] }))
                    return true;
            }
            return false
        }

        pos = {
            x: ((pos.x - (width / 2)).toNearest(canvas.scene.dimensions.size)) + (width / 2),
            y: ((pos.y - (height / 2)).toNearest(canvas.scene.dimensions.size)) + (height / 2)
        };
        let spot = null;

        while (spot == undefined && ring < 10) {
            for (let x = -ring; x <= ring; x++) {
                for (let y = -ring; y <= ring; y++) {
                    if (Math.abs(x) == ring || Math.abs(y) == ring) {
                        let checkspot = {
                            x: pos.x + (x * canvas.scene.dimensions.size),
                            y: pos.y + (y * canvas.scene.dimensions.size)
                        };

                        //is this on the other side of a wall?
                        let ray = new Ray({ x: pos.x, y: pos.y }, { x: checkspot.x, y: checkspot.y });
                        if (wallCollide(ray))
                            continue;

                        //are there any tokens at this position?
                        if (tokenCollide(checkspot))
                            continue;

                        spot = {
                            x: checkspot.x - (width / 2),
                            y: checkspot.y - (height / 2)
                        };
                        break;
                    }
                }

                if (spot != undefined)
                    break;
            }
            ring++;
        }

        if (spot == undefined) {
            spot = { x: pos.x - (width / 2), y: pos.y - (height / 2) };
        }

        return spot;
    }

    static notify(data) {
        if (game.user.isGM) {
            ui.notifications.info(format("MonksEnhancedJournal.msg.ActorRequestedItem", { actor: data.actor, item: data.item}));
        }
    }

    static async acceptItem(status) {
        let message = this;

        let content = $(message.content);
  
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
                let msg = `<span class="request-msg"><i class="fas fa-check"></i> ${i18n("MonksEnhancedJournal.msg.ItemAddedToInventory")}</span>`;
                //find the item
                let msgitems = message.getFlag('monks-enhanced-journal', 'items');
                for (let msgitem of msgitems) {
                    if (msgitem.quantity == 0)
                        continue;
                    let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == msgitem._id);
                    if (!item) {
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                        msg = `<span class="request-msg"><i class="fas fa-times"></i> ${i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity")}</span>`
                        continue;
                    }

                    MonksEnhancedJournal.fixType(entry);
                    const cls = (entry._getSheetClass ? entry._getSheetClass() : null);

                    let remaining = getValue(item, quantityname(), null);
                    if (remaining && remaining < msgitem.quantity) {
                        //check to see if there's enough quantity
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                        msg = `<span class="request-msg"><i class="fas fa-times"></i> ${i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity")}</span>`
                        continue;
                    }

                    if (msgitem.sell > 0 && cls.canAfford) {
                        //check if the player can afford it
                        if (!cls.canAfford((msgitem.sell * msgitem.quantity) + " " + msgitem.currency, actor)) {
                            ui.notifications.warn(format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name }));
                            msg = `<span class="request-msg"><i class="fas fa-times"></i> ${format("MonksEnhancedJournal.msg.CannotTransferCannotAffordIt", { name: actor.name })}</span>`;
                            continue;
                        }
                    }

                    //Add it to the actor
                    let itemData = duplicate(item);
                    if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                        itemData = await cls.createScrollFromSpell(itemData);
                    }
                    setValue(itemData, quantityname(), msgitem.quantity);
                    if (msgitem.sell > 0)
                        setValue(itemData, pricename(), msgitem.sell + " " + msgitem.currency);
                    delete itemData._id;
                    actor.createEmbeddedDocuments("Item", [itemData]);
                    //deduct the gold
                    if (msgitem.sell > 0)
                        cls.actorPurchase(actor, { value: (msgitem.sell * msgitem.quantity), currency: msgitem.currency });
                    cls.purchaseItem.call(cls, entry, item._id, msgitem.quantity, { actor, chatmessage: false });
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

                $('.card-footer', content).html(`<span class="request-msg">${offered ? i18n("MonksEnhancedJournal.msg.ShopMadeOffer") : i18n("MonksEnhancedJournal.msg.ShopConsideringOffer")}</span>`);

                if (offered && approved) {
                    accepted = true;
                    MonksEnhancedJournal.fixType(entry);
                    const cls = (entry._getSheetClass ? entry._getSheetClass() : null);

                    let msgitems = message.getFlag('monks-enhanced-journal', 'items');
                    for (let msgitem of msgitems) {
                        if (msgitem.quantity == 0)
                            continue;

                        let actoritem = actor.items.get(msgitem._id);
                        if (!actoritem)
                            continue;

                        msgitem.maxquantity = getValue(actoritem.data, quantityname());
                        if (msgitem.maxquantity < msgitem.quantity) {
                            msgitem.quantity = Math.min(msgitem.maxquantity, msgitem.quantity);
                            ui.notifications.warn(format("MonksEnhancedJournal.msg.NoteEnoughRemains", { quantity: msgitem.quantity }));
                        }

                        //give the player the money
                        await cls.actorPurchase(actor, { value: -(msgitem.sell * msgitem.quantity), currency: msgitem.currency });

                        //remove the item from the actor
                        if (msgitem.quantity == msgitem.maxquantity) {
                            await actoritem.delete();
                        } else {
                            let qty = msgitem.maxquantity - msgitem.quantity;
                            let update = { system: {} };
                            update.system[quantityname()] = actoritem.system[quantityname()];
                            setValue(update, quantityname(), qty);
                            await actoritem.update(update);
                        }

                        //add the item to the shop
                        setValue(msgitem, quantityname(), msgitem.quantity);
                        setValue(msgitem, pricename(), (msgitem.sell * 2) + " " + msgitem.currency);
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
                        $('.card-footer', content).html(`<span class="request-msg"><i class="fas fa-check"></i> ${i18n("MonksEnhancedJournal.msg.SoldToShop")}</span>`);
                    }
                }
            }
        } else {
            accepted = false;
            $('.request-buttons', content).remove();
            $('.card-footer', content).html(`<span class="request-msg"><i class="fas fa-times"></i> ${format("MonksEnhancedJournal.msg.SaleHasBeenAction", { verb: (status == 'reject' ? i18n("MonksEnhancedJournal.Rejected").toLowerCase() : i18n("MonksEnhancedJournal.Cancelled").toLowerCase())})}</span>`);
        }

        message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { accepted: !!accepted, offered: !!offered, approved: !!approved } } });
    }

    static updateSale(event) {
        let message = this;

        let content = $(message.content);
        let id = $(event.currentTarget).closest('li').attr('data-id');

        let items = duplicate(message.getFlag('monks-enhanced-journal', 'items') || []);
        let item = items.find(i => i._id == id);
        if (item == undefined)
            return;

        let html = $(event.currentTarget).closest('ol.items-list');

        item.quantity = parseInt($(`li[data-id="${id}"] input[name="quantity"]`, html).val());
        $(`li[data-id="${id}"] .item-quantity span`, content).html(item.quantity);

        if ($(`li[data-id="${id}"] input[name="sell"]`, html).length) {
            let sell = $(`li[data-id="${id}"] input[name="sell"]`, html).val();
            let price = MEJHelpers.getPrice(sell);

            item.sell = price.value;
            item.currency = price.currency;
            item.total = item.quantity * item.sell;

            $(`li[data-id="${id}"] input[name="sell"]`, html).val(item.sell + ' ' + price.currency);

            $(`li[data-id="${id}"] .item-price span`, content).html(item.sell + ' ' + price.currency);
            $(`li[data-id="${id}"] .item-total span`, content).html(item.total + ' ' + price.currency);
        }

        message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { items: items } } });
    }

    static async openRequestItem(type, event) {
        let document;
        if (type == 'actor') {
            document = game.actors.get(this.flags['monks-enhanced-journal'].actor.id);
        } else if (type == 'shop') {
            document = game.journal.get(this.flags['monks-enhanced-journal'].shop.id);
        } else if (type == 'item') {
            let li = $(event.currentTarget).closest('li')[0]
            document = await fromUuid(li.dataset.uuid);
        }

        if (document)
            document.sheet.render(true);
    }

    static async makeOffering(data) {
        if (game.user.isGM) {
            let entry = await fromUuid(data.uuid);
            if (entry) {
                let offerings = duplicate(entry.getFlag("monks-enhanced-journal", "offerings") || []);
                data.offering.id = makeid();
                offerings.unshift(data.offering);
                await entry.setFlag("monks-enhanced-journal", "offerings", offerings);
            }
        }
    }

    static async cancelOffer(data) {
        if (game.user.isGM) {
            let entry = game.journal.get(data.entryid);
            if (entry) {
                let offerings = duplicate(entry.getFlag("monks-enhanced-journal", "offerings"));
                let offering = offerings.find(r => r.id == data.id);
                offering.hidden = true;
                offering.state = "cancelled";
                await entry.setFlag('monks-enhanced-journal', "offerings", offerings);
            }
        }
    }

    static journalListing(ctrl, html, id, name, documentId = 'documentId', fn) {
        function selectItem(event) {
            event.preventDefault();
            event.stopPropagation();
            $(`[name="${documentId}"]`, html).val(this.id);
            $('> div > span', ctrl.next()).html(this.name);
            $('.journal-list.open').removeClass('open');
            $(event.currentTarget).addClass('selected').siblings('.selected').removeClass('selected');
            if (fn) fn(this.name);
        }

        function getFolders(folders) {
            return folders.sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; }).map(f => {
                return $('<li>').addClass('journal-item folder flexcol collapse').append($('<div>').addClass('journal-title').append($("<i>").addClass(`fas fa-folder-open`)).append(f.name)).append(
                    $('<ul>')
                        .addClass('subfolder')
                        .append(getFolders(f.children.map(c => c.folder)))
                        .append((f.contents || [])
                            .sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; })
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
                .sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; })
                .map(j => { return $('<li>').addClass('journal-item').attr('id', j.id).html($('<div>').addClass('journal-title').html(j.name)).click(selectItem.bind(j)); }));

        $(html).click(function () { list.removeClass('open') });

        return $('<div>')
            .addClass('journal-select')
            .attr('tabindex', '0')
            .append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').html(name)).append($('<i>').addClass('fas fa-chevron-down')))
            .append(list)
            //.focus(function () { list.addClass('open') })
            //.blur(function () { list.removeClass('open') })
            .click(function (evt) { $('.journal-list', html).removeClass('open'); list.toggleClass('open'); evt.preventDefault(); evt.stopPropagation(); });
    }

    static async lootEntryListing(ctrl, html, collection = game.journal, uuid) {
        async function selectItem(event) {
            event.preventDefault();
            event.stopPropagation();
            let id = event.currentTarget.dataset.uuid;
            $(`[name="monks-enhanced-journal.loot-entity"]`, html).val(id);

            let name = await getEntityName(id);

            $('.journal-select-text', ctrl.next()).html(name);
            $('.journal-list.open').removeClass('open');
            $(event.currentTarget).addClass('selected').siblings('.selected').removeClass('selected');
        }

        async function getEntityName(id) {
            let entity = null;
            try {
                entity = (id ? await fromUuid(id) : null);
            } catch { }

            if (entity instanceof JournalEntryPage || entity instanceof Actor)
                return "Adding to " + entity.name;
            else if (entity instanceof JournalEntry)
                return "Adding new loot page to " + entity.name;
            else if (entity instanceof Folder)
                return (game.journal.documentName == "JournalEntry" ? "Creating new Journal Entry within " + entity.name + " folder" : "Creating within " + entity.name + " folder");
            else
                return "Creating in the root folder";
        }

        function getEntries(folderID, contents) {
            let result = [$('<li>').addClass('journal-item create-item').attr('data-uuid', folderID).html($('<div>').addClass('journal-title').toggleClass('selected', uuid == undefined).html("-- create entry here --")).click(selectItem.bind())];
            return result.concat((contents || [])
                .filter(c => !(c instanceof JournalEntryPage) || getProperty(c, "flags.monks-enhanced-journal.type") == "loot")
                .sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; })
                .map(e => {
                    if (e instanceof JournalEntry) {
                        return createFolder(e, "fa-book"); // Add the pages
                    } else
                        return $('<li>').addClass('journal-item flexrow').toggleClass('selected', uuid == e.uuid).attr('data-uuid', e.uuid).html($('<div>').addClass('journal-title').html(e.name)).click(selectItem.bind())
                }));
        }

        function createFolder(folder, icon = "fa-folder-open") {
            return $('<li>').addClass('journal-item folder flexcol collapse').append($('<div>').addClass('journal-title').append($("<i>").addClass(`fas ${icon}`)).append(folder.name)).append(
                $('<ul>')
                    .addClass('subfolder')
                    .append(getFolders(folder?.children?.map(c => c.folder)))
                    .append(getEntries(folder.uuid, folder.documents || folder.pages)))
               .click(function (event) { event.preventDefault(); event.stopPropagation(); $(this).toggleClass('collapse'); });
        }

        function getFolders(folders) {
            return (folders || []).sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; }).map(f => {
                return createFolder(f);
            });
        }

        let list = $('<ul>')
            .addClass('journal-list')
            .append(getFolders(collection.directory.folders.filter(f => f.parentFolder == null)))
            .append(getEntries(null, collection.contents.filter(j => j.folder == null)));

        $(html).click(function () { list.removeClass('open') });

        let name = await getEntityName(uuid);

        return $('<div>')
            .addClass('journal-select')
            .attr('tabindex', '0')
            .append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').addClass("journal-select-text").html(name)).append($('<i>').addClass('fas fa-chevron-down')))
            .append(list)
            .click(function (evt) { $('.journal-list', html).removeClass('open'); list.toggleClass('open'); evt.preventDefault(); evt.stopPropagation(); });
    }

    static noteIcons(ctrl, html, value) {
        function selectItem(value, name, event) {
            event.preventDefault();
            event.stopPropagation();
            if (Object.values(CONFIG.JournalEntry.noteIcons).find(i => i == value) == undefined) {
                $(`[name="icon.selected"]`, html).val('');
                $(`[name="icon.custom"]`, html).val(value).prop('disabled', false);
                $(`[data-target="icon.custom"]`, html).prop('disabled', false);
            } else {
                $(`[name="icon.selected"]`, html).val(value);
                $(`[name="icon.custom"]`, html).val('').prop('disabled', true);
                $(`[data-target="icon.custom"]`, html).prop('disabled', true);
            }
            $(' > div > span', this.next()).html(name);
            $('.journal-list.open').removeClass('open');
            $(event.currentTarget).addClass('selected').siblings('.selected').removeClass('selected');
        }

        function loadCustom(event) {
            event.preventDefault();
            event.stopPropagation();

            let filePicker = new FilePicker({
                type: "image",
                callback: path => {
                    $(`[name="icon.selected"]`, html).val('');
                    $(' > div > span', ctrl.next()).html(i18n("MonksEnhancedJournal.Custom"));
                    $(`[name="icon.custom"]`, html).val(path).prop('disabled', false);
                    $(`[data-target="icon.custom"]`, html).prop('disabled', false);
                    list.removeClass('open');
                },
            });
            filePicker.render();
        }

        let name = "";
        let list = $('<ul>')
            .addClass('journal-list')
            .append(Object.entries(CONFIG.JournalEntry.noteIcons)
                .sort(([a,], [b,]) => a.localeCompare(b))
                .map(([k, v]) => {
                    if (value == v)
                        name = k;
                    return $('<li>')
                        .addClass('journal-item note-item')
                        .toggleClass("selected", v == value)
                        .attr('value', v)
                        .append(
                            $('<div>')
                                .addClass('journal-title flexrow')
                                .append($('<img>').addClass('journal-icon').attr('src', v))
                                .append($('<span>').addClass('journal-text').html(k))
                        ).click(selectItem.bind(ctrl, v, k));
                }))
            .append($('<li>')
                .addClass('journal-item note-item')
                .append(
                    $('<div>')
                        .addClass('journal-title custom-note flexrow')
                        .append($('<span>').addClass('journal-text custom-text').html(i18n("MonksEnhancedJournal.msg.ClickCustomImage")))
                ).click(loadCustom.bind(ctrl)));

        $(html).click(function () { list.removeClass('open') });

        if (value?.length && Object.values(CONFIG.JournalEntry.noteIcons).find(i => i == value) == undefined && !name.length) {
            name = i18n("MonksEnhancedJournal.Custom");
            $(`[name="icon.selected"]`, html).val('');
        }

        return $('<div>')
            .addClass('journal-select')
            .attr('tabindex', '0')
            .append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').html(name)).append($('<i>').addClass('fas fa-chevron-down')))
            .append(list)
            .click(function (evt) { $('.journal-list', html).removeClass('open'); list.toggleClass('open'); evt.preventDefault(); evt.stopPropagation(); });
    }

    static convertReward() {
        if (MonksEnhancedJournal.journal) {
            if (!(MonksEnhancedJournal.journal.subsheet instanceof QuestSheet)) {
                console.log('Invalid journal type');
                return;
            }

            let rewards = MonksEnhancedJournal.journal.subsheet.convertRewards();
            MonksEnhancedJournal.journal.object.flags['monks-enhanced-journal'].reward = rewards[0].id;
            MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'rewards', rewards);
            MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'reward', rewards[0].id);
            MonksEnhancedJournal.journal.render(true);
        }
    }

    static fixType(object, settype) {
        if (object?.documentName == 'JournalEntryPage') {
            let type = settype || object?.flags['monks-enhanced-journal']?.type;
            if (!type && object.parent.documentName == 'JournalEntry') {
                type = object.parent?.flags['monks-enhanced-journal']?.type;
            }
            type = (type == 'base' || type == 'oldentry' ? 'journalentry' : type);

            /*
            if (game.modules.get('_document-sheet-registrar')?.active) {
                if (object.getFlag('_document-sheet-registrar', 'type') == undefined) {
                    if(!object?.compendium?.locked)
                        object.setFlag('_document-sheet-registrar', 'type', type);
                    object.flags["_document-sheet-registrar"] = { type: type };
                    warn(`Lib: Document Sheet Registrar is causing errors with Enhanced Journal.  It's recommended that you disable it`);
                } else if (!object?.compendium?.locked)
                    object.setFlag('_document-sheet-registrar', 'type', type);
            } //else {
                //object.type = type;    //set the type of all entries since Foundry won't save the new type
            //}
            */
            object.type = type || object.type;

            return type;
        } else if (getProperty(object, "flags.monks-enhanced-journal.type") == 'blank') {
            object.type = 'blank';
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

    static get defaultCurrencies() {
        switch (game.system.id) {
            case "sw5e":
                return [{ id: "gc", name: i18n("MonksEnhancedJournal.currency.galacticcredit"), convert: 0 }, { id: "cr", name: "Credit", convert: 0 }];
            case "sfrpg":
                return [{ id: "upb", name: i18n("MonksEnhancedJournal.currency.upb"), convert: 1 }, { id: "cr", name: "Credit", convert: 0 }];
            case "swade":
                return [{ id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 }];
            case "age-system":
                return [{ id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 }, { id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 }, { id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }];
            case "cyphersystem":
                return [
                    { id: 'am', name: i18n('CYPHERSYSTEM.Adamantine'), convert: 1000 },
                    { id: 'mt', name: i18n('CYPHERSYSTEM.Mithral'), convert: 100 },
                    { id: 'pt', name: i18n('CYPHERSYSTEM.Platinum'), convert: 10 },
                    { id: 'gp', name: i18n('CYPHERSYSTEM.Gold'), convert: 0 },
                    { id: 'sp', name: i18n('CYPHERSYSTEM.Silver'), convert: 0.1 },
                    { id: 'cp', name: i18n('CYPHERSYSTEM.Copper'), convert: 0.01 }
                ];
            case "tormenta20":
                return [{ id: "to", name: "TO", convert: 1 }, { id: "tp", name: "T$", convert: 0 }, { id: "tc", name: "TC", convert: 1 }];
            case "starwarsffg":
                return [{ id: "cr", name: i18n("MonksEnhancedJournal.currency.credit"), convert: 0 }];
            case "shadowrun5e":
                return [{ id: "ny", name: i18n("MonksEnhancedJournal.currency.nuyen"), convert: 0 }];
            case "fallout":
                return [{ id: "caps", name: i18n("MonksEnhancedJournal.currency.caps"), convert: 0 }];
            case "earthdawn4e":
                return [{ id: "gold", name: i18n("MonksEnhancedJournal.currency.merchants"), convert: 0 }, { id: "silver", name: i18n("MonksEnhancedJournal.currency.tavs"), convert: 0.1 }, { id: "copper", name: i18n("MonksEnhancedJournal.currency.hammer"), convert: 0.01 }];
            case "dnd5e":
            case "dnd4e":
            case "dnd3e":
            case "pf2e":
            case "pf1e":
            case "pf1":
            case "a5e":
                return [{ id: "pp", name: i18n("MonksEnhancedJournal.currency.platinum"), convert: 10 }, { id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 }, { id: "ep", name: i18n("MonksEnhancedJournal.currency.electrum"), convert: null }, { id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 }, { id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }];
            case "pf1e":
            case "pf1":
                return [{ id: "pp", name: i18n("MonksEnhancedJournal.currency.platinum"), convert: 10 }, { id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 }, { id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 }, { id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }];
            default:
            return [];
        }
    }

    static get currencies() {
        let currency = game.settings.get('monks-enhanced-journal', 'currency');
        return (currency.length == 0 || currency[0] == null ? MonksEnhancedJournal.defaultCurrencies : currency).sort((a, b) => {
            let a_c = (a.convert == 0 ? 1 : (a.convert == 1 ? 0 : a.convert));
            let b_c = (b.convert == 0 ? 1 : (b.convert == 1 ? 0 : b.convert));
            return b_c - a_c;
        });
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
        MonksEnhancedJournal.updateDirectory(jdir, false);
    }

    MonksEnhancedJournal.updateDirectory(html, true);
});

Hooks.on("renderSettingsConfig", (app, html, data) => {
    $('[name="monks-enhanced-journal.loot-sheet"]', html).on('change', async () => {
        let sheet = $('[name="monks-enhanced-journal.loot-sheet"]', html).val();

        let entityid = setting('loot-entity');
        let ctrl = $('[name="monks-enhanced-journal.loot-entity"]', html);
        if (ctrl.next().hasClass("journal-select"))
            ctrl.next().remove();
        let list = await MonksEnhancedJournal.lootEntryListing(ctrl, html, (sheet == "monks-enhanced-journal" ? game.journal : game.actors), entityid);
        list.insertAfter(ctrl);
        ctrl.hide();
    }).change();
});

Hooks.once("init", async function () {
    MonksEnhancedJournal.init();
});

Hooks.once("ready", async function () {
    MonksEnhancedJournal.ready();
});

Hooks.on("preCreateJournalEntryPage", (entry, data, options, userId) => {
    if (data.type) {
        if (entry.flags["monks-enhanced-journal"] == undefined || Object.keys(entry.flags["monks-enhanced-journal"]).length == 1) {
            let type = data.type;
            
            let flags = getProperty("flags.monks-enhanced-journal") || {};
            flags.type = type;

            MonksEnhancedJournal.fixType(entry);
            const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
            if (cls && cls.defaultObject)
                flags = mergeObject(flags, cls.defaultObject);

            if (type == "text")
                setProperty(flags, "core.sheetClass", "monks-enhanced-journal.TextEntrySheet");

            entry.type = data.type = (["video", "pdf", "image"].includes(type) ? type : "text");

            entry._source.flags['monks-enhanced-journal'] = flags;
        }
    }
});

Hooks.on("updateJournalEntryPage", (document, data, options, userId) => {
    let type = document.flags['monks-enhanced-journal']?.type;
    if (type == 'quest')
        MonksEnhancedJournal.refreshObjectives(true);

    if (data.name && type && document.parent.pages.size == 1) {
        document.parent.update({name: data.name});
    }

    if (MonksEnhancedJournal.journal) {
        if (data.name) {
            MonksEnhancedJournal.journal.updateTabNames(document.uuid, document.name);
        }

        if (MonksEnhancedJournal.journal.tabs.active().entityId?.endsWith(data._id) &&
            (data.content != undefined ||
            data.ownership != undefined ||
                (data?.flags && (data?.flags['monks-enhanced-journal']?.actor != undefined ||
                    data?.flags['monks-enhanced-journal']?.actors != undefined ||
                    data?.flags['monks-enhanced-journal']?.relationships != undefined ||
                    data?.flags['monks-enhanced-journal']?.currency != undefined ||
                    data?.flags['monks-enhanced-journal']?.items != undefined ||
                    data?.flags['monks-enhanced-journal']?.type != undefined ||
                    data?.flags['monks-enhanced-journal']?.attributes != undefined ||
                    data?.flags['monks-enhanced-journal']?.slides != undefined ||
                    data?.flags['monks-enhanced-journal']?.dcs != undefined ||
                    data?.flags['monks-enhanced-journal']?.traps != undefined ||
                    data?.flags['monks-enhanced-journal']?.objectives != undefined ||
                    data?.flags['monks-enhanced-journal']?.folders != undefined ||
                    data?.flags['monks-enhanced-journal']?.reward != undefined ||
                    data?.flags['monks-enhanced-journal']?.rewards != undefined ||
                    data?.flags['monks-enhanced-journal']?.sound != undefined ||
                    data?.flags['monks-enhanced-journal']?.offerings != undefined ||
                    data?.flags['core']?.sheetClass != undefined)))) {
            //if (data?.flags['core']?.sheetClass != undefined)
            //    MonksEnhancedJournal.journal.object._sheet = null;
            MonksEnhancedJournal.journal.render(true, { reload: true });
        }
    }
});

Hooks.on("deleteJournalEntry", (document, html, userId) => {
    if (MonksEnhancedJournal.journal) {
        MonksEnhancedJournal.journal.deleteEntity(document.uuid);
        if (document.flags['monks-enhanced-journal']?.type == 'quest' && ui.controls.activeControl == 'notes' && setting('show-objectives'))
            MonksEnhancedJournal.refreshObjectives(true);
    }
});

Hooks.on('renderSceneControls', (controls) => {
    MonksEnhancedJournal.refreshObjectives();
});

Hooks.on('dropActorSheetData', (actor, sheet, data) => {
    //check to see if an item was dropped from either the encounter or quest and record what actor it was
    if (data.id == MonksEnhancedJournal._dragItem) {
        MonksEnhancedJournal._dragItem = null;
        let journal = game.journal.get(data.journalId);
        if (journal) {
            let page = journal.pages.get(data.pageId);
            if (page) {
                MonksEnhancedJournal.fixType(page);
                const cls = (page._getSheetClass ? page._getSheetClass() : null);
                if (cls && cls.itemDropped) {
                    cls.itemDropped.call(cls, data.id, actor, page).then((result) => {
                        if ((result?.quantity ?? 0) > 0) {
                            setValue(data.data, quantityname(), result.quantity);
                            sheet._onDropItem({ preventDefault: () => { } }, data);
                        }
                    });
                }
            }
        }
        return false;
    }
});

Hooks.on('dropJournalSheetData', (journal, sheet, data) => {
    //check to see if an item was dropped from another Journal Sheet
    if (data.id == MonksEnhancedJournal._dragItem) {
        MonksEnhancedJournal._dragItem = null;
        let journal = game.journal.get(data.journalId);
        if (journal) {
            let page = journal.pages.get(data.pageId);
            if (page) {
                MonksEnhancedJournal.fixType(page);
                const cls = (page._getSheetClass ? page._getSheetClass() : null);
                if (cls && cls.itemDropped) {
                    cls.itemDropped.call(cls, data.id, journal, page).then((result) => {
                        if (!!result) {
                            setValue(data.data, quantityname(), result);
                            sheet._onDropItem({ preventDefault: () => { } }, data);
                        }
                    });

                    return false;
                }
            }
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
                return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.YouDoNotHavePermissionCreateToken"));
            }

            let encounter = await fromUuid(data.uuid);
            if (encounter) {
                MonksEnhancedJournal.fixType(encounter);
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

    MonksEnhancedJournal.journalListing(ctrl, html, app.object.entryId, data.entry.name, "entryId", (name) => {
        $('[name="text"]', html).attr("placeholder", name);
    }).insertAfter(ctrl);
    ctrl.hide();

    ctrl = $('select[name="icon.selected"]', html);

    MonksEnhancedJournal.noteIcons(ctrl, html, app.object.texture.src).insertAfter(ctrl);
    ctrl.hide();

    $('<div>').addClass('form-group')
        .append($('<label>').html(i18n("MonksEnhancedJournal.ChatBubble")))
        .append(
            $('<div>').addClass('form-fields')
                .append($('<input>').attr('type', 'checkbox').attr('name', 'flags.monks-enhanced-journal.chatbubble').prop('checked', app.object.flags['monks-enhanced-journal']?.chatbubble))
    ).insertAfter($('select[name="textAnchor"]', html).closest('.form-group'));

    app.setPosition({ height: 'auto' });
});

Hooks.on("renderTokenConfig", (app, html, data) => {
    if (game.user.isGM) {
        let ctrl = $('<input>').attr('type', 'text').attr('name', 'flags.monks-enhanced-journal.chatbubble');
        let group = $('<div>').addClass('form-group')
            .append($('<label>').html(i18n("MonksEnhancedJournal.TokenDialogJournalEntry")))
            .append(ctrl);

        let journalId = app.object.flags['monks-enhanced-journal']?.chatbubble;
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

Hooks.on("renderSceneConfig", (app, html, data) => {
    if (game.user.isGM) {
        let ctrl = $('select[name="journal"]', html);
        let journal = app.object.journal;

        MonksEnhancedJournal.journalListing(ctrl, html, journal?.id, journal?.name, 'journal').insertAfter(ctrl);
        ctrl.hide();
    }
});

Hooks.on("preDocumentSheetRegistrarInit", (settings) => {
    settings["JournalEntry"] = true;
});

Hooks.on("renderChatMessage", (message, html, data) => {
    if (message.flags['monks-enhanced-journal']) {
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
        $('<div>').addClass('assign-icon').attr('title', i18n("MonksEnhancedJournal.AssignItemsToThisActor")).append(
            $('<i>').addClass('fas fa-suitcase')
        )
    );
});

Hooks.on("getActorDirectoryEntryContext", (html, entries) => {
    entries.push({
        name: i18n("MonksEnhancedJournal.AssignItemsToThisActor"),
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
        name: i18n("MonksEnhancedJournal.AssignItemsToThisLootEntry"),
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

    if (setting("show-chatbubble")) {
        let tokenControls = controls.find(control => control.name === "token")
        tokenControls.tools.push({
            name: "tokendialog",
            title: "Toggle Token Dialog Chat Bubbles",
            icon: "fas fa-comment",
            toggle: true,
            active: setting('show-chat-bubbles'),
            onClick: toggled => {
                game.settings.set('monks-enhanced-journal', 'show-chat-bubbles', toggled);
            }
        });
    }
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
    //Change the price so we can specify the currency type
    if (data.options?.alterprice == true) {
        $('input[name="system.price"]', html).attr("name", "flags.monks-enhanced-journal.price").attr('data-dtype', 'String').attr('type', 'text').val(getProperty(data, "item.flags.monks-enhanced-journal.price"))
    }

    /*
    if (data.options?.addremaining == true) {
        let quantityGroup = $('input[name="system.quantity"]', html).closest('.form-group');
        $('<div>').addClass('form-group')
            .append($('<label>').html(i18n("MonksEnhancedJournal.Remaining")))
            .append($('<input>').attr('type', 'text').attr('name', 'flags.monks-enhanced-journal.remaining').attr('data-dtype', 'String').val(getProperty(data, "item.flags.monks-enhanced-journal.remaining")))
            .insertAfter(quantityGroup);
    }
    */

    if (data.options?.addcost == true) {
        let priceGroup = $('input[name="system.price"]', html).closest('.form-group');
        $('<div>').addClass('form-group')
            .append($('<label>').html(i18n("MonksEnhancedJournal.Cost")))
            .append($('<input>').attr('type', 'text').attr('name', 'flags.monks-enhanced-journal.cost').attr('data-dtype', 'String').val(getProperty(data, "item.flags.monks-enhanced-journal.cost")))
            .insertAfter(priceGroup);
    }
});

Hooks.on("globalInterfaceVolumeChanged", (volume) => {
    for (let sound of MonksEnhancedJournal.sounds) {
        sound.volume = (sound._mejvolume ?? 1) * volume;
    }
});

Hooks.on('dragEndObjectiveDisplay', (app) => {
    game.user.setFlag("monks-enhanced-journal", "objectivePos", { left: app.position.left, top: app.position.top, width: app.position.width });
});

Hooks.on("renderDialog", (dialog, html, data) => {
    if (dialog.options.journalentry) {
        const original = Object.entries(CONFIG.JournalEntryPage.typeLabels).map(([k, v]) => {
            if (v.startsWith("MonksEnhancedJournal"))
                return null;
            const name = game.i18n.has(v) ? game.i18n.localize(v) : v;
            return { id: k, name: name };
        })
            .filter(t => !!t)
            .sort((a, b) => { return a.name.localeCompare(b.name); });

        const types = Object.entries(MonksEnhancedJournal.getTypeLabels()).map(([k, v]) => {
            const name = game.i18n.has(v) ? game.i18n.localize(v) : v;
            return { id: k, name: name };
        })
            .filter((t, index, self) => { return self.findIndex(i => i.id == t.id) == index })
            .sort((a, b) => { return a.name.localeCompare(b.name); });

        $('<div>')
            .addClass("form-group")
            .append($('<label>').html(i18n("Type")))
            .append($('<div>')
                .addClass("form-fields")
                .append($("<select>").attr("name", "flags.monks-enhanced-journal.type").append($('<optgroup>').attr("label", "Adventure Book").append(original.map((t) => { return $('<option>').attr('value', t.id).prop("selected", t.id == "text").html(t.name) }))).append($('<optgroup>').attr("label", "Single Sheet").append(types.map((t) => { return $('<option>').attr('value', t.id).html(t.name) })))))
            .insertAfter($('[name="name"]', html).closest('.form-group'));

        dialog.setPosition({ height: "auto" });
    } else if (dialog.options.journalentrypage) {
        const types = MonksEnhancedJournal.getTypeLabels();
        $('select[name="type"] option').each((index, opt) => {
            if (types[$(opt).attr("value")] != undefined)
                $(opt).remove();
        })
    }
});

Hooks.on("setupTileActions", (app) => {
    app.registerTileGroup('monks-enhanced-journal', i18n("MonksEnhancedJournal.Title"));
    app.registerTileAction('monks-enhanced-journal', 'completequest', {
        name: i18n("MonksEnhancedJournal.ChangeQuestStatus"),
        ctrls: [
            {
                id: "entity",
                name: i18n("MonksEnhancedJournal.SelectEntity"),
                type: "select",
                subtype: "entity",
                options: { showPrevious: true },
                restrict: (entity) => { return (entity instanceof JournalEntry); },
                required: true,
                defaultType: 'journal',
                placeholder: i18n("MonksEnhancedJournal.msg.PleaseSelectJournal")
            },
            {
                id: "status",
                name: i18n("MonksEnhancedJournal.Status"),
                list: "status",
                type: "list"
            }
        ],
        group: 'monks-enhanced-journal',
        values: {
            'status': {
                "inactive": "MonksEnhancedJournal.queststatus.unavailable",
                "available": "MonksEnhancedJournal.queststatus.available",
                "completed": "MonksEnhancedJournal.queststatus.completed",
                "failed": "MonksEnhancedJournal.queststatus.failed"
            }
        },
        fn: async (args = {}) => {
            const { action } = args;

            let entities = await game.MonksActiveTiles.getEntities(args, null, 'journal');
            for (let entity of entities) {
                await entity.setFlag("monks-enhanced-journal", "status", action.data.status);
            }
        },
        content: async (trigger, action) => {
            let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
            return `<span class="action-style">${trigger.name}</span> of <span class="entity-style">${entityName}</span> to <span class="details-style">"${i18n(trigger.values.status[action.data?.status])}"</span>`;
        }
    });
    app.registerTileAction('monks-enhanced-journal', 'startencounter', {
        name: i18n("MonksEnhancedJournal.StartEncounter"),
        ctrls: [
            {
                id: "entity",
                name: i18n("MonksEnhancedJournal.SelectEntity"),
                type: "select",
                subtype: "entity",
                options: { showPrevious: true },
                restrict: (entity) => { return (entity instanceof JournalEntry); },
                required: true,
                defaultType: 'journal',
                placeholder: "MonksEnhancedJournal.msg.PleaseSelectJournal"
            },
            {
                id: "location",
                name: i18n("MonksEnhancedJournal.SelectCoordinates"),
                type: "select",
                subtype: "either",
                options: { showTagger: true, showPrevious: true },
                restrict: (entity) => { return (entity instanceof Tile && this.scene.id == entity.parent.id) || this.scene.id == entity.id; },
                required: true
            },
            {
                id: "startcombat",
                name: i18n("MonksEnhancedJournal.StartCombat"),
                type: "checkbox"
            }
        ],
        group: 'monks-enhanced-journal',
        fn: async (args = {}) => {
            const { tile, action, value } = args;

            let dests = await game.MonksActiveTiles.getLocation.call(tile, action.data.location, value);
            dests = (dests instanceof Array ? dests : [dests]);

            if (!dests.length)
                return;

            let entities = await game.MonksActiveTiles.getEntities(args, null, 'journal');
            for (let entity of entities) {
                MonksEnhancedJournal.fixType(entity);
                const cls = (entity._getSheetClass ? entity._getSheetClass() : null);
                if (cls && cls.createEncounter) {
                    cls.createEncounter.call(entity, dests[0].x, dests[0].y, action.data.startcombat);
                }
            }
        },
        content: async (trigger, action) => {
            let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
            return `<span class="action-style">${i18n(trigger.name)}</span> of <span class="entity-style">${entityName}</span> ${(action.data.startcombat ? ' <i class="fas fa-fist-raised" title="Start Combat"></i>' : '')}`;
        }
    });
    app.registerTileAction('monks-enhanced-journal', 'selectencounter', {
        name: i18n("MonksEnhancedJournal.SelectEncounter"),
        ctrls: [
            {
                id: "entity",
                name: i18n("MonksEnhancedJournal.SelectEntity"),
                type: "select",
                subtype: "entity",
                options: { showPrevious: true },
                restrict: (entity) => { return (entity instanceof JournalEntry); },
                required: true,
                defaultType: 'journal',
                placeholder: "MonksEnhancedJournal.msg.PleaseSelectJournal"
            }
        ],
        group: 'monks-enhanced-journal',
        fn: async (args = {}) => {
            const { action } = args;

            let entities = await game.MonksActiveTiles.getEntities(args, null, 'journal');
            for (let entity of entities) {
                MonksEnhancedJournal.fixType(entity);
                const cls = (entity._getSheetClass ? entity._getSheetClass() : null);
                if (cls && cls.selectEncounter) {
                    cls.selectEncounter.call(entity);
                }
            }
        },
        content: async (trigger, action) => {
            let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
            return `<span class="action-style">${i18n(trigger.name)}</span> of <span class="entity-style">${entityName}</span>`;
        }
    });
});