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
import { EventSheet } from "./sheets/EventSheet.js"
import { TextEntrySheet, TextImageEntrySheet } from "./sheets/TextEntrySheet.js"
import { backgroundinit } from "./plugins/background.plugin.js"
import { createlinkinit } from "./plugins/createlink.plugin.js"
import { NoteHUD } from "./apps/notehud.js"
import { getValue, setValue, setPrice, MEJHelpers } from "./helpers.js";

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
            event: EventSheet,
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
            event: "MonksEnhancedJournal.event",
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

    static getSystemPrice(item) {
        return MEJHelpers.getSystemPrice(item, MonksEnhancedJournal.pricename);
    }
    static getPrice(price) {
        return MEJHelpers.getPrice(price);
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
            MonksEnhancedJournal.pricename = "technology.cost";
            MonksEnhancedJournal.quantityname = "technology.quantity";
        } else if (game.system.id == "earthdawn4e") {
            MonksEnhancedJournal.currencyname = "money";
        } else if (game.system.id == "TheWitcherTRPG") {
            MonksEnhancedJournal.pricename = "cost";
        } else if (game.system.id == "fallout") {
            MonksEnhancedJournal.pricename = "cost";
        } else if (game.system.id == "swade") {
            MonksEnhancedJournal.pricename = "cost";
        } else if (game.system.id == "age-system") {
            MonksEnhancedJournal.pricename = "cost";
            MonksEnhancedJournal.currencyname = "";
        } else if (game.system.id == "archmage") {
            MonksEnhancedJournal.currencyname = "coins";
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
            title: "Enhanced Journal",
            items: [
                { block: "section", classes: "readaloud", title: "Read Aloud", wrapper: true },
                { inline: "span", classes: "drop-cap", title: "Drop Cap" }
            ]
        });

        CONFIG.TinyMCE.style_formats.push({
            title: "Dynamic Fonts",
            items: [
                { inline: "span", classes: "font-size-11", title: "11" },
                { inline: "span", classes: "font-size-12", title: "12" },
                { inline: "span", classes: "font-size-13", title: "13" },
                { inline: "span", classes: "font-size-14", title: "14" },
                { inline: "span", classes: "font-size-16", title: "16" },
                { inline: "span", classes: "font-size-18", title: "18" },
                { inline: "span", classes: "font-size-20", title: "20" },
                { inline: "span", classes: "font-size-24", title: "24" },
                { inline: "span", classes: "font-size-28", title: "28" },
                { inline: "span", classes: "font-size-32", title: "32" },
                { inline: "span", classes: "font-size-48", title: "48" }
            ]
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

        Note.prototype._onMouseOut = function (event) {
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
            if (event.altKey || this._groupSelect || game.MonksActiveTiles?.waitingInput || !MonksEnhancedJournal.openJournalEntry(entry, { newtab: setting('open-new-tab') && !hasBlank })) {
                if (entry.pages.size == 1) {
                    let page = entry.pages.contents[0];
                    MonksEnhancedJournal.fixType(page);
                    let type = getProperty(page, "flags.monks-enhanced-journal.type");
                    if (type == "base" || type == "oldentry") type = "journalentry";
                    let types = MonksEnhancedJournal.getDocumentTypes();
                    if (types[type]) {
                        return page.sheet.render(true);
                    }
                }
                return wrapped(...args);
            }
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
            libWrapper.ignore_conflicts("monks-enhanced-journal", "multiple-document-selection", "JournalDirectory.prototype._onClickDocumentName");
        }

        let oldRenderPopout = JournalDirectory.prototype.renderPopout;
        JournalDirectory.prototype.renderPopout = function () {
            if (!MonksEnhancedJournal.openJournalEntry())
                return oldRenderPopout.call(this);
        }

        Journal.prototype.constructor._showEntry = async function(entryId, mode = null, force = true, showid) {
            let entry = await fromUuid(entryId);
            const options = { tempOwnership: force, mode: JournalSheet.VIEW_MODES.MULTIPLE, pageIndex: 0 };
            if (entry instanceof JournalEntryPage) {
                options.mode = JournalSheet.VIEW_MODES.SINGLE;
                options.pageId = entry.id;
                // Set temporary observer permissions for this page.
                entry.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                entry = entry.parent;
            }
            else if (entry instanceof JournalEntry)
                entry.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
            else return;

            if (!force && !entry.visible) return;

            // Show the sheet with the appropriate mode
            if (!MonksEnhancedJournal.openJournalEntry(entry, options)) {
                if (entry.pages.size == 1) {
                    let page = entry.pages.contents[0];
                    MonksEnhancedJournal.fixType(page);
                    let type = getProperty(page, "flags.monks-enhanced-journal.type");
                    if (type == "base" || type == "oldentry") type = "journalentry";
                    let types = MonksEnhancedJournal.getDocumentTypes();
                    if (types[type]) {
                        page.parent.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                        return page.sheet.render(true, options);//return new JournalEntrySheet(page, options).render(true, options);
                    }
                }

                return entry.sheet.render(true, options);
            }
        }

        Journal.prototype.constructor.showDialog = async function (doc, options) {
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
            const hasImage = (doc instanceof JournalEntryPage) && ((["loot", "organization", "person", "place", "poi", "quest", "shop", "picture"].includes(doc.type) || (doc.type === "image")) && !!doc.src);

            let showAs = doc.getFlag("monks-enhanced-journal", "showAs") || (doc.type == "image" ? "image" : options?.showAs || "journal");
            if (!hasImage && showAs != "journal")
                showAs = "journal";
            const html = await renderTemplate("modules/monks-enhanced-journal/templates/dialog-show.html", { users, levels, hasImage, showAs });

            return Dialog.prompt({
                title: game.i18n.format("JOURNAL.ShowEntry", { name: doc.name }),
                label: game.i18n.localize("JOURNAL.ActionShow"),
                content: html,
                render: html => {
                    const form = html.querySelector("form");
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
                        let entity = doc;
                        let types = MonksEnhancedJournal.getDocumentTypes();
                        if (entity instanceof JournalEntryPage && entity.parent.pages.size == 1 && types[getProperty(entity, "flags.monks-enhanced-journal.type")])
                            entity = entity.parent;

                        const ownership = entity.ownership;
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
                        await entity.update({ ownership });
                    }
                    if (fd.showAs != "journal")
                        return this.showImage(doc.src, {
                            users,
                            title: doc.name,
                            showTitle: fd.showAs == "image",
                            uuid: doc.uuid
                        });
                    else
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

        /*
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
                    if (doc.documentName == 'JournalEntry') {
                        if (doc.pages.size == 1) {
                            let page = doc.pages.contents[0];
                            let type = getProperty(page, "flags.monks-enhanced-journal.type");
                            if (type == "base" || type == "oldentry") type = "journalentry";
                            let types = MonksEnhancedJournal.getDocumentTypes();
                            if (types[type]) {
                                MonksEnhancedJournal.fixType(page);
                                return page.sheet.render(true, { anchor: a.dataset.anchor });
                            }
                        }
                    }
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
        */
        Actor.prototype._onClickDocumentLink = function (event) {
            if (event.altKey || setting('open-outside') || !MonksEnhancedJournal.openJournalEntry(this, { newtab: event.ctrlKey && !setting("open-new-tab") })) {
                return this.sheet.render(true);
            }
        }
        Scene.prototype._onClickDocumentLink = function (event) {
            if (this.journal) {
                if (!(this.journal.pages.size == 1 && getProperty(this.journal.pages.contents[0], "flags.monks-enhanced-journal") == "slideshow"))
                    return this.journal._onClickDocumentLink(event);
            }
            if (event.ctrlKey)
                this.activate();
            else
                this.view();
        }
        JournalEntry.prototype._onClickDocumentLink = function (event) {
            const target = event.currentTarget;

            //|| ["SFDialog", "forge-compendium-browser"].includes(app?.id)
            if (event.altKey || setting('open-outside') || !MonksEnhancedJournal.openJournalEntry(this, { newtab: event.ctrlKey && !setting("open-new-tab"), anchor: target.dataset.hash })) {
                if (this.pages.size == 1) {
                    let page = this.pages.contents[0];
                    let type = getProperty(page, "flags.monks-enhanced-journal.type");
                    if (type == "base" || type == "oldentry") type = "journalentry";

                    let types = MonksEnhancedJournal.getDocumentTypes();
                    if (types[type]) {
                        MonksEnhancedJournal.fixType(page);
                        return page.sheet.render(true, { anchor: target.dataset.hash });
                    }
                }
                return this.sheet.render(true, { anchor: target.dataset.hash });
            }
        }
        JournalEntryPage.prototype._onClickDocumentLink = function (event) {
            const target = event.currentTarget;

            if (event.altKey || setting('open-outside') || !MonksEnhancedJournal.openJournalEntry(this.parent, { newtab: event.ctrlKey && !setting("open-new-tab"), pageId: this.id, anchor: target.dataset.hash })) {
                let type = getProperty(this, "flags.monks-enhanced-journal.type");
                if (type == "base" || type == "oldentry") type = "journalentry";

                let types = MonksEnhancedJournal.getDocumentTypes();
                if (types[type]) {
                    MonksEnhancedJournal.fixType(page);
                    return page.sheet.render(true, { anchor: target.dataset.hash });
                } else
                    return this.parent.sheet.render(true, { pageId: this.id, anchor: target.dataset.hash });
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
                    if (document.pages.size == 1) {
                        let page = document.pages.contents[0];
                        MonksEnhancedJournal.fixType(page);
                        let type = getProperty(page, "flags.monks-enhanced-journal.type");
                        if (type == "base" || type == "oldentry") type = "journalentry";
                        let types = MonksEnhancedJournal.getDocumentTypes();
                        if (types[type]) {
                            return page.sheet.render(true);
                        }
                    }

                    return wrapped(...args);
                }
            } else
                return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Compendium.prototype._onClickEntry", clickCompendiumEntry, "MIXED");
        } else {
            const oldOnClickEntry = Compendium.prototype._onClickEntry;
            Compendium.prototype._onClickEntry = function (event) {
                return clickCompendiumEntry.call(this, oldOnClickEntry.bind(this), ...arguments);
            }
        }

        let getEmbedded = function (wrapped, ...args) {
            let [embeddedName, id] = args;

            MonksEnhancedJournal.fixType(this);
            let type = getProperty(this, "flags.monks-enhanced-journal.type");
            if (type == "base" || type == "oldentry") type = "journalentry";
            let types = MonksEnhancedJournal.getDocumentTypes();

            if (types[type]) {
                if (embeddedName == "Items") {
                    let items = getProperty(this, "flags.monks-enhanced-journal.items");
                    let item = items.find(i => i._id == id);
                    if (item) {
                        return new Item(item);
                    }
                } else if (embeddedName == "Rewards") {
                    let rewards = getProperty(this, "flags.monks-enhanced-journal.rewards");
                    let reward = rewards.find(r => r.id == id);
                    if (reward) {
                        return mergeObject({
                            getEmbeddedDocument: function (embeddedName, id){
                                if (embeddedName == "Items") {
                                    let item = this.items.find(i => i._id == id);
                                    if (item) {
                                        return new Item(item);
                                    }
                                }
                            }
                        }, reward);
                    }
                }
            }

            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalEntryPage.prototype.getEmbeddedDocument", getEmbedded, "MIXED");
        } else {
            const oldGetEmbeddedDocument = JournalEntryPage.prototype.getEmbeddedDocument;
            JournalEntryPage.prototype.getEmbeddedDocument = function (event) {
                return getEmbedded.call(this, oldGetEmbeddedDocument.bind(this), ...arguments);
            }
        }

        let createJournalEntry = async function (wrapped, ...args) {
            let [data, options, userid] = args;
            if (game.user.id !== userid)
                return;

            let document = game.journal.get(data._id);

            // Pre create a new page
            let type = getProperty(data, "flags.monks-enhanced-journal.pagetype");
            if (game.modules.get("storyteller")?.active) {
                let types = game.StoryTeller.constructor.types;
                if (types[type] != undefined) {
                    // This is a storyteller page, it can be ignored.
                    return wrapped(...args);
                }
            }
            if (type) {
                if (data.pages.length == 0) {
                    let pageData = { type: type, name: data.name };
                    let types = MonksEnhancedJournal.getDocumentTypes();
                    if (type == "base" || type == "oldentry") type = "journalentry";
                    if (types[type]) {
                        setProperty(pageData, "flags.monks-enhanced-journal.type", type);
                    }
                    await JournalEntryPage.create(pageData, { parent: document });
                } else {
                    window.setTimeout(async () => {
                        await MonksEnhancedJournal.fixPage(document);
                        ui.journal.render();
                    }, 500);
                }
            } 
            if (!!getProperty(this, "flags.forien-quest-log") || (options.renderSheet !== false && !MonksEnhancedJournal.openJournalEntry(this, options)))
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

        let onAutosave = function (...args) {
            this.object.parent?._sheet?.render(false);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            if (JournalTextPageSheet.prototype.onAutosave)
                libWrapper.register("monks-enhanced-journal", "JournalTextPageSheet.prototype.onAutosave", onAutosave, "OVERRIDE");
        } else {
            JournalTextPageSheet.prototype.onAutosave = function (event) {
                return onAutosave.call(this, ...arguments);
            }
        }

        let getPageData = function (wrapped, ...args) {
            let pages = wrapped(...args);

            let start = 0;

            if (pages.length == 0)
                return pages;

            if (pages[0].type == "image" && !pages[0].title.show) {
                pages[0].numberIcon = 'fa-image';
                start = 1;

                if (pages.length > 1 && pages[1].type == "text" && !pages[1].title.show) {
                    pages[1].numberIcon = 'fa-list';
                    start = 2;
                }
            } else if (pages[0].type == "text" && !pages[0].title.show) {
                pages[0].numberIcon = 'fa-list';
                start = 1;
            }

            function nextChar(c) {
                return String.fromCharCode(c.charCodeAt(0) + 1);
            }

            let appendixAt = 'A';
            let pageAt = 1;
            for (let i = start; i < pages.length; i++) {
                pages[i].number = (getProperty(pages[i], "flags.monks-enhanced-journal.appendix") ? appendixAt : pageAt++);
                if (getProperty(pages[i], "flags.monks-enhanced-journal.appendix"))
                    appendixAt = nextChar(appendixAt);
            }

            return pages;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalSheet.prototype._getPageData", getPageData, "WRAPPER");
        } else {
            const oldGetPageData = JournalSheet.prototype._getPageData;
            JournalSheet.prototype._getPageData = function (event) {
                return getPageData.call(this, oldGetPageData.bind(this), ...arguments);
            }
        }

        let pageGetSubmitData = function (wrapped, ...args) {
            let data = wrapped(...args);

            if (data["title.level"] == "-1") {
                data["flags.monks-enhanced-journal.appendix"] = true;
                data["title.level"] = "1";
            } else {
                data["flags.monks-enhanced-journal.appendix"] = false;
            }

            return data;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalPageSheet.prototype._getSubmitData", pageGetSubmitData, "WRAPPER");
        } else {
            const oldPageSubmit = JournalPageSheet.prototype._getSubmitData;
            JournalPageSheet.prototype._getSubmitData = function (event) {
                return pageGetSubmitData.call(this, oldPageSubmit.bind(this), ...arguments);
            }
        }

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

        let onTemplateDragStart = function (wrapped, ...args) {
            if (this.encounterTemplate) return;
            return wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "TemplateLayer.prototype._onDragLeftStart", onTemplateDragStart, "MIXED");
        } else {
            const oldTemplateDragStart = TemplateLayer.prototype._onDragLeftStart;
            TemplateLayer.prototype._onDragLeftStart = function (event) {
                return onTemplateDragStart.call(this, oldTemplateDragStart.bind(this), ...arguments);
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
                    if (v?.notes != undefined)
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
        CompendiumCollection.prototype.importDocument = function (document, options = {}) {
            options.renderSheet = false;
            if (document instanceof JournalEntry && document.pages.size == 1 && !!getProperty(document.pages.contents[0], "flags.monks-enhanced-journal.type")) {
                let type = getProperty(document.pages.contents[0], "flags.monks-enhanced-journal.type");
                if (type == "base" || type == "oldentry") type = "journalentry";
                let types = MonksEnhancedJournal.getDocumentTypes();
                if (types[type]) {
                    setProperty(document, "_source.flags.monks-enhanced-journal.img", document.pages.contents[0].src);
                }
            }

            MonksEnhancedJournal.fixType(this.object);
            return oldImportDocument.call(this, document, options);
        }

        let oldImportFromCompendium = Journal.prototype.importFromCompendium;
        Journal.prototype.importFromCompendium = async function (collection, id, updateData = {}, options = {}) {
            options.renderSheet = false;
            return oldImportFromCompendium.call(this, collection, id, updateData, options);
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
            const options = { newtab: setting("open-new-tab")};
            if (this.page) {
                options.mode = JournalSheet.VIEW_MODES.SINGLE;
                options.pageId = this.page.id;
            }

            const allowed = Hooks.call("activateNote", this, options);

            let entity = this.page || this.entry;
            if (allowed && this.entry) {
                if (!MonksEnhancedJournal.openJournalEntry(this.entry, options)) {
                    let page = this.page;
                    if (this.entry.pages.size == 1) {
                        page = this.entry.pages.contents[0];
                        MonksEnhancedJournal.fixType(page);
                    }
                    let type = getProperty(page, "flags.monks-enhanced-journal.type");
                    if (type == "base" || type == "oldentry") type = "journalentry";
                    let types = MonksEnhancedJournal.getDocumentTypes();

                    if (this.entry.testUserPermission(game.user, "OBSERVER")) {
                        if (types[type])
                            return page.sheet.render(true);
                        else
                            return this.entry.sheet.render(true, options);
                    }
                    else if (this.entry.testUserPermission(game.user, "LIMITED")) {
                        if ((page.type == "image" || page.type == "picture") && page.src) {
                            const title = page?.name;
                            const ip = new ImagePopout(page.src, { title, caption: page?.image.caption });
                            ip.render(true);
                        }
                    } else
                        return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentname: this.entry.documentName}));
                }
            }
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Note.prototype._onClickLeft2", clickNote2, "OVERRIDE");
        } else {
            const oldClickNote = Note.prototype._onClickLeft2;
            Note.prototype._onClickLeft2 = function (event) {
                return clickNote2.call(this, oldClickNote.bind(this));
            }
        }

        let noteCanView = function (wrapped, ...args) {
            if (!this.entry) return false;
            if (game.user.isGM) return true;
            if (this.page?.testUserPermission(game.user, "LIMITED", { exact: true })) {
                // Special-case handling for image pages.
                return this.page?.type === "image" || getProperty(this.page, "flags.monks-enhanced-journal.type") == "picture";
            }
            const accessTest = this.page ? this.page : this.entry;
            return accessTest.testUserPermission(game.user, "OBSERVER");
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "Note.prototype._canView", noteCanView, "OVERRIDE");
        } else {
            const oldCanView = Note.prototype._canView;
            Note.prototype._canView = function (event) {
                return noteCanView.call(this, oldCanView.bind(this));
            }
        }

        let clickNote = function (wrapped, ...args) {
            if ((setting("show-chat-bubbles") || !game.user.isGM) && this.document.flags['monks-enhanced-journal']?.chatbubble) {
                let journal = game.journal.get(this.document.entryId);
                if (journal && !journal.testUserPermission(game.user, "OBSERVER"))
                    MonksEnhancedJournal.showAsChatBubble(this, journal, this.document.pageId);
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
            if ((setting("show-chat-bubbles") || !game.user.isGM) && this.document.flags['monks-enhanced-journal']?.chatbubble) {
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

            if (entry?.pages.size == 1) {
                let page = entry.pages.contents[0];
                noteData.pageId = page.id;

                MonksEnhancedJournal.fixType(page);

                if (page.type == 'shop')
                    noteData.icon = "icons/svg/hanging-sign.svg";
                else if (page.type == 'loot')
                    noteData.icon = page.src || "icons/svg/chest.svg";
                else if (page.type == 'encounter')
                    noteData.icon = "icons/svg/sword.svg";
                else if (page.type == 'place')
                    noteData.icon = "icons/svg/village.svg";
                else if (page.type == 'person')
                    noteData.icon = "icons/svg/cowled.svg";

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
        let createContentLink = function (wrapped, ...args) {
            let [match, options] = args;
            let { async, relativeTo } = (options || {});
            let [type, target, hash, name] = match.slice(1, 5);
            let parts = [target];
            if (type == "JournalEntry") {
                parts = target.split('#');
            }
            if (setting("hide-inline")) {
                let doc;
                if (CONST.DOCUMENT_TYPES.includes(type)) {
                    const collection = game.collections.get(type);

                    doc = /^[a-zA-Z0-9]{16}$/.test(parts[0]) ? collection.get(parts[0]) : collection.getName(parts[0]);
                } else if (type == "UUID") {
                    if (async) {
                        try {
                            doc = fromUuid(target, relativeTo);
                        } catch (err) {
                        }
                    } else {
                        try {
                            doc = fromUuidSync(target, relativeTo);
                        } catch (err) {
                        }
                    }
                }

                const checkPermission = doc => {
                    if (!game.user.isGM && doc && ((!doc.compendium && doc.testUserPermission && !doc.testUserPermission(game.user, "OBSERVER")) || (doc.compendium && doc.compendium.private))) {
                        const span = document.createElement('span');
                        span.classList.add("unknown-link");
                        span.innerHTML = `<i class="fas fa-eye-slash"></i> Hidden`;
                        return span;
                    } else {
                        let a = wrapped.call(this, match, options);
                        if (parts.length > 1) {
                            $(a).attr("data-anchor", parts[1]).append(`, ${parts[1]}`);
                        }
                        return a;
                    }
                }
                if (doc instanceof Promise) return doc.then(checkPermission).catch((err) => { checkPermission(); })
                else return checkPermission(doc);
            }

            let a = wrapped.call(this, match, options);
            if (parts.length > 1) {
                $(a).attr("data-anchor", parts[1]).append(`, ${parts[1]}`);
            }
            return a;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "TextEditor._createContentLink", createContentLink, "MIXED");
        } else {
            const oldCreateContentLink = TextEditor._createContentLink;
            TextEditor._createContentLink = function (event) {
                return createContentLink.call(this, oldCreateContentLink.bind(this), ...arguments);
            }
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

        let journalSheetContext = function (wrapped, ...args) {
            const getPage = li => this.object.pages.get(li.data("page-id"));

            let context = wrapped(...args);
            context.push({
                name: "Extract",
                icon: '<i class="fas fa-file-arrow-down"></i>',
                condition: li => getPage(li)?.isOwner,
                callback: async (li) => {
                    const page = getPage(li);
                    if (page) {
                        let data = this.object.toObject();
                        data.name = page.name;
                        let pageData = page.toObject();
                        delete pageData._id;
                        data.pages = [pageData];
                        delete data._id;
                        let newDoc = await JournalEntry.create(data);

                        //page.delete();

                        MonksEnhancedJournal.openJournalEntry(newDoc);
                    }
                }
            });
            return context;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalSheet.prototype._getEntryContextOptions", journalSheetContext, "WRAPPER");
        } else {
            const oldContext = JournalSheet.prototype._getEntryContextOptions;
            JournalSheet.prototype._getEntryContextOptions = function (event) {
                return journalSheetContext.call(this, oldContext.bind(this), ...arguments);
            }
        }

        let onDirectoryContextMenu = function (wrapped, ...args) {
            let context = wrapped(...args);

            context.push({
                name: "Convert to Enhanced Journal",
                icon: '<i class="fas fa-file-arrow-down"></i>',
                condition: li => {
                    let journal = game.journal.get(li[0].dataset.documentId);
                    if (!journal)
                        return false;

                    if (!journal.isOwner)
                        return false;

                    if (journal.pages.size == 1 && (!!getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type") || !!getProperty(journal, "flags.monks-enhanced-journal.type"))) {
                        let type = getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type") || getProperty(journal, "flags.monks-enhanced-journal.type");
                        if (type == "base" || type == "oldentry") type = "journalentry";
                        let types = MonksEnhancedJournal.getDocumentTypes();
                        if (types[type]) return false;
                    }
                    return true;
                },
                callback: async (li) => {
                    let journal = game.journal.get(li[0].dataset.documentId);
                    if (journal) {
                        let isGood = true;
                        if (journal.pages.size > 1) {
                            isGood = await Dialog.confirm({
                                title: "Confirm Page Deletion",
                                content: "This Journal has more than one page.  Monk's Enhanced Journal only uses one page, so the additional pages will be deleted and cannot be recovered. <br><br>Are you sure you wish to continue?"
                            });
                        }

                        if (isGood) {
                            while (journal.pages.size > 1) {
                                await journal.pages.contents[1].delete();
                            }
                            let page = journal.pages.contents[0];
                            let type = getProperty(page, "flags.monks-enhanced-journal.type");
                            if (type == "base" || type == "oldentry") type = "journalentry";
                            let types = MonksEnhancedJournal.getDocumentTypes();
                            if (!types[type])
                                await page.setFlag("monks-enhanced-journal", "type", (journal.type == "image" ? "picture" : "journalentry"));

                            page._sheet = null;
                            await ui.sidebar.tabs.journal.render(true);
                        }
                    }
                }
            });

            return context;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalDirectory.prototype._getEntryContextOptions", onDirectoryContextMenu, "WRAPPER");
        } else {
            const oldDirectoryContextMenu = JournalDirectory.prototype._getEntryContextOptions;
            JournalDirectory.prototype._getEntryContextOptions = function (event) {
                return onDirectoryContextMenu.call(this, oldDirectoryContextMenu.bind(this), ...arguments);
            }
        }

        let journalSheetDrop = async function (wrapped, ...args) {
            let result = await wrapped(...args);

            if (!this._canDragDrop()) return;

            // Retrieve the dropped Journal Entry Page
            const data = TextEditor.getDragEventData(event);
            if (data.type == "JournalEntry") {
                const entry = await JournalEntry.implementation.fromDropData(data);

                const createData = [];
                if (entry.pages.size == 1 && (!!getProperty(entry.pages.contents[0], "flags.monks-enhanced-journal.type") || !!getProperty(entry, "flags.monks-enhanced-journal.type"))) {
                    let type = getProperty(entry.pages.contents[0], "flags.monks-enhanced-journal.type") || getProperty(entry, "flags.monks-enhanced-journal.type");
                    if (type == "base" || type == "oldentry") type = "journalentry";
                    let types = MonksEnhancedJournal.getDocumentTypes();
                    if (types[type]) {
                        let pageData = entry.pages.contents[0].toObject();
                        if (pageData.src && pageData.type == "text") {
                            let imgPage = duplicate(pageData);
                            imgPage.type = "image";
                            imgPage.name = imgPage.name + " Image";
                            delete imgPage._id;
                            createData.push(imgPage);
                        }
                        if (this.object.pages.has(pageData._id)) delete pageData._id;
                        createData.push(pageData);
                        return this.document.createEmbeddedDocuments("JournalEntryPage", createData, { keepId: true });
                    }
                }

                for (let page of entry.pages) {
                    let pageData = page.toObject();
                    if (this.object.pages.has(page.id)) delete pageData._id;
                    createData.push(pageData);
                }

                return this.document.createEmbeddedDocuments("JournalEntryPage", createData, { keepId: true });
            }

            return result;
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalSheet.prototype._onDrop", journalSheetDrop, "WRAPPER");
        } else {
            const oldDrop = JournalSheet.prototype._onDrop;
            JournalSheet.prototype._onDrop = function (event) {
                return journalSheetDrop.call(this, oldDrop.bind(this), ...arguments);
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
            if (getProperty(journal, "flags.monks-enhanced-journal.type") != undefined) {
                MonksEnhancedJournal.fixPage(journal);
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
                game.settings.set("monks-enhanced-journal", "loot-entity", entity?.uuid);
            }
        } else if (setting("loot-entity") == "create") {
            let folder = game.folders.get(setting("loot-folder"));
            game.settings.set("monks-enhanced-journal", "loot-entity", folder?.uuid);
        }
    }

    static async fixPage(document) {
        if (!document)
            return;

        let types = MonksEnhancedJournal.getDocumentTypes();

        // fix the splitting of Journal Entry pages
        let type = getProperty(document, "flags.monks-enhanced-journal.type");
        let flags = getProperty(document, "flags.monks-enhanced-journal");
        if (type == "base") {
            type = "journalentry";
            flags.type = type;
        }
        if (!!type && document.pages.size == 0) {
            await JournalEntryPage.create({ name: document.name, type: "text", flags: { "monks-enhanced-journal": flags } }, { parent: document, render: false });
        } else if (document.pages.size < 3 && type != "oldentry" && types[type]) {
            let picturePage = document.pages.find(p => p.type == "image");
            let textPage = document.pages.find(p => p.type == "text");
            if (textPage) {
                if (type == "picture") {
                    await textPage.delete();
                    await picturePage.update({ name: document.name, flags: { "monks-enhanced-journal": flags } });
                } else {
                    await textPage.update({ name: document.name, src: picturePage?.src, flags: { "monks-enhanced-journal": flags } });
                    if (picturePage)
                        await picturePage.delete();
                }
            } else if (picturePage) {
                await picturePage.update({ name: document.name, flags: { "monks-enhanced-journal": flags } });
            }
        }
        for (let page of document.pages) {
            let journalFlags = document.flags['monks-enhanced-journal'];
            if (journalFlags.items) {
                for (let item of journalFlags.items) {
                    if (item.data) {
                        let data = item.data;
                        delete item.data;
                        item.system = data;
                        let quantity = getValue(item, quantityname()) ?? getValue(item.system, quantityname());
                        let price = MEJHelpers.getPrice(MEJHelpers.getSystemPrice(item, "price"));
                        item.flags = mergeObject((item.flags || {}), {
                            "monks-enhanced-journal": {
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
                    }
                }
            }
            if (journalFlags.rewards) {
                for (let reward of journalFlags.rewards) {
                    for (let item of reward.items) {
                        if (item.data) {
                            let data = item.data;
                            delete item.data;
                            item.system = data;
                            let quantity = getValue(item, quantityname()) ?? getValue(item.system, quantityname());
                            let price = MEJHelpers.getPrice(MEJHelpers.getSystemPrice(item, "price"));
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
                        }
                    }
                }
            }
            await page.update({ flags: { "monks-enhanced-journal": journalFlags } });
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
        DocumentSheetConfig.registerSheet(JournalEntryPage, "monks-enhanced-journal", TextImageEntrySheet, {
            types: ["journalentry"],
            makeDefault: false,
            label: "Text and Image"
        });

        game.system.documentTypes.JournalEntryPage = game.system.documentTypes.JournalEntryPage.concat(Object.keys(types)).sort();
        CONFIG.JournalEntryPage.typeLabels = mergeObject((CONFIG.JournalEntryPage.typeLabels || {}), labels);
    }

    static showAsChatBubble(object, journal, pageId) {
        if (!journal || !journal.pages || journal.pages.size == 0)
            return;

        let page;

        if (journal.pages.size == 1 && !!getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type")) {
            let type = getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type") || getProperty(journal, "flags.monks-enhanced-journal.type");
            if (type == "base" || type == "oldentry") type = "journalentry";
            let types = MonksEnhancedJournal.getDocumentTypes();
            if (types[type])
                page = journal.pages.contents[0];
        }
        if (pageId && !page) {
            journal.pages.get(pageId);
        }

        if (!page)
            return;

        let content = page.text.content;
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
            if ((sheet?.name || sheet?.constructor?.name) == 'StorySheet')
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
        options = mergeObject(options, { force: options?.tempOwnership, autoPage: true });
        if (MonksEnhancedJournal.journal) {
            if (doc)
                MonksEnhancedJournal.journal.open(doc, options.newtab, options);
            else {
                delete options.autoPage;
                MonksEnhancedJournal.journal.render(true, options);
            }
        }
        else
            MonksEnhancedJournal.journal = new EnhancedJournal(doc, options).render(true, options);

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

    static async _onClickPictureLink(event) {
        event.preventDefault();
        const a = event.currentTarget;
        let document = null;
        let id = a.dataset.id;

        /*
        // Target 1 - Compendium Link
        if (a.dataset.pack) {
            const pack = game.packs.get(a.dataset.pack);
            if (a.dataset.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
                if (entry) {
                    a.dataset.id = id = entry._id;
                    delete a.dataset.lookup;
                }
            }
            document = id ? await pack.getDocument(id) : null;
        }

        // Target 2 - World Entity Link
        else {*/
        document = game.journal.get(id);
        if (!document) return;
        if (!document.testUserPermission(game.user, "LIMITED")) {
            return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: document.documentName }));
        }
        //}
        if (!document) return;

        new ImagePopout(document.img, {
            title: document.name,
            uuid: document.uuid,
            shareable: false,
            editable: false
        })._render(true);

        //if (game.user.isGM)
        //    this._onShowPlayers({ data: { object: document } });
    }

    static async ready() {
        game.socket.on(MonksEnhancedJournal.SOCKET, MonksEnhancedJournal.onMessage);

        if (game.system.id == 'pf2e') {
            MonksEnhancedJournal.pf2eCurrency = {};
            let pack = game.packs.get("pf2e.equipment-srd");
            const index = await pack.getIndex();
            for (let [key, coin] of Object.entries({ cp: "Copper Pieces", sp: "Silver Pieces", gp: "Gold Pieces", pp: "Platinum Pieces" })) {
                let item = index.find(i => i.name == coin);
                if (item) {
                    const document = await pack.getDocument(item._id);
                    MonksEnhancedJournal.pf2eCurrency[key] = document.toObject();
                }
            }
        } else if (game.system.id == 'wfrp4e') {
            MonksEnhancedJournal.wfrp4eCurrency = {};
            let pack = game.packs.get("wfrp4e.basic");
            const index = await pack.getIndex();
            for (let [key, coin] of Object.entries({ gc: "Gold Crown", ss: "Silver Shilling", bp: "Brass Penny" })) {
                let item = index.find(i => i.name == coin);
                if (item) {
                    const document = await pack.getDocument(item._id);
                    MonksEnhancedJournal.wfrp4eCurrency[key] = document.toObject();
                }
            }
        }

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
            if (setting("fix-journals")) {
                try {
                    MonksEnhancedJournal.fixPages();
                    game.settings.set("monks-enhanced-journal", "fix-journals", false);
                } catch { }
            }
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
        if (setting("add-create-link"))
            tinyMCE.PluginManager.add('createlink', createlinkinit);

        // Preload fonts for polyglot so there isn't a delay in showing them, and possibly revealing something
        if (game.modules.get("polyglot")?.active && !isNewerVersion(game.modules.get("polyglot")?.version, "1.7.30")) {
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
            case 'image': return 'fa-image';
            case 'person': return 'fa-user';
            case 'place': return 'fa-place-of-worship';
            case 'slideshow': return 'fa-photo-video';
            case 'encounter': return 'fa-toolbox';
            case 'event': return 'fa-calendar-days';
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

    static async saveUserData(data) {
        if (game.user.isGM) {
            let document = await fromUuid(data.documentId);
            if (document) {
                let update = {};
                update["flags.monks-enhanced-journal." + data.userId] = data.userdata;

                document.update(update);
            }
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

    static async addRelationship(data) {
        if (game.user.isGM) {
            let original = await fromUuid(data.uuid);
            let orgPage = original.pages.contents[0];
            if (original.isOwner && orgPage.isOwner) {
                MonksEnhancedJournal.fixType(orgPage);
                let sheet = orgPage.sheet;
                sheet.addRelationship({ id: data.relationship.id, uuid: data.relationship.uuid, hidden: data.hidden }, false);
            }
        }
    }

    static async deleteRelationship(data) {
        if (game.user.isGM) {
            let original = await fromUuid(data.uuid);
            let orgPage = original.pages.contents[0];
            if (original.isOwner && orgPage.isOwner) {
                let pageData = duplicate(getProperty(orgPage, "flags.monks-enhanced-journal.relationships") || {});
                pageData.findSplice(i => i.id == data.id || i._id == data.id);
                orgPage.setFlag('monks-enhanced-journal', "relationships", pageData);
            }
        }
    }

    /*
    static startSlideshow(id) {
        let journal = game.journal.get(id);
        if (journal && journal.pages.size == 1 && getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type") == "slideshow") {
            let page = journal.pages.contents[0];
            page.type = "slideshow";
            return page.sheet.render(true, { play: true });
        }
    }

    static endSlideshow(id) {
        let journal = game.journal.get(id);
        if (journal && journal.pages.size == 1 && getProperty(journal.pages.contents[0], "flags.monks-enhanced-journal.type") == "slideshow") {
            let page = journal.pages.contents[0];
            let sheet = page.sheet;
            sheet.stopSlideshow();
        }
    }
    */

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
        let showObjectives = ((ui.controls.activeControl == 'notes' || setting('objectives-always')) && setting('show-objectives') && setting('show-dialog'));
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

                if (folder?.sorting !== "a") {
                    $('header h3 i', this).removeClass('fas').addClass('far');
                }
            });
        }
        const levels = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
        const types = MonksEnhancedJournal.getDocumentTypes();
        $('.document.journalentry', html).each(function () {
            let id = this.dataset.documentId;
            let document = game.journal.get(id);

            let canShow = (game.user.isGM || setting('allow-player'));

            let docIcon = "fa-book";
            let type = "journalbook";
            if (document.pages.size == 1) {
                type = document.pages.contents[0].getFlag('monks-enhanced-journal', 'type');
                if (type == "base" || type == "oldentry") type = "journalentry";
                if (types[type])
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
                let page = document.pages.contents[0];
                let status = getProperty(page, 'flags.monks-enhanced-journal.status') || (getProperty(page, 'flags.monks-enhanced-journal.completed') ? 'completed' : 'inactive');
                $(this).attr('status', status);
            }

            $('.document-name .permissions', this).remove();
            if ((setting('show-permissions') == 'true' || (setting('show-permissions') == 'mej' && !main)) && game.user.isGM && (document.ownership.default > 0 || Object.keys(document.ownership).length > 1)) {
                let permissions = $('<div>').addClass('permissions');

                if (document.ownership.default > 0) {
                    const [ownership] = levels.find(([, level]) => level === document.ownership.default);
                    permissions.append($('<i>').addClass('fas fa-users').attr('title', `${i18n("MonksEnhancedJournal.Everyone")}: ${i18n(`OWNERSHIP.${ownership}`)}`));
                }
                for (let [key, value] of Object.entries(document.ownership)) {
                    let user = game.users.find(u => {
                        return u.id == key && !u.isGM;
                    });
                    if (user != undefined && value > 0 && value != document.ownership.default) {
                        const [ownership] = levels.find(([, level]) => level === value);
                        permissions.append($('<div>').css({ backgroundColor: user.color }).html(user.name[0]).attr('title', user.name + ': ' + i18n(`OWNERSHIP.${ownership}`)));
                    }
                }
                $('h4', this).append(permissions);
            }
        });
    }

    static refreshDirectory(data) {
        ui[data.name]?.render();
    }

    static async purchaseItem(data) {
        if (game.user.isGM) {
            let entry = await fromUuid(data.shopid);
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

    static async requestLoot(data) {
        if (game.user.isGM) {
            let entry = await fromUuid(data.shopid);
            let actor = game.actors.get(data.actorid);

            if (entry && actor) {
                let items = duplicate(entry.getFlag('monks-enhanced-journal', 'items') || []);
                let item = items.find(i => i._id == data.itemid);
                if (item) {
                    let requests = getProperty(item, "flags.monks-enhanced-journal.requests") || {};
                    requests[data.senderId] = !requests[data.senderId];
                    setProperty(item, "flags.monks-enhanced-journal.requests", requests);
                }
                entry.setFlag('monks-enhanced-journal', 'items', items);
            }
        }
    }

    static async addItem(data) {
        if (game.user.isGM) {
            let entry = await fromUuid(data.lootid);
            if (entry) {
                MonksEnhancedJournal.fixType(entry);
                const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
                const sheet = new cls(entry, { render: false });

                sheet.addItem({ data: data.itemdata });
            }
        }
    }

    static async sellItem(data) {
        if (game.user.isGM) {
            let entry = await fromUuid(data.shopid);
            if (entry) {
                MonksEnhancedJournal.fixType(entry);
                const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
                const sheet = new cls(entry, { render: false });

                sheet.addItem({ data: data.itemdata });
            }
        }
    }

    static findVacantSpot(template, size, newTokens, center) {
        let tokenList = canvas.scene.tokens.contents.concat(...newTokens);

        let width = size.width * canvas.scene.dimensions.size;
        let height = size.height * canvas.scene.dimensions.size;
        let hw = width / 2;
        let hh = height / 2;

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

        // get the template grid positions
        let positions = template._getGridHighlightPositions();
        positions = positions.filter(p => {
            let { x, y } = p;
            // remove all the ones behind a wall
            let checkspot = {
                x: x + hw,
                y: y + hh
            };

            //is this on the other side of a wall?
            let ray = new Ray({ x: template.x, y: template.y }, { x: checkspot.x, y: checkspot.y });
            return !wallCollide(ray);
        });

        if (positions.length == 0)
            return { x: template.x - hw, y: template.y - hh };
        
        // find one without a token
        let noTokens = positions.filter(p => {
            return !tokenCollide(p);
        });

        let array = (noTokens.length == 0 ? positions : noTokens);
        if (center) {
            array = array.sort((a, b) => {
                return Math.hypot((template.x - a.x), (template.y - a.y)) - Math.hypot((template.x - b.x), (template.y - b.y))
            });
            return { x: array[0].x - (width / 2), y: array[0].y - (height / 2) };
        } else {
            // if there aren't any, then just pick a random spot
            let position = array[parseInt(Math.random() * array.length)];
            return { x: position.x, y: position.y };
        }
    }

    static _getGridHighlightPositions(template) {
        const grid = canvas.grid.grid;
        const d = canvas.dimensions;
        const { x, y, distance } = template;

        // Get number of rows and columns
        const [maxRow, maxCol] = grid.getGridPositionFromPixels(d.width, d.height);
        let nRows = Math.ceil(((distance * 1.5) / d.distance) / (d.size / grid.h));
        let nCols = Math.ceil(((distance * 1.5) / d.distance) / (d.size / grid.w));
        [nRows, nCols] = [Math.min(nRows, maxRow), Math.min(nCols, maxCol)];

        // Get the offset of the template origin relative to the top-left grid space
        const [tx, ty] = grid.getTopLeft(x, y);
        const [row0, col0] = grid.getGridPositionFromPixels(tx, ty);
        const [hx, hy] = [Math.ceil(grid.w / 2), Math.ceil(grid.h / 2)];
        const isCenter = (x - tx === hx) && (y - ty === hy);

        // Identify grid coordinates covered by the template Graphics
        const positions = [];
        for (let r = -nRows; r < nRows; r++) {
            for (let c = -nCols; c < nCols; c++) {
                const [gx, gy] = grid.getPixelsFromGridPosition(row0 + r, col0 + c);
                const [testX, testY] = [(gx + hx) - x, (gy + hy) - y];
                const contains = ((r === 0) && (c === 0) && isCenter) || grid._testShape(testX, testY, this.shape);
                if (!contains) continue;
                positions.push({ x: gx, y: gy });
            }
        }
        return positions;
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
            let entry = await fromUuid(msgshop.uuid);
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
                    let data = getProperty(msgitem, "flags.monks-enhanced-journal")
                    let purchaseQty = data.quantity;
                    if (purchaseQty == 0)
                        continue;
                    let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == msgitem._id);
                    if (!item) {
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                        msg = `<span class="request-msg"><i class="fas fa-times"></i> ${i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity")}</span>`
                        continue;
                    }

                    MonksEnhancedJournal.fixType(entry);
                    const cls = (entry._getSheetClass ? entry._getSheetClass() : null);

                    let remaining = getProperty(item, "flags.monks-enhanced-journal.quantity");
                    if (remaining && remaining < purchaseQty) {
                        //check to see if there's enough quantity
                        ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                        msg = `<span class="request-msg"><i class="fas fa-times"></i> ${i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity")}</span>`
                        continue;
                    }

                    if (data.sell > 0 && cls.canAfford) {
                        //check if the player can afford it
                        if (!cls.canAfford((data.sell * purchaseQty) + " " + data.currency, actor)) {
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
                    let itemQty = getValue(itemData, quantityname(), 1);
                    setValue(itemData, quantityname(), purchaseQty * itemQty);
                    if (data.sell > 0)
                        setPrice(itemData, pricename(), data.sell + " " + data.currency);
                    delete itemData._id;
                    if (!data.consumable) {
                        let sheet = actor.sheet;
                        sheet._onDropItem({ preventDefault: () => { } }, { type: "Item", uuid: `${entry.uuid}.Items.${item._id}`, data: itemData });
                    }
                    //actor.createEmbeddedDocuments("Item", [itemData]);
                    //deduct the gold
                    if (data.sell > 0)
                        cls.actorPurchase(actor, { value: (data.sell * purchaseQty), currency: data.currency });
                    cls.purchaseItem.call(cls, entry, item._id, data.quantity, { actor, chatmessage: false });
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
                        let data = getProperty(msgitem, "flags.monks-enhanced-journal")
                        let purchaseQty = data.quantity;

                        if (purchaseQty == 0)
                            continue;

                        let actoritem = actor.items.get(msgitem._id);
                        if (!actoritem)
                            continue;

                        data.maxquantity = getValue(actoritem.data, quantityname());
                        if (data.maxquantity < purchaseQty) {
                            purchaseQty = Math.min(data.maxquantity, purchaseQty);
                            ui.notifications.warn(format("MonksEnhancedJournal.msg.NoteEnoughRemains", { quantity: purchaseQty }));
                        }

                        //give the player the money
                        await cls.actorPurchase(actor, { value: -(data.sell * purchaseQty), currency: data.currency });

                        //remove the item from the actor
                        if (purchaseQty == data.maxquantity) {
                            await actoritem.delete();
                        } else {
                            let qty = data.maxquantity - purchaseQty;
                            let update = { system: {} };
                            update.system[quantityname()] = actoritem.system[quantityname()];
                            setValue(update, quantityname(), qty);
                            await actoritem.update(update);
                        }

                        //add the item to the shop
                        data.quantity = purchaseQty;
                        data.price = (data.sell * 2) + " " + data.currency;
                        data.lock = true;
                        data.from = actor.name;

                        setProperty(msgitem, "flags.monks-enhanced-journal", data);

                        if (!game.user.isGM)
                            MonksEnhancedJournal.emit("sellItem", { shopid: msgshop.uuid, itemdata: msgitem });
                        else {
                            const sheet = new cls(entry, { render: false });
                            await sheet.addItem(msgitem);
                        }

                        $('input', content).remove();
                        $('.item-quantity span, .item-price span', content).removeClass('player-only').show();
                        $('.request-buttons', content).remove();
                        $('input', content).remove();
                        $('.item-quantity span, .item-price span', content).removeClass('player-only').show();
                        $('.card-footer', content).html(`<span class="request-msg"><i class="fas fa-check"></i> ${i18n("MonksEnhancedJournal.msg.SoldToShop")}</span>`);
                    }
                }
            }
        } else {
            accepted = false;
            $('.request-buttons', content).remove();
            $('input', content).remove();
            $('.item-quantity span, .item-price span', content).removeClass('player-only').show();
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

        let quantity = parseInt($(`li[data-id="${id}"] input[name="flags.monks-enhanced-journal.quantity"]`, html).val());
        setProperty(item, "flags.monks-enhanced-journal.quantity", quantity);
        $(`li[data-id="${id}"] .item-quantity span`, content).html(quantity);

        if ($(`li[data-id="${id}"] input[name="flags.monks-enhanced-journal.sell"]`, html).length) {
            let data = getProperty(item, "flags.monks-enhanced-journal");

            let sell = $(`li[data-id="${id}"] input[name="flags.monks-enhanced-journal.sell"]`, html).val();
            let price = MEJHelpers.getPrice(sell);

            data.sell = price.value;
            data.currency = price.currency;
            data.total = data.quantity * data.sell;

            setProperty(item, "flags.monks-enhanced-journal", data);

            $(`li[data-id="${id}"] input[name="sell"]`, html).val(data.sell + ' ' + price.currency);

            $(`li[data-id="${id}"] .item-price span`, content).html(data.sell + ' ' + price.currency);
            $(`li[data-id="${id}"] .item-total span`, content).html(data.total + ' ' + price.currency);
        }

        message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { items: items } } });
    }

    static async openRequestItem(type, event) {
        let options = { editable: type != 'item' };
        let document;
        if (type == 'actor') {
            document = game.actors.get(this.flags['monks-enhanced-journal'].actor.id);
        } else if (type == 'shop') {
            document = await fromUuid(this.flags['monks-enhanced-journal'].shop.uuid);

            if (MonksEnhancedJournal.openJournalEntry(document))
                return;

            // if it's a journal entry, then check to see if it's an MEJ sheet, then switch to the page
            if (document instanceof JournalEntry && document.pages.size == 1 && !!getProperty(this.object.pages.contents[0], "flags.monks-enhanced-journal.type")) {
                document = this.object.pages.contents[0];
            }

            if (document instanceof JournalEntryPage) {
                // Fix the page, and confirm that it's an MEJ type, otherwise switch to the parent, with the page as a link
                MonksEnhancedJournal.fixType(document);
                let type = getProperty(document, "flags.monks-enhanced-journal.type");
                if (type == "base" || type == "oldentry") type = "journalentry";
                let types = MonksEnhancedJournal.getDocumentTypes();
                if (!types[type]) {
                    options.pageId = document.id;
                    document = document.parent;
                }
            }
        } else if (type == 'item') {
            let li = $(event.currentTarget).closest('li')[0];
            if (li.dataset.uuid)
                document = await fromUuid(li.dataset.uuid);
            else {
                let items = this.getFlag('monks-enhanced-journal', 'items') || [];
                let itemData = items.find(i => i._id == li.dataset.id);
                document= new CONFIG.Item.documentClass(itemData);
            }
        }

        if (document)
            document.sheet.render(true, options);
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
            let entry = await fromUuid(data.uuid);
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
            .append(getFolders(game.journal.directory.folders.filter(f => f.folder == null)))
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
            $(`[name="monks-enhanced-journal.loot-entity"]`, html).val(id).change();

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
                return (entity.documentClass.documentName == "JournalEntry" ? "Creating new Journal Entry within " + entity.name + " folder" : "Creating Actor within " + entity.name + " folder");
            else if (id == undefined) {
                let lootsheet = setting('loot-sheet');
                let isLootActor = ['lootsheetnpc5e', 'merchantsheetnpc', 'item-piles'].includes(lootsheet);
                return `Creating ${isLootActor ? "Actor" : "Journal Entry"} in the root folder`;
            } else
                return "Unknown";
        }

        function getEntries(folderID, contents) {
            let result = [$('<li>').addClass('journal-item create-item').attr('data-uuid', folderID).html($('<div>').addClass('journal-title').toggleClass('selected', uuid == undefined).html("-- create entry here --")).click(selectItem.bind())];
            return result.concat((contents || [])
                .filter(c => {
                    return c instanceof JournalEntry && c.pages.size == 1 && getProperty(c.pages.contents[0], "flags.monks-enhanced-journal.type") == "loot"
                })
                .sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; })
                .map(e => {
                    return $('<li>').addClass('journal-item flexrow').toggleClass('selected', uuid == e.pages.contents[0].uuid).attr('data-uuid', e.pages.contents[0].uuid).html($('<div>').addClass('journal-title').html(e.name)).click(selectItem.bind())
                }));
        }

        function createFolder(folder, icon = "fa-folder-open") {
            return $('<li>').addClass('journal-item folder flexcol collapse').append($('<div>').addClass('journal-title').append($("<i>").addClass(`fas ${icon}`)).append(folder.name)).append(
                $('<ul>')
                    .addClass('subfolder')
                    .append(getFolders(folder?.children?.map(c => c.folder)))
                    .append(getEntries(folder.uuid, folder.documents || folder.contents)))
               .click(function (event) { event.preventDefault(); event.stopPropagation(); $(this).toggleClass('collapse'); });
        }

        function getFolders(folders) {
            return (folders || []).sort((a, b) => { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; }).map(f => {
                return createFolder(f);
            });
        }

        let list = $('<ul>')
            .addClass('journal-list')
            .append(getFolders(collection.directory.folders.filter(f => f.folder == null)))
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
            let types = MonksEnhancedJournal.getDocumentTypes();

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
            type = type || object.type;
            if (types[type])
                object.type = type;
            else
                object.unsetFlag("monks-enhanced-journal", "type");

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
                return [
                    { id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
                    { id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
                    { id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
                ];
            case "cyphersystem":
                return [
                    { id: 'am', name: i18n('CYPHERSYSTEM.Adamantine'), convert: 1000 },
                    { id: 'mt', name: i18n('CYPHERSYSTEM.Mithral'), convert: 100 },
                    { id: 'pt', name: i18n('CYPHERSYSTEM.Platinum'), convert: 10 },
                    { id: 'gp', name: i18n('CYPHERSYSTEM.Gold'), convert: 0 },
                    { id: 'sp', name: i18n('CYPHERSYSTEM.Silver'), convert: 0.1 },
                    { id: 'cp', name: i18n('CYPHERSYSTEM.Copper'), convert: 0.01 }
                ];
            case "TheWitcherTRPG":
                return [
                    { id: 'bizant', name: i18n('WITCHER.Currency.bizant'), convert: 4 },
                    { id: 'ducat', name: i18n('WITCHER.Currency.ducat'), convert: 0.333333333 },
                    { id: 'lintar', name: i18n('WITCHER.Currency.lintar'), convert: 2 },
                    { id: 'floren', name: i18n('WITCHER.Currency.floren'), convert: 3 },
                    { id: 'crown', name: i18n('WITCHER.Currency.crown'), convert: 0 },
                    { id: 'oren', name: i18n('WITCHER.Currency.oren'), convert: 6 },
                    { id: 'falsecoin', name: i18n('WITCHER.Currency.falsecoin'), convert: 0.01 }
                ];
            case "wfrp4e":
                return [
                    { id: 'gc', name: "Gold Crown", convert: 0 },
                    { id: 'ss', name: "Silver Shilling", convert: 20 },
                    { id: 'bp', name: "Brass Penny", convert: 240 }
                ];
            case "archmage":
                return [
                    { id: 'platinum', name: "Gold Crown", convert: 10 },
                    { id: 'gold', name: "Silver Shilling", convert: 0 },
                    { id: 'silver', name: "Brass Penny", convert: 0.1 },
                    { id: 'copper', name: "Brass Penny", convert: 0.01 }
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
                return [
                    { id: "gold", name: i18n("MonksEnhancedJournal.currency.merchants"), convert: 0 },
                    { id: "silver", name: i18n("MonksEnhancedJournal.currency.tavs"), convert: 0.1 },
                    { id: "copper", name: i18n("MonksEnhancedJournal.currency.hammer"), convert: 0.01 }
                ];
            case "dnd5e":
            case "dnd4e":
            case "dnd3e":
            case "a5e":
                return [
                    { id: "pp", name: i18n("MonksEnhancedJournal.currency.platinum"), convert: 10 },
                    { id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
                    { id: "ep", name: i18n("MonksEnhancedJournal.currency.electrum"), convert: null },
                    { id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
                    { id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
                ];
            case "pf2e":
            case "pf1e":
            case "pf1":
                return [
                    { id: "pp", name: i18n("MonksEnhancedJournal.currency.platinum"), convert: 10 },
                    { id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
                    { id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
                    { id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
                ];
            case "age-system":
                return [
                    { id: "gp", name: i18n("MonksEnhancedJournal.currency.gold"), convert: 0 },
                    { id: "sp", name: i18n("MonksEnhancedJournal.currency.silver"), convert: 0.1 },
                    { id: "cp", name: i18n("MonksEnhancedJournal.currency.copper"), convert: 0.01 }
                ];
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

    $('[name="monks-enhanced-journal.loot-entity"]', html).on('change', async () => {
        let entity = $('[name="monks-enhanced-journal.loot-entity"]', html).val();

        $('[name="monks-enhanced-journal.loot-name"]', html).closest('.form-group').toggle(entity.startsWith("Folder") || !entity);
    }).change();

    $('[name="monks-enhanced-journal.loot-name"]', html).val(i18n($('[name="monks-enhanced-journal.loot-name"]', html).val()));
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
            if (type == "base" || type == "oldentry") type = "journalentry";

            let types = MonksEnhancedJournal.getDocumentTypes();
            if (types[type]) {
                let flags = getProperty("flags.monks-enhanced-journal") || {};
                flags.type = type;

                MonksEnhancedJournal.fixType(entry);
                const cls = (entry._getSheetClass ? entry._getSheetClass() : null);
                if (cls && cls.defaultObject)
                    flags = mergeObject(flags, cls.defaultObject);

                entry._source.flags['monks-enhanced-journal'] = flags;
            }
        }
    }
});

Hooks.on("createJournalEntryPage", (entry, data, options, userId) => {
    let type = getProperty(entry, "flags.monks-enhanced-journal.type");
    if (type) {
        if (type == "base" || type == "oldentry") type = "journalentry";
        let types = MonksEnhancedJournal.getDocumentTypes();
        if (types[type]) {
            let docIcon = "fa-book";
            if (entry.parent.pages.size == 1) {
                docIcon = MonksEnhancedJournal.getIcon(type);
            }
            $(`.document.journalentry[data-document-id="${entry.parent.id}"] .document-name .journal-type`).attr('class', 'journal-type fas fa-fw ' + docIcon);
        }
    }
});

Hooks.on("updateJournalEntryPage", (document, data, options, userId) => {
    let type = getProperty(document, 'flags.monks-enhanced-journal.type');
    if (type == 'quest')
        MonksEnhancedJournal.refreshObjectives(true);

    if (data.name && type && document.parent.pages.size == 1) {
        document.parent.update({name: data.name});
    }

    if (getProperty(data, "flags.monks-enhanced-journal.status") != undefined) {
        $(`.journalentry[data-document-id="${document.parent.id}"]`).attr("status", getProperty(data, "flags.monks-enhanced-journal.status"));
    }

    let flags = getProperty(data, "flags.monks-enhanced-journal") || {};
    let renderUpdateKeys = ["actor", "actors", "relationships", "currency", "items", "type", "attributes", "slides", "dcs", "traps", "objectives", "folders", "reward", "rewards", "sound", "offerings"];

    let renderUpdate = renderUpdateKeys.some(d => {
        return flags[d] != undefined;
    })

    if (MonksEnhancedJournal.journal) {
        if (data.name) {
            MonksEnhancedJournal.journal.updateTabNames(document.uuid, document.name);
        }

        if (MonksEnhancedJournal.journal.tabs.active().entityId?.endsWith(data._id) &&
            (data.text?.content != undefined ||
                data.ownership != undefined ||
                renderUpdate ||
                getProperty(data, "flags.core.sheetClass") != undefined))
        {
            MonksEnhancedJournal.journal.render(true, { reload: true });
        }
    } else {
        if (data.content != undefined ||
            data.ownership != undefined ||
            renderUpdate ||
            getProperty(data, "flags.core.sheetClass") != undefined)
        {
            if (document._sheet)
                document._sheet.render(true, { reload: true });
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
    if (MonksEnhancedJournal._dragItem && data.itemId == MonksEnhancedJournal._dragItem) {
        MonksEnhancedJournal._dragItem = null;

        let page = fromUuidSync(data.uuid);
        if (page) {
            MonksEnhancedJournal.fixType(page);
            const cls = (page._getSheetClass ? page._getSheetClass() : null);
            if (cls && cls.itemDropped) {
                cls.itemDropped.call(cls, data.itemId, actor, page).then((result) => {
                    if ((result?.quantity ?? 0) > 0) {
                        let itemQty = Number(getValue(data.data, quantityname()));
                        if (isNaN(itemQty)) itemQty = 1;
                        setValue(data.data, quantityname(), result.quantity * itemQty);
                        setPrice(data.data, pricename(), result.price);
                        data.uuid = `${data.uuid}${data.rewardId ? `.Rewards.${data.rewardId}` : ""}.Items.${data.itemId}`;
                        sheet._onDropItem({ preventDefault: () => { } }, data);
                    }
                });
            }
        }

        return false;
    }
});

Hooks.on('dropJournalSheetData', (journal, sheet, data) => {
    //check to see if an item was dropped from another Journal Sheet
    if (MonksEnhancedJournal._dragItem && data.itemId == MonksEnhancedJournal._dragItem) {
        MonksEnhancedJournal._dragItem = null;

        let page = fromUuidSync(data.uuid);
        if (page) {
            MonksEnhancedJournal.fixType(page);
            const cls = (page._getSheetClass ? page._getSheetClass() : null);
            if (cls && cls.itemDropped) {
                cls.itemDropped.call(cls, data.itemId, journal, page).then((result) => {
                    if (!!result) {
                        let itemQty = getValue(data.data, quantityname());
                        setValue(data.data, quantityname(), result.quantity * itemQty);
                        data.uuid = `${data.uuid}.Items.${data.itemId}`;
                        sheet._onDropItem({ preventDefault: () => { } }, data);
                    }
                });
            }
        }
        return false;
    }
});

Hooks.on('dropCanvasData', async (canvas, data) => {
    //check to see if an item was dropped from either the encounter or quest and record what actor it was
    if (MonksEnhancedJournal.journal) {
        if (data.type == 'JournalTab' && data.uuid) {
            let document = await fromUuid(data.uuid);
            if (document) {
                MonksEnhancedJournal.fixType(document);
                document.sheet.render(true);
            }
        } /*else if (data.type == 'CreateEncounter' || data.type == 'CreateCombat') {
            if (!game.user.can("TOKEN_CREATE")) {
                return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.YouDoNotHavePermissionCreateToken"));
            }

            let encounter = await fromUuid(data.uuid);
            if (encounter) {
                MonksEnhancedJournal.fixType(encounter);
                const cls = (encounter._getSheetClass ? encounter._getSheetClass() : null);
                if (cls && cls.createEncounter) {
                    const templateData = {
                        t: "circle",
                        user: game.user.id,
                        direction: 0,
                        x: data.x,
                        y: data.y,
                        fillColor: game.user.color,
                        flags: { "monks-enhanced-journal": { encounter: data.uuid } }
                    };

                    const template = new MeasuredTemplateDocument(templateData, { parent: canvas.scene });
                    const object = new MeasuredTemplate(template);
                    //object.drawPreview();

                    //cls.createEncounter.call(encounter, data.x, data.y, data.type == 'CreateCombat');
                }
            }
        }*/
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

        $('input[name="flags.monks-enhanced-journal.quantity"]', html).change(MonksEnhancedJournal.updateSale.bind(message));
        $('input[name="flags.monks-enhanced-journal.sell"]', html).change(MonksEnhancedJournal.updateSale.bind(message));

        let items = message.getFlag('monks-enhanced-journal', 'items') || [];
        for (let item of items) {
            $(`li[data-id="${item._id}"] input[name="flags.monks-enhanced-journal.quantity"]`, html).val(getProperty(item, "flags.monks-enhanced-journal.quantity"));
            $(`li[data-id="${item._id}"] input[name="flags.monks-enhanced-journal.sell"]`, html).val(getProperty(item, "flags.monks-enhanced-journal.sell") + " " + getProperty(item, "flags.monks-enhanced-journal.currency"));
        }

        $('.chat-actor-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'actor')).attr('onerror', "$(this).attr('src', 'icons/svg/mystery-man.svg');");
        $('.chat-shop-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'shop')).attr('onerror', "$(this).attr('src', 'modules/monks-enhanced-journal/assets/shop.png');");
        $('.item-list .item-name .item-image', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'item'));
        $('.items-list .item-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'item'));

        /*
        if (game.modules.get("chat-portrait")?.active) {
            window.setTimeout(() => {
                $('.items-list .items-header h3.item-name img', html).insertBefore($('.message-content .request-item > div > div > h4', html));
            }, 100);
        }
        */
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

        let select = $("<select>").attr("name", "flags.monks-enhanced-journal.pagetype")
            .append($('<optgroup>').attr("label", "Adventure Book").append(original.map((t) => { return $('<option>').attr('value', t.id).prop("selected", t.id == "text").html(t.name) })))
            .append($('<optgroup>').attr("label", "Single Sheet").append(types.map((t) => { return $('<option>').attr('value', t.id).html(t.name) })));

        if (game.modules.get("storyteller")?.active) {
            select.append($('<optgroup>').attr("label", "Storyteller").append(Object.entries(game.StoryTeller.constructor.types).filter(([k, v]) => k != "base").map(([k, v]) => { return $('<option>').attr('value', k).html(v.name); })));
            $('select[name="type"]', html).parent().parent().remove();
        }

        $('<div>')
            .addClass("form-group")
            .append($('<label>').html(i18n("Type")))
            .append($('<div>')
                .addClass("form-fields")
                .append(select))
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

Hooks.on("renderJournalSheet", (sheet, html, data) => {
    if (sheet._pages) {
        const levels = Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS);
        for (let page of sheet._pages) {
            if (page?.numberIcon) {
                $(`.pages-list li[data-page-id="${page._id}"] .page-number`, html).html(`<i class="fas ${page.numberIcon}"></i>`);
            }

            if ((setting('show-permissions') == 'true' || (setting('show-permissions') == 'mej' && sheet.enhancedjournal)) &&
                game.user.isGM &&
                (page.ownership.default >= 0 || Object.keys(page.ownership).length > 1)) {

                let permissions = $(`.pages-list li[data-page-id="${page._id}"] .page-heading .page-ownership`, html);
                if (!permissions.length)
                    permissions = $("<span>").addClass("page-ownership").appendTo($(`.pages-list li[data-page-id="${page._id}"] .page-heading`, html));
                permissions.empty();

                if (page.ownership.default >= 0 && page.ownership.default != sheet.object.ownership.default) {
                    const [ownership] = levels.find(([, level]) => level === page.ownership.default);
                    permissions.append($('<i>').addClass(page.ownership.default == 0 ? 'fas fa-users-slash' : 'fas fa-users').attr('title', `${i18n("MonksEnhancedJournal.Everyone")}: ${i18n(`OWNERSHIP.${ownership}`)}`));
                }
                for (let [key, value] of Object.entries(page.ownership)) {
                    let user = game.users.find(u => {
                        return u.id == key && !u.isGM;
                    });
                    if (user != undefined && value > 0 && value != page.ownership.default) {
                        const [ownership] = levels.find(([, level]) => level === value);
                        permissions.append($('<div>').css({ backgroundColor: user.color }).html(user.name[0]).attr('title', user.name + ': ' + i18n(`OWNERSHIP.${ownership}`)));
                    }
                }
            }
        }
    }
});

Hooks.on("renderJournalPageSheet", (sheet, html, data) => {
    //$("a.inline-request-roll", html).click(MonksEnhancedJournal._onClickInlineRequestRoll.bind(sheet));
    $("a.picture-link", html).click(MonksEnhancedJournal._onClickPictureLink.bind(sheet));

    if ($('select[name="title.level"] option[value="-1"]').length == 0) {
        let opt = $("<option>").attr("value", -1).html("Appendix");
        $('select[name="title.level"]').append(opt);
    }
    if (getProperty(data, "flags.monks-enhanced-journal.appendix"))
        $('select[name="title.level"]').val(-1);
    if (data.isCharacter == undefined && (data.data.type == "video" || data.data.type == "image")) {
        if (!sheet.isEditable) {
            let div = $('<div>').addClass("no-file-notification").toggle(data.data.src == undefined).html(`<i class="fas ${data.data.type == "video" ? 'fa-video-slash' : 'fa-image-slash'}"></i> No ${data.data.type}`).insertAfter(html[0]);
            if (data.data.type == "image" && data.data.src == undefined) $('img', html).hide();
            $('img, video', html).on("error", () => {
                div.show();
                $('img, video', html).parent().hide();
            });
        }
    }
});

Hooks.on("renderCompendium", async (app, html, data) => {
    if (app.collection.documentName == "JournalEntry") {
        await app.collection.getIndex({ fields: ["img", "flags.monks-enhanced-journal"] });
        for (let index of app.collection.index) {
            let img = $(`li[data-document-id="${index._id}"] > img.thumbnail`, html);
            if (img.length) {
                img.attr("src", index.img || getProperty(index, "flags.monks-enhanced-journal.img") || "icons/svg/book.svg")
            } else {
                $(`li[data-document-id="${index._id}"]`, html).prepend($("<img>").addClass("thumbnail").attr("title", index.name).attr("alt", index.name).attr("src", index.img || getProperty(index, "flags.monks-enhanced-journal.img") || "icons/svg/book.svg"));
            }
        }
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

            let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
            for (let entity of entities) {
                if (entity instanceof JournalEntry)
                    entity = entity.pages.contents[0];
                await entity.setFlag("monks-enhanced-journal", "status", action.data.status);
            }
        },
        content: async (trigger, action) => {
            let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
            return `<span class="action-style">${i18n(trigger.name)}</span> of <span class="entity-style">${entityName}</span> to <span class="details-style">"${i18n(trigger.values.status[action.data?.status])}"</span>`;
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

            dests = dests.map(d => {
                if (d instanceof TileDocument) {
                    return { x: d.x, y: d.y, distance: Math.min(d.width, d.height), t: 'rect' };
                } else {
                    return { x: d.x, y: d.y, distance: 20, center: true };
                }
            });

            let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
            for (let entity of entities) {
                if (entity instanceof JournalEntry && entity.pages.size == 1) {
                    entity = entity.pages.contents[0];
                }
                MonksEnhancedJournal.fixType(entity);
                const cls = (entity._getSheetClass ? entity._getSheetClass() : null);
                if (cls && cls.createEncounter) {
                    cls.createEncounter.call(entity, dests, { combat: action.data.startcombat });
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

            let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
            for (let entity of entities) {
                if (entity instanceof JournalEntry && entity.pages.size == 1) {
                    entity = entity.pages.contents[0];
                }
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
    app.registerTileAction('monks-enhanced-journal', 'append', {
        name: "Write to Journal",
        requiresGM: true,
        visible: false,
        ctrls: [
            {
                id: "entity",
                name: "MonksEnhancedJournal.SelectEntity",
                type: "select",
                subtype: "entity",
                options: { showPrevious: true, showPlayers: true },
                restrict: (entity) => { return (entity instanceof JournalEntry); },
                required: true,
                defaultType: 'journal',
                placeholder: 'Please select a Journal',
                onChange: async (app, ctrl, action, data) => {
                    $('select[name="data.page"]', app.element).empty();
                    let value = $(ctrl).val();
                    if (!!value) {
                        try {
                            let entityVal = JSON.parse(value);

                            let pageCtrl = action.ctrls.find(c => c.id == "page");
                            let list = await pageCtrl.list(app, action, { entity: entityVal });
                            $('select[name="data.page"]', app.element).append(app.fillList(list, data.page));
                        } catch { }
                    }
                }
            },
            {
                id: "page",
                name: "Page",
                placeholder: 'Please select a Journal Page',
                list: async (app, action, data) => {
                    let value = data.entity?.id;
                    if (!!value) {
                        try {
                            // make sure it's not an enhanced journal, those shouldn't reveal their pages
                            if (/^JournalEntry.[a-zA-Z0-9]{16}$/.test(value)) {
                                let entity = await fromUuid(value);

                                if (entity && !(entity.pages.size == 1 && !!getProperty(entity.pages.contents[0], "flags.monks-enhanced-journal.type"))) {
                                    let list = { "": "" };
                                    for (let p of entity.pages)
                                        list[p._id] = p.name;

                                    return list;
                                }
                            }
                        } catch { }
                    }
                },
                type: "list",
                required: false
            },
            {
                id: "create",
                name: "Create page if not found",
                type: "checkbox",
                defvalue: false,
                onClick: (app) => {
                    app.checkConditional();
                }
            },
            {
                id: "createname",
                name: "New Page name",
                type: "text",
                required: false,
                conditional: (app) => {
                    return $('input[name="data.create"]', app.element).prop('checked');
                }
            },
            {
                id: "text",
                name: "Text",
                type: "text",
                subtype: "multiline",
                required: true
            },
            {
                id: "append",
                name: "Write",
                list: "append-type",
                type: "list",
                required: true,
                defvalue: "append"
            }
        ],
        values: {
            'append-type': {
                'append': "Append",
                'prepend': "Prepend",
                'overwrite': "Overwrite",
            }
        },
        group: 'monks-enhanced-journal',
        fn: async (args = {}) => {
            const { tile, tokens, action, userid, value, method, change } = args;

            let entities = await game.MonksActiveTiles.getEntities(args, 'journal');
            for (let entity of entities) {
                if (entity instanceof JournalEntry && entity.pages.size > 0) {
                    let context = {
                        actor: tokens[0]?.actor?.toObject(false),
                        token: tokens[0]?.toObject(false),
                        tile: tile.toObject(false),
                        entity: entity,
                        user: game.users.get(userid),
                        value: value,
                        scene: canvas.scene,
                        method: method,
                        change: change,
                        timestamp: new Date().toLocaleString()
                    };

                    let page = (action.data.page ? entity.pages.get(action.data.page) : null);
                    if (!page) {
                        if (action.data.create) {
                            let name = action.data.createname || "";
                            if (name.includes("{{")) {
                                const compiled = Handlebars.compile(name);
                                name = compiled(context, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }).trim();
                            }
                            page = await JournalEntryPage.create({ type: "text", name: name }, { parent: entity });
                        } else if (entity.pages.contents.length)
                            page = entity.pages.contents[0];
                    }

                    if (!page)
                        continue;

                    let text = action.data.text;
                    if (text.includes("{{")) {
                        const compiled = Handlebars.compile(text);
                        text = compiled(context, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }).trim();
                    }

                    let content = page.text.content || "";
                    if (action.data.append == "append")
                        content = content + text;
                    else if (action.data.append == "prepend")
                        content = text + content;
                    else if (action.data.append == "overwrite")
                        content = text;

                    await page.update({ text: { content: content } });
                }
            }
        },
        content: async (trigger, action) => {
            let entityName = await game.MonksActiveTiles.entityName(action.data?.entity, "journal");
            return `<span class="action-style">${i18n(trigger.name)}</span>, <span class="entity-style">${entityName}</span>`;
        }
    });
});