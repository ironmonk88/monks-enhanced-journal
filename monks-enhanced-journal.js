import { registerSettings } from "./settings.js";
import { EnhancedJournal } from "./apps/enhanced-journal.js"
import { SlideshowWindow } from "./apps/slideshow-window.js"
import { EnhancedJournalSheet } from "./sheets/EnhancedJournalSheet.js"
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

    static getEntityTypes() {
        return {
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
            shop: "MonksEnhancedJournal.shop"
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

        let types = MonksEnhancedJournal.getEntityTypes();
        let labels = MonksEnhancedJournal.getTypeLabels();

        for (let [k, v] of Object.entries(labels)) {
            //if (k != 'base') {
            Journal.registerSheet?.("monks-enhanced-journal", types[k] || JournalEntrySheet, {
                types: [k],
                makeDefault: true,
                label: i18n(v)
            });
            //}
        }
        CONFIG.JournalEntry.sheetClasses.base.JournalEntry.default = false;

        game.system.entityTypes.JournalEntry = game.system.entityTypes.JournalEntry.concat(Object.keys(types)).sort();
        CONFIG.JournalEntry.typeLabels = mergeObject((CONFIG.JournalEntry.typeLabels || {}), labels);

        CONFIG.TinyMCE.content_css.push('modules/monks-enhanced-journal/css/editor.css');
        if (game.modules.get("polyglot")?.active)
            CONFIG.TinyMCE.content_css.push('modules/polyglot/css/polyglot.css');

        CONFIG.TinyMCE.style_formats.push({
            title: 'Enhanced Journal', items: [
                { block: "section", classes: "readaloud", title: "Read Aloud", wrapper: true },
                { inline: "span", classes: "drop-cap", title: "Drop Cap" }]
        });

        /*
        CONFIG.JournalEntry.noteIcons = mergeObject(CONFIG.JournalEntry.noteIcons, {
            "One": "modules/monks-enhanced-journal/assets/tile_1.png"
        });*/

        /*
        let noteOptions = NoteConfig.defaultOptions;
        Object.defineProperty(NoteConfig, 'defaultOptions', {
            get: function () {
                noteOptions.template = "modules/monks-enhanced-journal/templates/note-config.html";
                return noteOptions;
            }
        });

        let oldGetData = NoteConfig.prototype.getData;
        NoteConfig.prototype.getData = function (options) {
            let data = oldGetData.call(this, options);

            function getFolders(folders) {
                return folders.sort((a, b) => { return a.data.sort < b.data.sort ? -1 : a.data.sort > b.data.sort ? 1 : 0; }).map(f => {
                    let entries = f.content.map(e => { return { key: e.id, name: e.name } });
                    let folders = getFolders(f.children);
                    return { text: f.name, folders: folders, entries: entries };
                });
            }

            let folders = getFolders(game.journal.directory.folders.filter(f => f.parentFolder == null));
            let entries = game.journal.contents.filter(j => j.folder == null).map(j => { return { key: j.id, name: j.name } });

            data.entries = { folders: folders, entries: entries };

            return data;
        }*/

        let clickEntityName = function (wrapped, ...args) {
            let event = args[0];
            event.preventDefault();
            const element = event.currentTarget;
            const entityId = element.parentElement.dataset.entityId;
            const entry = this.constructor.collection.get(entityId);

            if (entry.data?.flags['monks-enhanced-journal']?.type)
                entry.data.type = entry.data?.flags['monks-enhanced-journal']?.type;

            if (!(game.user.isGM || setting('allow-player')) || !MonksEnhancedJournal.openJournalEntry(entry))
                wrapped(...args);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-enhanced-journal", "JournalDirectory.prototype._onClickEntityName", clickEntityName, "MIXED");
        } else {
            const oldClickEntityName = JournalDirectory.prototype._onClickEntityName;
            JournalDirectory.prototype._onClickEntityName = function () {
                return clickEntityName.call(this, oldClickEntityName.bind(this), ...arguments);
            }
        }

        if (game.modules.get("lib-wrapper")?.active)
            libWrapper.ignore_conflicts("monks-enhanced-journal", "monks-active-tiles", "JournalDirectory.prototype._onClickEntityName");

        let oldRenderPopout = JournalDirectory.prototype.renderPopout;
        JournalDirectory.prototype.renderPopout = function () {
            if (game.user.isGM || setting('allow-player')) {
                MonksEnhancedJournal.openJournalEntry();
                //let entry = new JournalEntry({ name: 'temporary' }); //new JournalEntryData({name:'temporary'})
                //new EnhancedJournalSheet(entry)._render(true);
            } else {
                return oldRenderPopout.call(this);
            }
        }

        Journal.prototype.constructor._showEntry = async function(entryId, mode = null, force = true, showid) {
            let entry = await fromUuid(entryId);
            if (entry.documentName !== "JournalEntry") return;
            if (!force && !entry.visible) return;
            if (!entry.data.img && !entry.data.content) return; // Don't show an entry that has no content

            // Show the sheet with the appropriate mode
            if (!(game.user.isGM || setting('allow-player')) || !MonksEnhancedJournal.openJournalEntry(entry)) {
                if (entry.data.flags['monks-enhanced-journal']?.type)
                    entry.data.type = entry.data.flags['monks-enhanced-journal']?.type;
                if (entry.data.type == 'journalentry')
                    entry.data.type = 'base';
                return entry.sheet.render(true, { sheetMode: mode });
            }
        }

        let clickNote = function (wrapped, ...args) {
            if (this.entry) {
                if (!MonksEnhancedJournal.openJournalEntry(this.entry)) {
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
        TextEditor.prototype.constructor.enrichHTML = function (content, options) {
            let data = oldEnrichHTML.call(this, content, options);

            const html = document.createElement("div");
            html.innerHTML = String(data);

            let text = this._getTextNodes(html);
            //const rgx = /%\[(\/[a-zA-Z]+\s)?(.*?)([0-9]{1,3})(\]%)?/gi;
            const rgx = /%(Request)\[([^\]]+)\](?:{([^}]+)})?/gi;
            this._replaceTextContent(text, rgx, MonksEnhancedJournal._createRequestRoll);

            return html.innerHTML;
        }

        let oldClickContentLink = TextEditor.prototype.constructor._onClickContentLink;
        TextEditor.prototype.constructor._onClickContentLink = async function (event) {
            event.preventDefault();
            const a = event.currentTarget;
            let document = null;
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
                document = id ? await pack.getDocument(id) : null;
            }

            // Target 2 - World Entity Link
            else {
                const collection = game.collections.get(a.dataset.entity);
                if (!collection)
                    return;
                document = collection.get(id);
                if ((document.documentName === "Scene") && document.journal) document = document.journal;
                if (!document.testUserPermission(game.user, "LIMITED")) {
                    return ui.notifications.warn(`You do not have permission to view this ${document.documentName} sheet.`);
                }
            }
            if (!document) return;

            // Action 1 - Execute an Action
            if (document.documentName === "Macro") {
                if (!document.testUserPermission(game.user, "LIMITED")) {
                    return ui.notifications.warn(`You do not have permission to use this ${document.documentName}.`);
                }
                return document.execute();
            }

            // Action 2 - Render the Entity sheet
            if (document.documentName == 'Actor' || document.documentName == 'JournalEntry') {
                if (!MonksEnhancedJournal.openJournalEntry(document, { newtab: event.ctrlKey })) {
                    return document.sheet.render(true);
                }
            }
            else {
                if (document.documentName === "Scene")
                    game.scenes.get(id).view();
                else
                    return document.sheet.render(true);
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

        //let oldOnCreate = JournalEntry.prototype._onCreate;
        JournalEntry.prototype._onCreate = async function (data, options, userid) {
            if (MonksEnhancedJournal.compendium !== true)
                MonksEnhancedJournal.openJournalEntry(this, options);
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

        EntitySheetConfig.prototype._updateObject = async function (event, formData) {
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
                foundry.utils.mergeObject(setting, { [`${this.object.documentName}.${this.object.data.type}`]: formData.defaultClass });
                await game.settings.set("core", "sheetClasses", setting);
            }

            // Update the Entity-specific override
            if (formData.sheetClass !== original.sheetClass) {
                await this.object.setFlag("core", "sheetClass", formData.sheetClass);
            }

            // Re-draw the updated sheet
            if (!fromEnhancedJournal)
                this.object.sheet.render(true);
        }

        Handlebars.registerHelper({ selectGroups: MonksEnhancedJournal.selectGroups });
    }

    static openJournalEntry(entry, options = {}) {
        if (this.object?.folder?.name == '_fql_quests' && game.modules.get("forien-quest-log")?.active)
            return false;

        if (options.render == false || options.activate == false)
            return false;

        //if the enhanced journal is already open, then just pass it the new object, if not then let it render as normal
        if (MonksEnhancedJournal.journal) {
            if (entry) MonksEnhancedJournal.journal.open(entry, options.newtab);
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

    static async ready() {
        game.socket.on(MonksEnhancedJournal.SOCKET, MonksEnhancedJournal.onMessage);

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
            default:
                return 'fa-book-open';
        }
    }

    static onMessage(data) {
        MonksEnhancedJournal[data.action].call(MonksEnhancedJournal, data);
    }

    static saveUserData(data) {
        if (game.user.isGM) {
            let entity = game.journal.get(data.entityId);
            let update = {};
            update["flags.monks-enhanced-journal." + data.userId] = data.userdata;

            entity.update(update);
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
                            $('.slide-showing text[id="' + text.id + '"]', MonksEnhancedJournal.slideshow.element).animate({ opacity: 1 }, 500, 'linear');
                        }, text.fadein * 1000);
                    }
                    if (!isNaN(text.fadeout)) {
                        window.setTimeout(function () {
                            $('.slide-showing text[id="' + text.id + '"]', MonksEnhancedJournal.slideshow.element).animate({ opacity: 0 }, 500, 'linear');
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
        $('.entity.journal', html).each(function () {
            let id = this.dataset.entityId;
            let entry = game.journal.get(id);
            let type = entry.getFlag('monks-enhanced-journal', 'type');// || (entry.data.img != "" && entry.data.content == "" ? 'picture' : 'journalentry'); //we'll add the picture later
            let icon = MonksEnhancedJournal.getIcon(type);

            $('.entity-name', this).prepend($('<i>').addClass('fas fa-fw ' + icon));

            if (type == 'quest')
                $(this).attr('status', entry.getFlag('monks-enhanced-journal', 'status'));

            if (setting('show-permissions') && game.user.isGM && (entry.data.permission.default > 0 || Object.keys(entry.data.permission).length > 1)) {
                let permissions = $('<div>').addClass('permissions');
                if (entry.data.permission.default > 0)
                    permissions.append($('<i>').addClass('fas fa-users').attr('title', 'Everyone'));
                else {
                    for (let [key, value] of Object.entries(entry.data.permission)) {
                        let user = game.users.find(u => {
                            return u.id == key && !u.isGM;
                        });
                        if (user != undefined && value > 0)
                            permissions.append($('<div>').css({ backgroundColor: user.data.color }).html(user.name[0]).attr('title', user.name));
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
        let entity = await fromUuid(data.uuid); 
        let items = entity.getFlag('monks-enhanced-journal', 'items');
        if (items) {
            let item = items.find(i => i.id == data.itemid);
            if (item) {
                item.qty -= data.qty;
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

    static async requestItem(accept) {
        let message = this;

        let content = $(message.data.content);
        $('.request-buttons', content).remove();
        $('.request-msg', content).html((accept ? '<i class="fas fa-check"></i> Item has been added to inventory' : '<i class="fas fa-times"></i> Request has been rejected'));

        if (accept) {
            //find the actor
            let msgactor = message.getFlag('monks-enhanced-journal', 'actor');
            let actor = game.actors.get(msgactor.id);
            //find the item
            let msgitem = message.getFlag('monks-enhanced-journal', 'items');
            let item = await fromUuid(msgitem[0].uuid);
            //Add it to the actor
            const additem = await Item.implementation.fromDropData({ type: 'Item', data: item.data });
            const itemData = additem.toObject();
            actor.createEmbeddedDocuments("Item", [itemData]);
            //deduct the gold

        }

        message.update({ content: content[0].outerHTML, flags: { 'monks-enhanced-journal': { accepted: accept } } });
    }

    static async openRequestItem(type, event) {
        let entity;
        if (type == 'actor') {
            entity = game.actors.get(this.data.flags['monks-enhanced-journal'].actor.id);
        } else if (type == 'shop') {
            entity = game.journal.get(this.data.flags['monks-enhanced-journal'].shop.id);
        } else if (type == 'item') {
            let li = $(event.currentTarget).closest('li')[0]
            entity = await fromUuid(li.dataset.uuid);
        }

        if (entity)
            entity.sheet.render(true);
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
    switch (data.type) {
        case 'encounter':
            flags = mergeObject(flags, EncounterSheet.defaultObject);
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
    }
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

        if (MonksEnhancedJournal.journal.tabs.active().entityId.endsWith(data._id) &&
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
    if (MonksEnhancedJournal.journal && data.id == MonksEnhancedJournal._dragItem) {
        if (MonksEnhancedJournal.journal.object.data.flags['monks-enhanced-journal']?.type == 'shop') {
            //start the purchase process
            MonksEnhancedJournal.journal.itemPurchased(data.id, actor);
        } else {
            MonksEnhancedJournal.journal.itemDropped(data.id, actor);
        }
        MonksEnhancedJournal._dragItem = null;
    }
});

Hooks.on('dropCanvasData', async (canvas, data) => {
    //check to see if an item was dropped from either the encounter or quest and record what actor it was
    if (MonksEnhancedJournal.journal) {
        if (data.type == 'JournalTab' && data.uuid) {
            let entity = await fromUuid(data.uuid);
            if (entity)
                entity.sheet.render(true);
        } else if (data.type == 'CreateEncounter') {
            if (!game.user.can("TOKEN_CREATE")) {
                return ui.notifications.warn(`You do not have permission to create new Tokens!`);
            }

            let encounter = game.journal.get(data.id);
            if (encounter) {
                const cls = getDocumentClass("Token");
                for (let ea of (encounter.data.flags['monks-enhanced-journal']?.actors || [])) {
                    let actor = await Actor.implementation.fromDropData(ea);
                    if (!actor.isOwner) {
                        return ui.notifications.warn(`You do not have permission to create a new Token for the ${actor.name} Actor.`);
                    }
                    if (actor.compendium) {
                        const actorData = game.actors.fromCompendium(actor);
                        actor = await Actor.implementation.create(actorData);
                    }

                    // Prepare the Token data
                    for (let i = 0; i < (ea.qty || 1); i++) {
                        let td = await actor.getTokenData({ x: data.x, y: data.y });
                        let newSpot = MonksEnhancedJournal.findVacantSpot({ x: data.x, y: data.y }, { width: td.width, height: td.height });
                        td.update(newSpot);

                        await cls.create(td, { parent: canvas.scene });
                    }
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

    function selectItem(event) {
        event.preventDefault();
        event.stopPropagation();
        $('[name="entryId"]', html).val(this.id);
        $('.journal-select > div > span').html(this.name);
        $('.journal-select').removeClass('open');
    }

    function getFolders(folders) {
        return folders.sort((a, b) => { return a.data.sort < b.data.sort ? -1 : a.data.sort > b.data.sort ? 1 : 0; }).map(f => {
            return $('<li>').addClass('journal-item folder flexcol collapse').append($('<div>').addClass('journal-title').html(f.name)).append(
                $('<ul>')
                    .addClass('subfolder')
                    .append(getFolders(f.children))
                    .append(f.content
                        .sort((a, b) => { return a.data.sort < b.data.sort ? -1 : a.data.sort > b.data.sort ? 1 : 0; })
                        .map(e => { return $('<li>').addClass('journal-item flexrow').toggleClass('selected', app.object.data.entryId == e.id).attr('id', e.id).html($('<div>').addClass('journal-title').html(e.name)).click(selectItem.bind(e)) })))
                .click(function (event) { event.preventDefault(); event.stopPropagation(); $(this).toggleClass('collapse'); });
        });
    }

    ctrl.hide();

    $('<div>')
        .addClass('journal-select')
        .attr('tabindex', '0')
        .append($('<div>').addClass('flexrow').css({ font: ctrl.css('font') }).append($('<span>').html(data.entry.name)).append($('<i>').addClass('fas fa-chevron-down')))
        .append($('<ul>')
            .addClass('journal-list')
            .append($('<li>').addClass('journal-item flexrow').toggleClass('selected', app.object.data.entryId == '').attr('id', '').html($('<div>').addClass('journal-title').html('')).click(selectItem.bind({id:'', name:''})))
            .append(getFolders(game.journal.directory.folders.filter(f => f.parentFolder == null)))
            .append(game.journal.contents
                .filter(j => j.folder == null)
                .sort((a, b) => { return a.data.sort < b.data.sort ? -1 : a.data.sort > b.data.sort ? 1 : 0; })
                .map(j => { return $('<li>').addClass('journal-item').attr('id', j.id).html($('<div>').addClass('journal-title').html(j.name)).click(selectItem.bind(j)); })))
        .focus(function () { $(this).addClass('open') })
        .blur(function () { $(this).removeClass('open') })
        .click(function () { $(this).addClass('open') })
        .insertAfter(ctrl);
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

        $('.request-accept', html).click(MonksEnhancedJournal.requestItem.bind(message, true));
        $('.request-reject', html).click(MonksEnhancedJournal.requestItem.bind(message, false));

        $('.actor-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'actor')).attr('onerror', "$(this).attr('src', 'icons/svg/mystery-man.svg');");
        $('.shop-icon', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'shop')).attr('onerror', "$(this).attr('src', 'modules/monks-enhanced-journal/assets/shop.png');");
        $('.item-list .item-name .item-image', html).click(MonksEnhancedJournal.openRequestItem.bind(message, 'item'));
    }
});