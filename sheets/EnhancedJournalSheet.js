import { setting, i18n, format, log, warn, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EditFields } from "../apps/editfields.js";
import { SelectPlayer } from "../apps/selectplayer.js";
import { EditSound } from "../apps/editsound.js";
import { MakeOffering } from "../apps/make-offering.js";
import { getValue, setValue, setPrice, MEJHelpers } from "../helpers.js";

class EnhancedJournalContextMenu extends ContextMenu {
    constructor(...args) {
        super(...args);
    }

    bind() {
        this.element.on(this.eventName, this.selector, event => {
            event.preventDefault();
            const parent = $(event.currentTarget);
            const menu = this.menu;

            // Remove existing context UI
            $('.context').removeClass("context");
            if ($.contains(parent[0], menu[0])) return this.close();

            // Render a new context menu
            event.stopPropagation();
            ui.context = this;
            this._event = event;
            return this.render(parent);
        });
    }

    _setPosition(html, target) {
        super._setPosition(html, target);

        let bounds = target[0].getBoundingClientRect();
        let x = this._event.clientX - bounds.left;
        let y = this._event.clientY - bounds.top + target.scrollTop();

        log("Set Position", x, y);

        html.css({ "left": `${Math.min(x, bounds.width - 370)}px`, "top": `${Math.min(y, bounds.height + target.scrollTop() - 75)}px` })
    }
}

export class EnhancedJournalSheet extends JournalPageSheet {
    constructor(object, options = {}) {
        super(object, options);

        if (this.options.tabs.length) {
            let lasttab = this.object.getFlag('monks-enhanced-journal', '_lasttab') || this.options.tabs[0].initial;
            this.options.tabs[0].initial = lasttab;
            this._tabs[0].active = lasttab;
        }

        this.object._itemList = this.object._itemList || {};
        this.enhancedjournal = options.enhancedjournal;

        try {
            this._scrollPositions = JSON.parse(this.object.flags['monks-enhanced-journal']?.scrollPos || {});
        } catch (e) { }
    }

    static get defaultOptions() {
        let defOptions = super.defaultOptions;
        let classes = defOptions.classes.concat(['monks-journal-sheet', 'monks-enhanced-journal', `${game.system.id}`]);
        if (game.modules.get("rippers-ui")?.active)
            classes.push('rippers-ui');
        if (game.modules.get("rpg-styled-ui")?.active)
            classes.push('rpg-styled-ui');

        return foundry.utils.mergeObject(defOptions, {
            id: "enhanced-journal-sheet",
            title: i18n("MonksEnhancedJournal.NewTab"),
            template: "modules/monks-enhanced-journal/templates/blank.html",
            classes: classes,
            dragDrop: [ { dragSelector: "null", dropSelector: ".blank-body" } ],
            popOut: true,
            width: 1025,
            height: 700,
            resizable: true,
            secrets: [{ parentSelector: ".editor" }],
            closeOnSubmit: false,
            submitOnClose: false,
            submitOnChange: true
        });
    }

    get template() {
        return this.options.template;
    }

    get type() {
        return 'blank';
    }

    get allowedRelationships() {
        return ["encounter", "loot", "organization", "person", "place", "poi", "event", "quest", "shop"];
    }

    _canUserView(user) {
        if (this.object.compendium) return user.isGM || !this.object.compendium.private;
        return this.object.parent.testUserPermission(user, this.options.viewPermission);
    }

    _inferDefaultMode() {
        const hasImage = !!this.object.img;
        if (this.object.limited) return hasImage ? "image" : null;

        return "text";
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();

        let canConfigure = this.isEditable && game.user.isGM;
        if (!canConfigure)
            buttons.findSplice(b => b.class == "configure-sheet");

        buttons.findSplice(b => b.class == "entry-text");
        buttons.findSplice(b => b.class == "entry-image");

        return buttons;
    }

    _onChangeTab(event) {
        if(this.object.isOwner && this.isEditable)
            this.object.setFlag('monks-enhanced-journal', '_lasttab', this._tabs[0].active);
    }

    static get defaultObject() {
        return {};
    }

    get canPlaySound() {
        return true;
    }

    async getData() {
        let data = (this.object.id ? await super.getData() : {
            cssClass: this.isEditable ? "editable" : "locked",
            editable: this.isEditable,
            data: (this.object?.toObject ? this.object?.toObject(false) : {}),
            content: this.object?.content,
            options: this.options,
            owner: false,
            title: i18n("MonksEnhancedJournal.NewTab"),
            recent: (game.user.getFlag("monks-enhanced-journal", "_recentlyViewed") || []).map(r => {
                return mergeObject(r, { img: MonksEnhancedJournal.getIcon(r.type) });
            })
        });

        //this._convertFormats(data);
        data.enrichedText = await TextEditor.enrichHTML(data.document?.text?.content, {
            relativeTo: this.object,
            secrets: this.object.isOwner,
            async: true
        });

        if (game.system.id == "pf2e") {
            data.data.content = await game.pf2e.TextEditor.enrichHTML(data.data.content, { secrets: game.user.isGM, async: true });
        }

        data.userid = game.user.id;

        if (data.data.flags && data.data.flags["monks-enhanced-journal"] && data.data.flags["monks-enhanced-journal"][game.user.id])
            data.userdata = data.data.flags["monks-enhanced-journal"][game.user.id];

        data.entrytype = this.type;
        data.isGM = game.user.isGM;
        data.hasGM = (game.users.find(u => u.isGM && u.active) != undefined);

        if (this.canPlaySound) {
            data.sound = (getProperty(data, "data.flags.monks-enhanced-journal.sound") || {});
            if (this.enhancedjournal)
                data.sound.playing = (this.enhancedjournal._backgroundsound || {})[this.object.id]?.playing;
            else
                data.sound.playing = this._backgroundsound?.playing;
        }

        data.data.icon = MonksEnhancedJournal.getIcon(this.type);

        return data;
    }

    refresh() { }

    get isEditable() {
        if (this.enhancedjournal && !this.enhancedjournal.isEditable)
            return false;

        return this.object.permission == CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER && this.object?.compendium?.locked !== true;
    }

    fieldlist() {
        return null;
    }

    async _render(force, options = {}) {
        //Foundry is going to try and reposition the window, but since it's a subsheet, we don't want that to happen
        //So fake it by telling it that the window is minimized
        let oldMinimize = this._minimized;
        if (this.enhancedjournal)
            this._minimized = true;

        if (!this._searchFilters)
            this._searchFilters = [];

        await super._render(force, options);

        if (this.enhancedjournal)
            this._minimized = oldMinimize;
        else if (!this.object.isOwner && ["base", "journalentry"].includes(this.type) && (this.options.sheetMode || this._sheetMode) === "image" && this.object.img) {
            $(this.element).removeClass('monks-journal-sheet monks-enhanced-journal dnd5e');
        }

        if (!this.enhancedjournal && !this._backgroundsound?.playing) {
            // check to see if this object has a sound, and that sound sets an autoplay.
            let sound = this.object.getFlag("monks-enhanced-journal", "sound");
            if (sound?.audiofile && sound?.autoplay) {
                this._playSound(sound).then((sound) => {
                    this._backgroundsound = sound;
                });
            }

            this._soundHook = Hooks.on("globalInterfaceVolumeChanged", (volume) => {
                this._backgroundsound.volume = volume * game.settings.get("core", "globalInterfaceVolume");
            });
        }

        if (options?.anchor) {
            const anchor = $(`#${options?.anchor}`, this.element);
            if (anchor.length) {
                anchor[0].scrollIntoView();
            }
        }

        log('Subsheet rendering');

        this.updateStyle();
    }

    _canDragStart(selector) {
        if (selector == ".sheet-icon") return game.user.isGM;
        return game.user.isGM;
    }

    _canDragDrop(selector) {
        return game.user.isGM;
    }

    async _onDragStart(event) {
        const target = event.currentTarget;

        if ($(target).hasClass("sheet-icon")) {
            const dragData = {
                uuid: this.object.uuid,
                type: this.object.documentName,
                QEBypass: true
            };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        }
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if ((data.type == 'JournalEntry' || data.type == 'JournalEntryPage' || data.type == 'Actor') && this.enhancedjournal) {
            let document = await fromUuid(data.uuid);
            this.enhancedjournal.open(document);
        } else
            return false;
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html);
        this._contextMenu(html);

        new EnhancedJournalContextMenu($(html), (this.type == "text" ? ".editor-parent" : ".tab.description .tab-inner"), this._getDescriptionContextOptions());

        //$("a.inline-request-roll", html).click(MonksEnhancedJournal._onClickInlineRequestRoll.bind(this));
        $("a.picture-link", html).click(MonksEnhancedJournal._onClickPictureLink.bind(this));
        $("img:not(.nopopout)", html).click(this._onClickImage.bind(this));

        $('a[href^="#"]', html).click(this._onClickAnchor.bind(this));

        $('.sheet-image .profile', html).contextmenu(() => {
            const ip = new ImagePopout(this.object.src, {
                uuid: this.object.uuid,
                title: this.object.name,
                caption: this.object.image?.caption
            });
            ip.shareImage = () => Journal.showDialog(this.object, { showAs: "image" });
            ip.render(true);
        });

        html.find('img[data-edit],div.picture-img').click(this._onEditImage.bind(this));

        $('.play-journal-sound', html).prop("disabled", false).click(this.toggleSound.bind(this));

        if (enhancedjournal) {
            html.find('.new-link').click(async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const options = { width: 320 };
                const cls = getDocumentClass("JournalEntry");
                return cls.createDialog({}, options);
            });

            html.find('.recent-link').click(async (ev) => {
                let uuid = ev.currentTarget.dataset.documentUuid;
                let id = ev.currentTarget.dataset.documentId;
                let document;
                if (uuid)
                    document = await fromUuid(uuid);
                else
                    document = game.journal.find(j => j.id == id);
                if (document)
                    enhancedjournal.open(document);
            });

            for (let dragdrop of enhancedjournal._dragDrop)
                dragdrop.bind(html[0]);

            /*
            if (enhancedjournal.subsheet.editors["text.content"]) {
                let oldSaveCallback = enhancedjournal.subsheet.editors["text.content"].options.save_onsavecallback;
                enhancedjournal.subsheet.editors["text.content"].options.save_onsavecallback = async (name) => {
                    await oldSaveCallback.call(enhancedjournal.subsheet.editors["text.content"], name);
                }
            }
            */

            /*
            if (game.system.id == "pf2e") {
                let cls = CONFIG.JournalEntry.sheetClasses.base["pf2e.JournalSheetPF2e"].cls;
                let object = this.object;
                if (object instanceof JournalEntryPage)
                    object = object.parent;
                let sheet = new cls(object);
                this.pf2eActivateEditor = sheet.activateEditor;
                sheet.activateEditor = this.activateEditor.bind(this);
                sheet.activateListeners.call(this, html);
            }*/
        }
    }

    activateEditor(name, options = {}, initialContent = "") {
        $('.editor .editor-content', this.element).unmark();

        let polyglot = (isNewerVersion(game.modules.get("polyglot")?.version, "1.7.30") ? game.polyglot : polyglot?.polyglot);

        if (this.editors[name] != undefined) {
            if (game.modules.get("polyglot")?.active && polyglot) {
                if (!game.user.isGM) {
                    var langs = {};
                    for (let lang of polyglot.known_languages) {
                        langs[lang] = polyglot.LanguageProvider.languages[lang];
                    }
                    for (let lang of polyglot.literate_languages) {
                        langs[lang] = polyglot.LanguageProvider.languages[lang];
                    }
                } else langs = polyglot.LanguageProvider.languages;
                const languages = Object.entries(langs).map(([lang, name]) => {
                    return {
                        title: name || "",
                        inline: "span",
                        classes: "polyglot-journal",
                        attributes: {
                            title: name || "",
                            "data-language": lang || "",
                        },
                    };
                });
                if (this.truespeech) {
                    const truespeechIndex = languages.findIndex((element) => element.attributes["data-language"] == this.truespeech);
                    if (truespeechIndex !== -1) languages.splice(truespeechIndex, 1);
                }
                if (this.comprehendLanguages && !this._isTruespeech(this.comprehendLanguages)) {
                    const comprehendLanguagesIndex = languages.findIndex((element) => element.attributes["data-language"] == this.comprehendLanguages);
                    if (comprehendLanguagesIndex !== -1) languages.splice(comprehendLanguagesIndex, 1);
                }
                options.style_formats = [
                    ...CONFIG.TinyMCE.style_formats,
                    {
                        title: "Polyglot",
                        items: languages,
                    },
                ];
                options.formats = {
                    removeformat: [
                        // Default remove format configuration from tinyMCE
                        {
                            selector: "b,strong,em,i,font,u,strike,sub,sup,dfn,code,samp,kbd,var,cite,mark,q,del,ins",
                            remove: "all",
                            split: true,
                            expand: false,
                            block_expand: true,
                            deep: true,
                        },
                        {
                            selector: "span",
                            attributes: ["style", "class"],
                            remove: "empty",
                            split: true,
                            expand: false,
                            deep: true,
                        },
                        {
                            selector: "*",
                            attributes: ["style", "class"],
                            split: false,
                            expand: false,
                            deep: true,
                        },
                        // Add custom config to remove spans from polyglot when needed
                        {
                            selector: "span",
                            classes: "polyglot-journal",
                            attributes: ["title", "class", "data-language"],
                            remove: "all",
                            split: true,
                            expand: false,
                            deep: true,
                        },
                    ],
                };
            }

            if (this.object.type == 'text' || this.object.type == 'journalentry' || this.object.type == 'oldentry' || setting("show-menubar")) {
                options = foundry.utils.mergeObject(options, {
                    menubar: true,
                    plugins: CONFIG.TinyMCE.plugins + ' background dcconfig anchor',
                    toolbar: CONFIG.TinyMCE.toolbar + ' background dcconfig anchor'//,
                    //font_formats: "Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Oswald=oswald; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats;Anglo Text=anglo_textregular;Lovers Quarrel=lovers_quarrelregular;Play=Play-Regular"
                });
            }
            if (this.pf2eActivateEditor)
                this.pf2eActivateEditor.call(this, name, options, initialContent);
            else
                super.activateEditor(name, options, initialContent);
            //need this because foundry doesn't allow access to the init of the editor
            if (this.object.type == 'text' || this.object.type == 'journalentry' || this.object.type == 'oldentry' || setting("show-menubar")) {
                let count = 0;
                let that = this;
                let data = this.object.getFlag('monks-enhanced-journal', 'style');
                //if (data) {
                    let timer = window.setInterval(function () {
                        count++;
                        if (count > 20) {
                            window.clearInterval(timer);
                        }
                        let editor = that.editors[name];
                        if (editor && editor.mce) {
                            editor.mce.enhancedsheet = that;
                            that.updateStyle(data, $(editor.mce.contentDocument));
                            window.clearInterval(timer);
                        }
                    }, 100);
                //}
            }
        }
    }

    _onClickImage(event) {
        const target = event.currentTarget;
        const title = this.object?.name ?? target.title;
        const ip = new ImagePopout(target.src, { title });
        //ip.shareImage = () => Journal.showDialog(this.object, { showAs: "image" });
        ip.render(true);
    }

    _contextMenu(html) {
        //EnhancedJournalContextMenu.create(this, html, ".tab.description .tab-inner", this._getEntryContextOptions());
    }

    async getRelationships() {
        let relationships = {};
        for (let item of (this.object.flags['monks-enhanced-journal']?.relationships || [])) {
            let entity = item.uuid ? await fromUuid(item.uuid) : game.journal.get(item.id);
            if (!(entity instanceof JournalEntry || entity instanceof JournalEntryPage))
                continue;
            if (entity && entity.testUserPermission(game.user, "LIMITED") && (game.user.isGM || !item.hidden)) {
                let page = (entity instanceof JournalEntryPage ? entity : entity.pages.contents[0]);
                let type = getProperty(page, "flags.monks-enhanced-journal.type");
                if (!relationships[type])
                    relationships[type] = { type: type, name: i18n(`MonksEnhancedJournal.${type.toLowerCase()}`), documents: [] };

                if (relationships[type].documents.some(r => r.id == item.id && r.uuid == item.uuid))
                    continue;

                item.name = page.name;
                item.img = page.src || `modules/monks-enhanced-journal/assets/${type}.png`;
                item.type = type;
                item.shoptype = page.getFlag("monks-enhanced-journal", "shoptype");
                item.role = page.getFlag("monks-enhanced-journal", "role");

                relationships[type].documents.push(item);
            }
        }

        for (let [k, v] of Object.entries(relationships)) {
            v.documents = v.documents.sort((a, b) => a.name.localeCompare(b.name));
        }

        return relationships;
    }

    _getDescriptionContextOptions() {
        let menu = [
            {
                name: "Show in Chat",
                icon: '<i class="fas fa-comment"></i>',
                condition: game.user.isGM,
                callback: li => {
                    this.copyToChat();
                }
            },
            {
                name: "Extract to Journal Entry",
                icon: '<i class="fas fa-file-export"></i>',
                condition: game.user.isGM,
                callback: li => {
                    this.splitJournal();
                }
            }
        ];

        if (game.modules.get("narrator-tools")?.active) {
            menu = menu.concat(
                [{
                    icon: '<i class="fas fa-comment"></i>',
                    name: 'Describe',
                    condition: game.user.isGM,
                    callback: () => {
                        const selection = NarratorTools._getSelectionText();
                        if (selection)
                            NarratorTools.chatMessage.describe(selection);
                    },
                },
                {
                    icon: '<i class="fas fa-comment-dots"></i>',
                    name: 'Narrate',
                    condition: game.user.isGM,
                    callback: () => {
                        const selection = NarratorTools._getSelectionText();
                        if (selection)
                            NarratorTools.chatMessage.narrate(selection);
                    },
                }]
            );
        }

        return menu;
    }

    _disableFields(form) {
        super._disableFields(form);
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (hasGM)
            $(`textarea[name="flags.monks-enhanced-journal.${game.user.id}.notes"]`, form).removeAttr('disabled').removeAttr('readonly').on('blur', this._onChangeInput.bind(this));
        $('.editor-edit', form).css({ width: '0px !important', height: '0px !important' });
    }

    static getCurrency(actor, denomination) {
        let coinage;
        switch (game.system.id) {
            case 'pf2e':
                {
                    let coin = actor.items.find(i => { return i.isCoinage && i.system.price.value[denomination] == 1 });
                    coinage = (coin && coin.system.quantity); //price.value[denomination]);
                }
                break;
            case 'wfrp4e':
                {
                    let currency = MonksEnhancedJournal.currencies.find(c => c.id == denomination);
                    let coin = actor.itemCategories.money.find(i => { return i.type == "money" && i.name == currency.name });
                    coinage = parseInt((coin && coin.system.quantity.value) || 0);
                } break;
            case 'mythras':
                {
                    let currency = MonksEnhancedJournal.currencies.find(c => c.id == denomination);
                    let coin = actor.items.find(i => { return i.type == "currency" && i.name == currency.name });
                    coinage = parseInt((coin && coin.system.quantity) || 0);
                } break;
            case 'cyphersystem':
                {
                    let currency = MonksEnhancedJournal.currencies.find(c => c.id == denomination);

                    let coins = actor.system.settings.currency;
                    let systemcoins = {
                        name6: i18n('CYPHERSYSTEM.Adamantine'),
                        name5: i18n('CYPHERSYSTEM.Mithral'),
                        name4: i18n('CYPHERSYSTEM.Platinum'),
                        name3: i18n('CYPHERSYSTEM.Gold'),
                        name2: i18n('CYPHERSYSTEM.Silver'),
                        name: (coins.howMany == '1' ? i18n('CYPHERSYSTEM.Shins') : i18n('CYPHERSYSTEM.Copper'))
                    };

                    let coinname = Object.keys(coins).find(key => coins[key] == currency.name) || Object.keys(systemcoins).find(key => systemcoins[key] == currency.name);
                    if (!coinname)
                        return 0;

                    let qtyname = coinname.replace("name", "quantity");

                    coinage = parseInt(coins[qtyname] || 0);
                } break;
            case 'age-system':
                coinage = parseInt(actor.system[denomination]);
                break;
            case 'swade':
                coinage = parseInt(actor.system.details.currency);
                break;
            case 'swade':
                coinage = parseInt(actor.system.details.currency);
                break;
            case 'shadowrun5e':
                coinage = parseInt(actor.system.nuyen);
                break;
            case 'starwarsffg':
                coinage = parseInt(actor.system.stats.credits.value);
                break;
            case 'sfrpg':
                coinage = parseInt(actor.system.currency[(denomination == "cr" ? "credit" : denomination)]);
                break;
            default:
                {
                    let coin = currencyname() == "" ? actor : getValue(actor, currencyname()) ?? actor;
                    coinage = parseInt(getValue(coin, denomination));
                }
                break;
        }

        return parseInt(coinage ?? 0);
    }

    getCurrency(actor, denomination) {
        return this.constructor.getCurrency(actor, denomination);
    }

    static async addCurrency(actor, denomination, value) {
        let changes = {};
        if (value < 0 && setting("purchase-conversion")) {
            let currencies = duplicate(MonksEnhancedJournal.currencies || []).filter(c => c.convert != undefined);
            for (let curr of currencies) {
                curr.value = parseInt(this.getCurrency(actor, curr.id) || 0);
            }

            changes = currencies.reduce((a, v) => ({ ...a, [v.id]: v.value }), {});
            let denomIdx = currencies.findIndex(c => c.id == denomination);
            if (denomIdx == -1)
                return;

            let remainder = -value;
            // pull from the actual currency first
            let available = Math.floor(Math.min(remainder, changes[denomination]));
            if (available > 0) {
                remainder -= available;
                changes[denomination] -= available;
            }

            let idx = denomIdx + 1;
            let dir = 1;
            // move to lower denominations, then work through the higher denomination
            while (remainder > 0 && idx >= 0) {
                if (idx >= currencies.length) {
                    idx = denomIdx - 1;
                    dir = -1;
                }

                //check to make sure the currency in question has some available
                if (idx >= 0 && currencies[idx].value > 0) {
                    let rate = (currencies[idx].convert || 1) / (currencies[denomIdx].convert || 1);
                    available = Math.floor(currencies[idx].value * rate); // convert from lower denomination to currenct denomination

                    if (available > 0) {
                        let used = Math.floor(Math.min(remainder, available));

                        remainder -= used;
                        
                        let unused = available - used;
                        changes[currencies[idx].id] = Math.floor(unused / rate);
                        unused -= Math.floor(unused / rate) * rate;

                        if (idx < denomIdx && unused > 0) {
                            // If this is a greater denomination, then we need to disperse the unused between the lower denominations
                            let jdx = idx + 1;
                            while (unused > 0 && jdx < currencies.length) {
                                let r = (currencies[jdx].convert || 1) / (currencies[denomIdx].convert || 1);
                                let disperse = unused / r;
                                changes[currencies[jdx].id] += Math.floor(disperse);
                                unused -= Math.floor(disperse) * r;

                                jdx++;
                            }
                        }
                    }
                }

                idx += dir;
            }

            //changes[denomination] += value;

            for (let curr of Object.keys(changes)) {
                let orig = currencies.find(c => c.id == curr);
                if (changes[curr] == orig.value)
                    delete changes[curr];
            }
        } else
            changes[denomination] = parseInt(this.getCurrency(actor, denomination) || 0) + value;

        let updates = {};
        if (game.system.id == 'pf2e') {
            let promises = [];
            for (let [k, v] of Object.entries(changes)) {
                let coinage = actor.items.find(i => { return i.isCoinage && i.system.price.value[k] == 1 });
                if (!coinage) {
                    let itemData = MonksEnhancedJournal.pf2eCurrency[k];
                    setProperty(itemData, "system.quantity", v);
                    let items = await actor.createEmbeddedDocuments("Item", [itemData]);
                    if (items.length)
                        coinage = items[0];
                } else {
                    updates[`system.quantity`] = v;
                    promises.push(coinage.update(updates));
                }
            }
            return Promise.all(promises);
        } else if (game.system.id == 'mythras') {
            let promises = [];
            for (let [k, v] of Object.entries(changes)) {
                let currency = MonksEnhancedJournal.currencies.find(c => c.id == k);
                let coinage = actor.items.find(i => { return i.type == "currency" && i.name == currency });
                if (coinage) {
                    updates[`system.quantity`] = v;
                    promises.push(coinage.update(updates));
                }
            }
            return Promise.all(promises);
        } else if (game.system.id == 'wfrp4e') {
            let promises = [];
            for (let [k, v] of Object.entries(changes)) {
                let currency = MonksEnhancedJournal.currencies.find(c => c.id == k);
                let coinage = actor.itemCategories.money.find(i => { return i.type == "money" && i.name == currency.name });
                if (!coinage) {
                    let itemData = MonksEnhancedJournal.wfrp4eCurrency[k];
                    setProperty(itemData, "system.quantity.value", v);
                    let items = await actor.createEmbeddedDocuments("Item", [itemData]);
                    if (items.length)
                        coinage = items[0];
                } else {
                    updates[`system.quantity.value`] = v;
                    promises.push(coinage.update(updates));
                }
            }
            return Promise.all(promises);
        } else {
            for (let [k, v] of Object.entries(changes)) {
                switch (game.system.id) {
                    case 'age-system':
                        updates[`system.${k}`] = v;
                        break;
                    case 'swade':
                        updates[`system.details.currency`] = v;
                        break;
                    case 'sfrpg':
                        updates[`system.currency.${k == "cr" ? "credit" : k}`] = v;
                        break;
                    case 'shadowrun5e':
                        updates[`system.nuyen`] = v;
                        break;
                    case 'starwarsffg':
                        updates[`system.stats.credits.value`] = v;
                        break;
                    case 'cyphersystem':
                        {
                            let currency = MonksEnhancedJournal.currencies.find(c => c.id == k);

                            let coins = actor.system.settings.currency;
                            let systemcoins = {
                                name6: i18n('CYPHERSYSTEM.Adamantine'),
                                name5: i18n('CYPHERSYSTEM.Mithral'),
                                name4: i18n('CYPHERSYSTEM.Platinum'),
                                name3: i18n('CYPHERSYSTEM.Gold'),
                                name2: i18n('CYPHERSYSTEM.Silver'),
                                name: (coins.howMany == '1' ? i18n('CYPHERSYSTEM.Shins') : i18n('CYPHERSYSTEM.Copper'))
                            };

                            let coinname = Object.keys(coins).find(key => coins[key] == currency.name) || Object.keys(systemcoins).find(key => systemcoins[key] == currency.name);

                            if (!coinname)
                                continue;
                            let qtyname = coinname.replace("name", "quantity");

                            updates[`system.settings.currency.${qtyname}`] = v;
                        } break;
                    default:
                        {
                            let coin = currencyname() == "" ? actor : getValue(actor, currencyname()) ?? actor;
                            updates[`data${currencyname() != "" ? "." : ""}${currencyname()}.${k}`] = (coin[k] && coin[k].hasOwnProperty("value") ? { value: v } : v);
                        }
                        break;
                }
            }
            return actor.update(updates);
        }
    }

    addCurrency(actor, denomination, value) {
        return this.constructor.addCurrency(actor, denomination, value);
    }

    onAddSound() {
        let sound = (this.enhancedjournal ? this.enhancedjournal._backgroundsound[this.object.id] : this._backgroundsound);
        new EditSound(this.object, sound).render(true);
    }

    toggleSound() {
        let sound = (this.enhancedjournal ? this.enhancedjournal._backgroundsound[this.object.id] : this._backgroundsound);

        if (sound?.playing) {
            // stop sound playing
            this._stopSound(sound);
        } else {
            // start sound playing
            if (!sound) {
                sound = this.object.getFlag("monks-enhanced-journal", "sound");
            }
            this._playSound(sound).then((sound) => {
                if (!sound)
                    return;

                if (this.enhancedjournal)
                    this.enhancedjournal._backgroundsound[this.object.id] = sound;
                else
                    this._backgroundsound = sound;
            });
        }
    }

    _playSound(sound) {
        if (sound.audiofile) {
            let volume = sound.volume ?? 1;
            $('.play-journal-sound', this.element).addClass("loading").find("i").attr("class", "fas fa-sync fa-spin");
            return AudioHelper.play({
                src: sound.audiofile,
                loop: sound.loop,
                volume: 0
            }).then((soundfile) => {
                $('.play-journal-sound', this.element).addClass("active").removeClass("loading").find("i").attr("class", "fas fa-volume-up");
                soundfile.fade(volume * game.settings.get("core", "globalInterfaceVolume"), { duration: 500 });
                soundfile.on("end", () => {
                    $('.play-journal-sound', this.element).removeClass("active").find("i").attr("class", "fas fa-volume-off");
                });
                soundfile._mejvolume = volume;
                return soundfile;
            });
        } else {
            let soundData = this.object.getFlag("monks-enhanced-journal", "sound");
            let options = { volume: (soundData.volume ?? 1), fade: 500, loop: soundData.loop };
            if (!sound.loaded)
                sound.load({ autoplay: true, autoplayOptions: options });
            else
                sound.play(options);
            $('.play-journal-sound', this.element).addClass("active").find("i").attr("class", "fas fa-volume-up");
        }

        return new Promise((resolve) => { });
    }

    _stopSound(sound) {
        if (sound && sound.stop) {
            sound.fade(0, { duration: 500 }).then(() => {
                sound.stop();
                $('.play-journal-sound', this.element).removeClass("active").find("i").removeClass('fa-volume-up').addClass('fa-volume-off');
            });
        }
    }

    _onClickAnchor(event) {
        event.preventDefault();
        event.stopPropagation();
        const a = $(event.currentTarget);

        const href = a.attr("href");

        const anchor = $(href);
        if (anchor.length) {
            anchor[0].scrollIntoView();
        }
    }

    _onEditImage(event) {
        if (this.object.permission < CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
            return null;

        const fp = new FilePicker({
            type: "image",
            current: this.object.img,
            callback: path => {
                $(event.currentTarget).attr('src', path).css({ backgroundImage: `url(${path})` });
                $('img[data-edit="src"]', this.element).css({ opacity: '' });
                $('.tab.picture .instruction', this.element).hide();
                $('.picture-area .instruction', this.element).hide();
                this._onSubmit(event, { preventClose: true });
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        })
        return fp.browse();
    }

    _onSubmit(ev) {
        const formData = expandObject(this._getSubmitData());

        if (Object.keys(formData).length == 0)
            return;

        if (this.type == 'quest') {
            $(`li[data-document-id="${this.object.id}"]`, '#journal,#journal-directory').attr('status', formData.flags['monks-enhanced-journal'].status);
        }

        if (!this.isEditable && foundry.utils.getProperty(formData, 'flags.monks-enhanced-journal.' + game.user.id)) {
            //need to have the GM update this, but only the user notes
            MonksEnhancedJournal.emit("saveUserData", {
                documentId: this.object.uuid,
                userId: game.user.id,
                userdata: formData.flags["monks-enhanced-journal"][game.user.id]
            });
            return new Promise(() => { });
        } else
            return this.object.update(formData);
    }

    _documentControls() {
        let ctrls = [];
        if (this.object.id)
            ctrls.push({ id: 'locate', text: i18n("SIDEBAR.JumpPin"), icon: 'fa-crosshairs', conditional: game.user.isGM, callback: this.enhancedjournal.findMapEntry.bind(this) });
        if (this.fieldlist() != undefined)
            ctrls.push({ id: 'settings', text: i18n("MonksEnhancedJournal.EditFields"), icon: 'fa-cog', conditional: game.user.isGM, callback: this.onEditFields });
        return ctrls;
    }

    open(document) {
        if (document) {
            if (this.enhancedjournal)
                this.enhancedjournal.open(document, event.shiftKey);
            else {
                let page = document;
                if (document instanceof JournalEntry && document.pages.size == 1) {
                    page = document.pages.contents[0];
                }

                if (page instanceof JournalEntryPage) {
                    MonksEnhancedJournal.fixType(page);
                    let type = getProperty(page, "flags.monks-enhanced-journal.type");
                    let types = MonksEnhancedJournal.getDocumentTypes();
                    if (types[type]) {
                        return page.sheet.render(true);
                    }
                }

                document.sheet.render(true);
            }
        }
    }

    updateStyle(data, element) {
        if (data == undefined)
            data = getProperty(this.object, "flags.monks-enhanced-journal.style");

        if (data == undefined)
            return;

        let content = $('.editor-content[data-edit="text.content"],.mce-content-body', (element || this.element));

        let css = {
            'background-color': (data.color ? data.color : ''),
            'background-image': (data.img?.value ? 'url(' + data.img?.value + ')' : ''),
            'background-repeat': (data.sizing == 'repeat' ? 'repeat' : 'no-repeat'),
            'background-position': 'center',
            'background-size': (data.sizing == 'repeat' ? 'auto' : (data.sizing == 'stretch' ? '100% 100%' : data.sizing))
        }

        content.css(css);
    }

    onEditDescription(event) {
        if (!this.isEditable)
            return null;

        const name = $('.editor-content', this.element).attr("data-edit");
        if (this.editors?.[name]?.active) {
            /*
            //close the editor
            const name = $('.editor-content', this.element).attr("data-edit");
            //this.saveEditor(name);
            const editor = this.editors[name];
            if (!editor || !editor.mce) throw new Error(`${name} is not an active editor name!`);
            editor.active = false;
            const mce = editor.mce;

            const submit = this._onSubmit(new Event("mcesave"));

            mce.remove();
            if (editor.hasButton) editor.button.style.display = "";

            //$('.nav-button.edit i', this.element).addClass('fa-pencil-alt').removeClass('fa-download');

            return submit.then(() => {
                mce.destroy();
                editor.mce = null;
                //this.render(true, { action:'update', data: {content: editor.initial, _id: this.object.id}}); //need to send this so that the render looks to the subsheet instead
                editor.changed = false;
                $('.sheet-body', this.element).removeClass('editing');
            });*/
            this.saveEditor(name);
        } else {
            if ($('.editor', this.element).is(":visible"))
                $('.editor .editor-edit', this.element).click();
            //$('.sheet-body', this.element).addClass('editing');
        }
    }

    onEditFields() {
        //popup a dialog with the available fields to edit
        let fields = this.fieldlist();
        new EditFields(this.object, fields).render(true);
    }

    async renderPolyglot(html) {

        //show the runes if [(gm or owner) and userunes][not gm and lang unknown]

        let that = this;
        //userunes = !(this.object.getFlag('monks-enhanced-journal', 'use-runes') != undefined ? this.object.getFlag('monks-enhanced-journal', 'use-runes') : setting('use-runes'));
        //MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'use-runes', userunes);
        //$('.nav-button.polyglot i', this.element).attr('class', 'fas ' + (userunes ? 'fa-link' : 'fa-unlink'));


        $('.editor-content span.polyglot-journal:not(.converted)', html).each(function () {
            const lang = this.dataset.language;
            if (!lang) return;

            let text = $(this).html();
            let polyglot = (isNewerVersion(game.modules.get("polyglot")?.version, "1.7.30") ? game.polyglot : polyglot?.polyglot);
            if (!polyglot)
                return;

            let scramble = polyglot.scrambleString(this.textContent, game.settings.get('polyglot', 'useUniqueSalt') ? that.object.id : lang, lang);
            let font = polyglot._getFontStyle(lang);

            $(this).addClass('converted')
                .attr('title', (game.user.isGM || that.object.permission == CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER || polyglot.known_languages.has(lang) ? polyglot.LanguageProvider.languages[lang] : 'Unknown'))
                .attr('data-language', lang)
                .css({ font: font })
                .data({ text: text, scramble: scramble, lang: lang, font: font, changed: true })
                .html(scramble)
                .click(
                    function () {
                        let data = $(this).data();
                        const lang = data.lang;
                        if (game.user.isGM || that.object.permission == CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER || polyglot.known_languages.has(lang)) {
                            $(this).data('changed', !data.changed).html(data.changed ? data.scramble : data.text).css({ font: (data.changed ? data.font : '') });
                        }
                    }
                );
        });
    }

    slugify(str) {
        if (str == undefined)
            return "";

        str = str.replace(/^\s+|\s+$/g, '');

        // Make the string lowercase
        str = str.toLowerCase();

        // Remove accents, swap ñ for n, etc
        var from = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆÍÌÎÏŇÑÓÖÒÔÕØŘŔŠŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇíìîïňñóöòôõøðřŕšťúůüùûýÿžþÞĐđßÆa·/_,:;";
        var to = "AAAAAACCCDEEEEEEEEIIIINNOOOOOORRSTUUUUUYYZaaaaaacccdeeeeeeeeiiiinnooooooorrstuuuuuyyzbBDdBAa------";
        for (var i = 0, l = from.length; i < l; i++) {
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
        }

        // Remove invalid chars
        str = str.replace(/[^a-z0-9 -]/g, '')
            // Collapse whitespace and replace by -
            .replace(/\s+/g, '-')
            // Collapse dashes
            .replace(/-+/g, '-');

        return str;
    }

    getItemGroups(items, type, purchasing, sort = "name") {
        //let type = data?.data?.flags['monks-enhanced-journal'].type;
        //let purchasing = data?.data?.flags['monks-enhanced-journal'].purchasing;

        if (!items)
            return {};

        let groups = {};
        for (let item of items) {
            if (!item)
                continue;
            let requests = (Object.entries(getProperty(item, "flags.monks-enhanced-journal.requests") || {})).map(([k, v]) => {
                if (!v)
                    return null;
                let user = game.users.get(k);
                if (!user)
                    return null;
                return { id: user.id, border: user.border, color: user.color, letter: user.name[0], name: user.name };
            }).filter(r => !!r);

            let hasRequest = (requests.find(r => r.id == game.user.id) != undefined);

            let flags = getProperty(item, "flags.monks-enhanced-journal") || {};
            let text = (type == 'shop' ?
                (flags.quantity === 0 ? i18n("MonksEnhancedJournal.SoldOut") : (flags.lock ? i18n("MonksEnhancedJournal.Unavailable") : i18n("MonksEnhancedJournal.Purchase"))) :
                (purchasing == "free" || purchasing == "confirm" ? i18n("MonksEnhancedJournal.Take") : (hasRequest ? i18n("MonksEnhancedJournal.Cancel") : i18n("MonksEnhancedJournal.Request"))));
            let icon = (type == 'shop' ?
                (flags.quantity === 0 ? "" : (flags.lock ? "fa-lock" : "fa-dollar-sign")) :
                (purchasing == "free" || purchasing == "confirm" ? "fa-hand-paper" : (hasRequest ? "" : "fa-hand-holding-medical")));

            let qtyof = getProperty(item, "system." + quantityname());

            let price = MEJHelpers.getPrice(flags.price);
            let cost = price;
            if (flags.cost != undefined)
                cost = MEJHelpers.getPrice(flags.cost);
            let itemData = {
                id: item._id,
                name: (item.system?.identification?.status == "unidentified" ? item.system?.identification.unidentified.name : item.name),
                type: item.type,
                img: (item.system?.identification?.status == "unidentified" ? item.system?.identification.unidentified.img : item.img),
                hide: flags.hide,
                lock: flags.lock,
                consumable: flags.consumable,
                from: flags.from,
                quantity: flags.quantity,
                qtyof: qtyof,
                remaining: flags.remaining,
                price: (price.consume ? "-" : "") + price.value + " " + price.currency,
                cost: (cost.consume && (game.user.isGM || this.object.isOwner) ? "-" : "") + (cost.value + " " + cost.currency),
                text: text,
                icon: icon,
                assigned: flags.assigned,
                received: flags.received,
                requests: requests
            };

            if (game.user.isGM || this.object.isOwner || (flags.hide !== true && (flags.quantity !== 0 || setting('show-zero-quantity')))) {
                let groupId = (!sort || sort == "name" ? this.slugify(item.type) : "");
                if (groups[groupId] == undefined)
                    groups[groupId] = { id: groupId, name: item.type, items: [] };
                groups[groupId].items.push(itemData);
            }
        }

        let currencies = (MonksEnhancedJournal.currencies || []).reduce((a, v) => ({ ...a, [v.id]: v.convert }), {});
        let defCurr = MEJHelpers.defaultCurrency();
        sort = sort || "name";
        for (let [k, v] of Object.entries(groups)) {
            groups[k].items = groups[k].items.sort((a, b) => {
                let aVal = a[sort];
                let bVal = b[sort];
                let aName = a.name;
                let bName = b.name;

                if (sort == "price" || sort == "cost") {
                    let aCurr = MEJHelpers.getPrice(aVal);
                    let bCurr = MEJHelpers.getPrice(bVal);

                    aVal = aCurr.value * (currencies[aCurr.currency] || 1) / (currencies[defCurr] || 1);
                    bVal = bCurr.value * (currencies[bCurr.currency] || 1) / (currencies[defCurr] || 1);
                }

                let sortVal = (aVal < bVal ? -1 : (aVal > bVal ? 1 : 0));
                if (sortVal == 0) {
                    return (aName < bName ? -1 : (aName > bName ? 1 : 0));
                } else
                    return sortVal;
            });
        }

        groups = Object.values(groups).sort((a, b) => {
            if (a.name < b.name) return -1;
            return a.name > b.name ? 1 : 0;
        });

        for (let group of groups) {
            group.collapsed = this.object._itemList[group.id];
        }

        return groups;
    }

    getOfferings() {
        let currencies = MonksEnhancedJournal.currencies;

        return (this.object.flags['monks-enhanced-journal']?.offerings || []).map(o => {
            if (o.hidden && !(game.user.isGM || this.object.isOwner || (o.userid == game.user.id && o.state != "cancelled")))
                return null;

            let actor = game.actors.get(o.actor?.id || o.actorId);
            let items = [];
            for (let [k, v] of Object.entries(o.currency)) {
                if (v) {
                    let curr = currencies.find(c => c.id == k);
                    items.push(`${curr?.name || "Unknown Currency"}: ${v}`);
                }
            }
            items = items.concat(
                o.items.map(i => {
                    let itemActor = actor;
                    if (itemActor.id != i.actorId) {
                        itemActor = game.actors.get(i.actorId);
                    }

                    let item = {};
                    if (itemActor) {
                        item = itemActor.items.get(i.id);
                    }

                    return `${itemActor.id != actor.id ? (itemActor.name || i.actorName) + ", " : ''}${i.qty > 1 ? i.qty + " " : ""}${item?.name || i.itemName}`;
                })
            );
            return {
                id: o.id,
                name: actor?.name || o.actor?.name,
                img: actor?.img || o.actor?.img,
                actorId: actor?.id || o.actor?.id,
                items: items,
                hidden: o.hidden,
                owner: o.userid == game.user.id,
                state: o.state,
                stateName: i18n(`MonksEnhancedJournal.offer.${o.state}`)
            }
        }).filter(o => !!o);
    }

    static async getDocument(data, type, notify = true) {
        let document;
        if (data.data) {
            document = new CONFIG.Item.documentClass(data.data);
        } else if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            document = id ? await pack.getDocument(id) : null;
        } else {
            if (data.type || type) {
                let collection = game.collections.get(type || data.type);
                if (collection) {
                    document = collection.get(data.id);
                    if (document) {
                        if (document.documentName === "Scene" && document.journal)
                            document = document.journal;
                        if (notify && !document.testUserPermission(game.user, "LIMITED")) {
                            return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveDocumentPermissions", { documentName: document.documentName }));
                        }
                    }
                }
            }
        }

        if (!document && data.uuid)
            document = await fromUuid(data.uuid);

        return document;
    }

    async getDocument(...args) {
        return this.constructor.getDocument(...args);
    }

    static async createRequestMessage(entry, item, actor, shop) {
        let data = getProperty(item, "flags.monks-enhanced-journal");
        let price = shop ? MEJHelpers.getPrice(data.cost) : null; //item, "cost", !shop);
        data.sell = price?.value;
        data.currency = price?.currency;
        data.maxquantity = data.maxquantity ?? data.quantity;
        if (data.maxquantity)
            data.quantity = Math.max(Math.min(data.maxquantity, data.quantity), 1);
        data.total = (price ? data.quantity * data.sell : null);
        setProperty(item, "flags.monks-enhanced-journal", data);

        let messageContent = {
            action: 'buy',
            actor: { id: actor.id, name: actor.name, img: actor.img },
            items: [item],
            shop: { uuid: entry.uuid, name: entry.name, img: entry.src }
        }

        //create a chat message
        let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        if (!whisper.find(u => u == game.user.id))
            whisper.push(game.user.id);
        let speaker = ChatMessage.getSpeaker();
        let content = await renderTemplate("./modules/monks-enhanced-journal/templates/request-item.html", messageContent);
        let messageData = {
            user: game.user.id,
            speaker: speaker,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: content,
            flavor: (speaker.alias ? format("MonksEnhancedJournal.ActorWantsToPurchase", { alias: speaker.alias, verb: (price ? i18n("MonksEnhancedJournal.Purchase").toLowerCase() : i18n("MonksEnhancedJournal.Take").toLowerCase()) }): null),
            whisper: whisper,
            flags: {
                'monks-enhanced-journal': messageContent
            }
        };

        ChatMessage.create(messageData, {});
    }

    static async confirmQuantity(item, max, verb, showTotal = true, price) {
        if (!price)
            price = MEJHelpers.getPrice(getProperty(item, "flags.monks-enhanced-journal.cost"));

        let maxquantity = max != "" ? parseInt(max) : null;
        if (maxquantity == 1 && !showTotal)
            return { quantity: 1, price: price };

        let quantity = 1;
        let content = await renderTemplate('/modules/monks-enhanced-journal/templates/confirm-purchase.html',
            {
                msg: format("MonksEnhancedJournal.HowManyWouldYouLike", { verb: verb }),
                img: item.img,
                name: item.name,
                quantity: quantity,
                price: price?.value + " " + price?.currency,
                maxquantity: maxquantity,
                total: (showTotal ? price?.value + " " + price?.currency : null),
                isGM: game.user.isGM
            });
        let result = await Dialog.confirm({
            title: i18n("MonksEnhancedJournal.ConfirmQuantity"),
            content: content,
            render: (html) => {
                $('input[name="quantity"]', html).change((event) => {
                    quantity = parseInt($(event.currentTarget).val() || 1);
                    if (quantity < 1) {
                        quantity = 1;
                        $(event.currentTarget).val(quantity);
                    }
                    if (max) {
                        quantity = Math.max(Math.min(parseInt(max), quantity), 0);
                        $(event.currentTarget).val(quantity);
                    }
                    if (showTotal)
                        $('.request-total', html).html((quantity * price.value) + " " + price.currency);
                });
                $('input[name="price"]', html).change((event) => {
                    price = MEJHelpers.getPrice($(event.currentTarget).val());
                    $(event.currentTarget).val(price?.value + " " + price?.currency);
                    if (showTotal)
                        $('.request-total', html).html((quantity * price?.value) + " " + price?.currency);
                });
            },
            yes: (html) => {
                //let quantity = parseInt($('input[name="quantity"]', html).val());
                //let price = MEJHelpers.getPrice(item, $('input[name="price"]', html).val());
                return { quantity, price };
            }
        });

        return result;
    }

    static purchaseItem(entry, id, quantity = 1, { actor = null, user = null, remaining = false, purchased = false, chatmessage = true }) {
        let items = duplicate(entry.getFlag('monks-enhanced-journal', 'items') || []);
        let rewards;
        if (entry.getFlag('monks-enhanced-journal', 'rewards')) {
            rewards = duplicate(entry.getFlag('monks-enhanced-journal', 'rewards'));
            let reward = rewards.find(r => {
                return !!r.items.find(i => i._id == id);
            });
            if (reward)
                items = reward.items;
        }
        if (items) {
            let item = items.find(i => i._id == id);
            if (item) {
                if (remaining) {
                    setProperty(item, "flags.monks-enhanced-journal.remaining", Math.max(getProperty(item, "flags.monks-enhanced-journal.remaining") - quantity, 0));
                    setProperty(item, "flags.monks-enhanced-journal.received", actor?.name);
                    setProperty(item, "flags.monks-enhanced-journal.assigned", true);
                } else {
                    let qty = getProperty(item, "flags.monks-enhanced-journal.quantity");
                    if (qty && qty != "")
                        setProperty(item, "flags.monks-enhanced-journal.quantity", Math.max(qty - quantity, 0));
                }
                if (rewards)
                    entry.setFlag('monks-enhanced-journal', 'rewards', rewards);
                else {
                    if(entry.getFlag('monks-enhanced-journal', 'type') == 'loot')
                        items = items.filter(i => getProperty(i, "flags.monks-enhanced-journal.quantity") > 0);
                    entry.setFlag('monks-enhanced-journal', 'items', items);
                }
                if (chatmessage)
                    this.sendChatPurchase(actor, item, purchased, user, quantity);
            }
        }
    }

    static async sendChatPurchase(actor, item, purchased = false, user = game.user.id, quantity = 1) {
        if (setting('chat-message')) {
            let speaker = ChatMessage.getSpeaker({ actor });

            let messageContent = {
                actor: { id: actor.id, name: actor.name, img: actor.img },
                items: [{ id: item.id, name: item.name, img: item.img, quantity: quantity }]
            }

            //create a chat message
            let whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
            //get players that own this character
            if (actor.ownership.default >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER)
                whisper = null;
            else {
                for (let [user, perm] of Object.entries(actor.ownership)) {
                    if (perm >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER && !whisper.find(u => u == user))
                        whisper.push(user);
                }
            }
            let content = await renderTemplate("./modules/monks-enhanced-journal/templates/receive-item.html", messageContent);
            let messageData = {
                user: user,
                speaker: speaker,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                content: content,
                flavor: format("MonksEnhancedJournal.ActorPurchasedAnItem", { alias: (actor.alias ? actor.alias : actor.name), verb: (purchased ? i18n("MonksEnhancedJournal.Purchased").toLowerCase() : i18n("MonksEnhancedJournal.Received").toLowerCase()) }),
                whisper: whisper,
                flags: {
                    'monks-enhanced-journal': messageContent
                }
            };

            ChatMessage.create(messageData, {});
        }
    }

    async getItemData(data) {
        let document = await this.getDocument(data);
        if (!document)
            return null;

        let result = {
            id: document.id,
            uuid: document.uuid,
            img: document.img,
            name: document.name,
            quantity: "1",
            type: document.flags['monks-enhanced-journal']?.type
        };

        if (data.pack)
            result.pack = data.pack;

        return result;
    }

    clearAllItems() {
        Dialog.confirm({
            title: i18n("MonksEnhancedJournal.ClearContents"),
            content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${i18n("MonksEnhancedJournal.msg.AllItemsWillBeDeleted")}</p>`,
            yes: () => {
                this.object.setFlag('monks-enhanced-journal', 'items', []);
            },
        });
    }

    async editItem(event) {
        let id = $(event.currentTarget).closest('li').attr('data-id');
        let items = (this.object.getFlag('monks-enhanced-journal', 'items') || []);

        if (this.type == "quest") {
            let rewards = this.getRewardData();
            if (rewards.length) {
                let reward = this.getReward(rewards);
                items = reward.items;
            }
        }

        let itemData = items.find(i => i._id == id);
        if (itemData) {
            let item = new CONFIG.Item.documentClass(itemData);
            let sheet = item.sheet;

            let newSubmit = async (event, { updateData = null, preventClose = false, preventRender = false } = {}) => {
                event.preventDefault();

                if (game.system.id == "pf2e") {
                    $(sheet._element).find("tags ~ input").each(((_i, input) => {
                        "" === input.value && (input.value = "[]")
                    }))
                }

                sheet._submitting = true;
                const states = this.constructor.RENDER_STATES;

                // Process the form data
                const formData = expandObject(sheet._getSubmitData(updateData));

                let items = duplicate(this.object.getFlag('monks-enhanced-journal', 'items') || []);
                let itm = items.find(i => i._id == itemData._id);
                if (itm) {
                    itm = mergeObject(itm, formData);
                    //let sysPrice = MEJHelpers.getSystemPrice(itm, pricename());
                    //let price = MEJHelpers.getPrice(sysPrice);
                    //setProperty(itm, "flags.monks-enhanced-journal.price", `${price.value} ${price.currency}`);
                    await this.object.setFlag('monks-enhanced-journal', 'items', items);
                }

                mergeObject(sheet.object, formData);

                // Handle the form state prior to submission
                let closeForm = sheet.options.closeOnSubmit && !preventClose;
                const priorState = sheet._state;
                if (preventRender) sheet._state = states.RENDERING;
                if (closeForm) sheet._state = states.CLOSING;

                // Restore flags and optionally close the form
                sheet._submitting = false;
                if (preventRender) sheet._state = priorState;
                if (closeForm) await sheet.close({ submit: false, force: true });
            }

            sheet._onSubmit = newSubmit.bind(sheet);
            try {
                let result = sheet.render(true, { focus: true });
                result.options.alterprice = true;
                //result.options.addremaining = (this.object.type == "encounter" || this.object.type == "quest");
                result.options.addcost = (this.object.type == "shop");
            } catch {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ErrorTryingToEdit"));
            }
        }
    }

    async rollTable(itemtype = "items", useFrom = false) {
        let rolltables = [];

        if (!setting("hide-rolltables")) {
            for (let pack of game.packs) {
                if (pack.documentName == 'RollTable') {
                    const index = await pack.getIndex();
                    let entries = [];
                    const tableString = `Compendium.${pack.collection}.`;
                    for (let table of index) {
                        entries.push({
                            name: table.name,
                            uuid: tableString + table._id,
                        });
                    }

                    let groups = entries.sort((a, b) => { return a.name.localeCompare(b.name) }).reduce((a, v) => ({ ...a, [v.uuid]: v.name }), {});
                    rolltables.push({ text: pack.metadata.label, groups: groups });
                }
            };
        }

        let groups = game.tables.map(t => { return { uuid: t.uuid, name: t.name } }).sort((a, b) => { return a.name.localeCompare(b.name) }).reduce((a, v) => ({ ...a, [v.uuid]: v.name }), {});
        rolltables.push({ text: i18n("MonksEnhancedJournal.RollTables"), groups: groups });

        let that = this;

        let lastrolltable = that.object.getFlag('monks-enhanced-journal', "lastrolltable") || game.user.getFlag('monks-enhanced-journal', "lastrolltable");

        //let table = await fromUuid(lastrolltable);

        let html = await renderTemplate("modules/monks-enhanced-journal/templates/roll-table.html", { rollTables: rolltables, useFrom: useFrom, lastrolltable: lastrolltable });
        Dialog.confirm({
            title: i18n("MonksEnhancedJournal.PopulateFromRollTable"),
            content: html,
            yes: async (html) => {
                let getDiceRoll = async function (value, chatmessage = false) {
                    if (value.indexOf("d") != -1) {
                        let r = new Roll(value);
                        await r.evaluate({ async: true });
                        //if (chatmessage)
                        //    r.toMessage({ whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), speaker: null }, { rollMode: "self" });
                        value = r.total;
                    } else {
                        value = parseInt(value);
                        if (isNaN(value)) value = 1;
                    }

                    return value;
                }

                let rolltable = $('[name="rollable-table"]').val();
                let numberof = $('[name="numberof"]').val();
                let quantity = $('[name="quantity"]').val();
                let reset = $('[name="reset"]').prop("checked");
                let clear = $('[name="clear"]').prop("checked");
                let duplicate = $('[name="duplicate"]').val();

                let useFrom = $('[name="from"]').prop("checked");

                let table = await fromUuid(rolltable);
                if (table) {
                    await that.object.setFlag('monks-enhanced-journal', "lastrolltable", rolltable);
                    await game.user.setFlag('monks-enhanced-journal', "lastrolltable", rolltable);

                    numberof = await getDiceRoll(numberof);

                    let items = (clear ? [] : that.object.getFlag('monks-enhanced-journal', itemtype) || []);
                    let currency = that.object.getFlag('monks-enhanced-journal', "currency") || {};
                    let currChanged = false;

                    for (let i = 0; i < numberof; i++) {
                        const available = table.results.filter(r => !r.drawn);
                        
                        if (!table.formula || !available.length) {
                            if (table.formula && reset)
                                await table.resetResults();
                            else {
                                ui.notifications.warn("There are no available results which can be drawn from this table.");
                                break;
                            }
                        }

                        let result = await table.draw({ rollMode: "selfroll", displayChat: false });

                        if (!result.results.length)
                            continue;

                        let item = null;

                        for (let tableresult of result.results) {
                            switch (tableresult.type) {
                                case CONST.TABLE_RESULT_TYPES.DOCUMENT:
                                    {
                                        let collection = CONFIG[tableresult.documentCollection]?.collection.instance;
                                        item = collection.get(tableresult.documentId);
                                    }
                                    break;
                                case CONST.TABLE_RESULT_TYPES.COMPENDIUM:
                                    {
                                        const items = game.packs.get(tableresult.documentCollection);
                                        if (items)
                                            item = await items.getDocument(tableresult.documentId);
                                    }
                                    break;
                                default:
                                    if (getProperty(this.object, "flags.monks-enhanced-journal.type") == 'loot') {
                                        async function tryRoll(formula) {
                                            try {
                                                return (await (new Roll(formula)).roll({ async: true })).total || 1;
                                            } catch {
                                                return 1;
                                            }
                                        }

                                        let text = tableresult.text;
                                        if (text.startsWith("{") && text.endsWith("}") && text.length > 2) {
                                            let rolls = text.substring(1, text.length - 1).split(",");
                                            for (let roll of rolls) {
                                                let formula = roll;
                                                let coin = roll.match(/\[[a-z]+\]/);
                                                if (coin.length > 0) {
                                                    coin = coin[0];
                                                    formula = formula.replace(`${coin}`, '');
                                                    coin = coin.replace("[", "").replace("]", "");
                                                }
                                                if (coin == undefined || coin.length == 0 || MonksEnhancedJournal.currencies.find(c => c.id == coin) == undefined)
                                                    coin = MEJHelpers.defaultCurrency();

                                                let value = await tryRoll(formula);

                                                currency[coin] = (currency[coin] || 0) + value;
                                                currChanged = true;
                                            }
                                        }
                                    }
                            }
                            /*
                            if (tableresult.collection === undefined) {
                                //check to see if this is a roll for currency
                                
                            } else {
                                item = tableresult.collection.get(tableresult.id);
                                if (tableresult.collection === "Item") {
                                    let collection = game.collections.get(tableresult.collection);
                                    if (collection)
                                        item = collection.get(tableresult.resultId);
                                } else {
                                    // Try to find it in the compendium
                                    const items = game.packs.get(tableresult.collection);
                                    if (items)
                                        item = await items.getDocument(tableresult.resultId);
                                }
                            }*/

                            if (item) {
                                if (itemtype == "items" && item instanceof Item) {
                                    let itemData = item.toObject();

                                    if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                                        let id = itemData._id;
                                        itemData = await EnhancedJournalSheet.createScrollFromSpell(itemData);
                                        itemData._id = id;
                                    }

                                    let oldId = itemData._id;
                                    let oldItem = items.find(i => i.flags['monks-enhanced-journal']?.parentId == oldId && oldId && i.flags['monks-enhanced-journal']?.parentId);
                                    if (oldItem && duplicate != "additional") {
                                        if (duplicate == "increase") {
                                            let oldqty = getProperty(oldItem, "flags.monks-enhanced-journal.quantity") || 1;
                                            let newqty = parseInt(oldqty) + parseInt(quantity != "" ? await getDiceRoll(quantity) : 1);
                                            setProperty(oldItem, "flags.monks-enhanced-journal.quantity", newqty);
                                        }
                                    } else {
                                        itemData._id = makeid();
                                        let sysPrice = MEJHelpers.getSystemPrice(itemData, pricename());
                                        let price = MEJHelpers.getPrice(sysPrice);
                                        let adjustment = this.object.flags["monks-enhanced-journal"].sell ?? 1;
                                        let cost = MEJHelpers.getPrice(`${price.value * adjustment} ${price.currency}`);
                                        itemData.flags['monks-enhanced-journal'] = {
                                            parentId: oldId,
                                            price: `${price.value} ${price.currency}`,
                                            cost: `${cost.value} ${cost.currency}`,
                                            quantity: quantity != "" ? await getDiceRoll(quantity) : 1
                                        };
                                        if (useFrom)
                                            setProperty(itemData, "flags.monks-enhanced-journal.from", table.name);
                                        items.push(itemData);
                                    }
                                } else if (itemtype == "actors" && item instanceof Actor) {
                                    let itemData = {
                                        _id: item.id,
                                        uuid: item.uuid,
                                        img: item.img,
                                        name: item.name,
                                        quantity: (quantity != "" ? await getDiceRoll(quantity) : 1),
                                        type: "Actor"
                                    }
                                    if (item.pack)
                                        itemData.pack = item.pack;
                                    items.push(itemData);
                                }
                            }
                        }
                    }

                    if (items.length > 0)
                        await that.object.setFlag('monks-enhanced-journal', itemtype, items);
                    if (currChanged)
                        await that.object.setFlag('monks-enhanced-journal', "currency", currency);
                }
            },
            render: (html) => {
                $('input[name="numberof"]', html).on("blur", async () => {
                    if ($('input[name="numberof"]', html).val() == "") {
                        $('input[name="numberof"]', html).val(1);
                    }
                });
                $('input[name="quantity"]', html).on("blur", () => {
                    if ($('input[name="quantity"]', html).val() == "") {
                        $('input[name="quantity"]', html).val(1);
                    }
                });
                $('select[name="rollable-table"]', html).on("change", async () => {
                    let rolltable = $('[name="rollable-table"]').val();
                    let table = await fromUuid(rolltable);
                    $('.roll-formula', html).html(table?.formula);
                });
            }
        });
    }

    _deleteItem(event) {
        let item = event.currentTarget.closest('.item');
        this.deleteItem(item.dataset.id, item.dataset.container);
    }

    deleteItem(id, container, cascade = true) {
        let data = duplicate(this.object.flags["monks-enhanced-journal"][container]);
        data.findSplice(i => i.id == id || i._id == id);
        this.object.setFlag('monks-enhanced-journal', container, data);

        if (container == "relationships" && cascade) {
            let journal = game.journal.get(id);
            if (journal && journal.pages.size > 0) {
                let page = journal.pages.contents[0];
                let data = duplicate(getProperty(page, "flags.monks-enhanced-journal.relationships") || {});
                data.findSplice(i => i.id == this.object.id || i._id == this.object.id);
                page.setFlag('monks-enhanced-journal', "relationships", data);
            }
        }
    }

    async alterItem(event) {
        $(event.currentTarget).prev().click();
        if ($(event.currentTarget).hasClass('item-hide')) {
            let li = $(event.currentTarget).closest('li.item');
            const uuid = li.data("uuid");
            let journal = await fromUuid(uuid);
            if (journal && (journal instanceof JournalEntryPage || journal.pages.size > 0)) {
                let page = journal instanceof JournalEntryPage ? journal : journal.pages.contents[0];
                let relationships = duplicate(getProperty(page, "flags.monks-enhanced-journal.relationships") || {});
                let relationship = relationships.find(r => r.id == this.object.id);
                if (relationship) {
                    relationship.hidden = $(event.currentTarget).prev().prop('checked');
                    page.setFlag('monks-enhanced-journal', "relationships", relationships);
                }
            }
        } else if ($(event.currentTarget).hasClass('item-private')) {
            let li = $(event.currentTarget).closest('li.item');
            const id = li.data("id");
            let offerings = duplicate(this.object.getFlag("monks-enhanced-journal", "offerings"));
            let offering = offerings.find(r => r.id == id);
            offering.hidden = $(event.currentTarget).prev().prop('checked');
            await this.object.setFlag('monks-enhanced-journal', "offerings", offerings);
        }
    }

    /*
    async alterRelationship(event) {
        let li = $(event.currentTarget).closest('li.item');
        const uuid = li.data("uuid");
        let journal = await fromUuid(uuid);

        if (journal) {
            if ((this.object.type == "person" && journal.type == "person") || (this.object.type == "organization" && journal.type == "organization"))
                return;
            let relationships = duplicate(journal.flags["monks-enhanced-journal"].relationships);
            let relationship = relationships.find(r => r.id == this.object.id);
            if (relationship) {
                relationship.relationship = $(event.currentTarget).val();
                journal.setFlag('monks-enhanced-journal', "relationships", relationships);
            }
        }
    }*/

    checkForChanges() {
        return this.editors?.content?.active && this.editors?.content?.mce?.isDirty();
    }

    async close(options) {
        if (options?.submit !== false) {
            if (this.checkForChanges()) {
                const confirm = await Dialog.confirm({
                    title: i18n("MonksEnhancedJournal.SaveChanges"),
                    content: `<p>${i18n("MonksEnhancedJournal.YouHaveChanges")}</p>`
                });
                if (!confirm) return false;
            }

            if (this.object.type == 'blank')
                return;

            //go through the scroll Y's and save the last position
            if (this.options.scrollY?.length) {
                const selectors = this.options.scrollY || [];
                let scrollPos = selectors.reduce((pos, sel) => {
                    const el = $(this.element).find(sel);
                    if (el.length === 1) pos[sel] = el[0].scrollTop;
                    return pos;
                }, {});
                if (this.isEditable)
                    this.object.setFlag('monks-enhanced-journal', 'scrollPos', JSON.stringify(scrollPos));
            }

            if (!this.enhancedjournal) {
                // check to see if there's a sound playing and stop it playing.
                this._stopSound(this._backgroundsound);
                delete this._backgroundsound;
                Hooks.off("globalInterfaceVolumeChanged", this._soundHook);
            }

            return super.close(options);
        }
    }

    async _onShowPlayers(event) {
        event.preventDefault();
        await this.submit();
        return Journal.showDialog(this.object);
    }

    /*
    async _onShowPlayers(event) {
        if (!event.data?.hasOwnProperty("users")) {
            let type = this.type;
            let showpic = event?.data?.options?.showpic || $('.fullscreen-image', this.element).is(':visible') || ((type == 'journalentry' || type == 'oldentry') && $('.tab.picture', this.element).hasClass('active'))
            new SelectPlayer(this, { showpic: showpic }).render(true);
        } else {
            let users = event.data.users;
            let options = event.data.options;

            let object = event.data?.object || this.object;

            if (users != undefined)
                users = users.filter(u => u.selected);
            //if we havn't picked anyone to show this to, then exit
            if (users instanceof Array && users.length == 0)
                return;

            if (!object.isOwner) throw new Error(i18n("MonksEnhancedJournal.msg.YouMayOnlyRequestToShowThoseYouOwn"));

            let args = {
                title: object.name,
                uuid: object.uuid,
                users: (users != undefined ? users.map(u => u.id) : users),
                showid: makeid()
            }
            if (options?.showpic || object?.flags["monks-enhanced-journal"]?.type == 'picture')
                args.image = object.img;

            if (!object.img && !object.content && ["base", "journalentry"].includes(object.type))
                return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotShowNoContent"));

            MonksEnhancedJournal.emit("showEntry", args);

            ui.notifications.info(format("MonksEnhancedJournal.MsgShowPlayers", {
                title: object.name,
                which: (users == undefined ? 'all players' : users.map(u => u.name).join(', '))
            }) + (options?.showpic || object?.flags["monks-enhanced-journal"]?.type == 'picture' ? ', click <a onclick="game.MonksEnhancedJournal.journal.cancelSend(\'' + args.showid + '\', ' + options?.showpic + ');event.preventDefault();">here</a> to cancel' : ''));

            if (options?.updatepermission) {
                let ownership = {};
                Object.assign(ownership, object.ownership);
                if (users == undefined)
                    ownership["default"] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                else {
                    users.forEach(user => { ownership[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER; });
                }
                object.update({ ownership: ownership });
            }
        }
    }*/

    _getSubmitData(updateData = {}) {
        const data = super._getSubmitData(updateData);
        //Fix an issue with Foundry core not retrieving all the form inputs
        for (let el of this.form.elements) {
            if (!el.name || el.disabled || (el.tagName === "BUTTON")) continue;
            const field = this.form.elements[el.name];

            // Duplicate Fields
            if (field instanceof RadioNodeList) {
                const values = [];
                for (let f of field) {
                    if (f.type === "checkbox")
                        values.push(f.checked);
                }
                if (values.length)
                    data[el.name] = values;
            }
        }

        return data;
    }

    static isLootActor(lootsheet) {
        return ['lootsheetnpc5e', 'merchantsheetnpc', 'item-piles'].includes(lootsheet);
    }

    static async assignItems(items, currency = {}, { clear = false, name = null } = {}) {
        let lootSheet = setting('loot-sheet');
        let lootentity = setting('loot-entity');
        let collection = (EnhancedJournalSheet.isLootActor(lootSheet) ? game.actors : game.journal);

        let getLootableName = (entity) => {
            //find the folder and find the next available 'Loot Entry (x)'
            let documents = (entity == undefined ? collection.filter(e => e.folder == undefined) : entity.contents || entity.pages || entity.parent.contents || entity.parent.pages);
            let previous = documents.map((e, i) =>
                parseInt(e.name.replace('Loot Entry ', '').replace('(', '').replace(')', '')) || (i + 1)
            ).sort((a, b) => { return b - a; });
            let num = (previous.length ? previous[0] + 1 : 1);

            name = `${i18n("MonksEnhancedJournal.LootEntry")}${(num > 1 ? ` (${num})` : '')}`;
            return name;
        }

        let newitems = items.map(i => {
            let item = duplicate(i);
            item._id = makeid();
            return (getProperty(item, "flags.monks-enhanced-journal.remaining") > 0 ? item : null);
        }).filter(i => i);

        if (newitems.length == 0)
            return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.NoItemsToAssign"));

        let entity;
        try {
            entity = await fromUuid(lootentity);
        } catch { }

        if (entity == undefined || entity instanceof Folder || entity instanceof JournalEntry) {
            //create the entity in the correct Folder
            if (name == undefined || name == '')
                name = getLootableName(entity);

            if ((entity instanceof Folder || entity == undefined) && collection.documentName == "JournalEntry") {
                entity = await JournalEntry.create({ folder: entity, name: name, ownership: { 'default': CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } }, { render: false });
            }

            if (EnhancedJournalSheet.isLootActor(lootSheet)) {
                const cls = collection.documentClass;
                entity = await cls.create({ folder: entity, name: name, img: 'icons/svg/chest.svg', type: 'npc', flags: { core: { 'sheetClass': (lootSheet == "lootsheetnpc5e" ? 'dnd5e.LootSheetNPC5e' : 'core.a') } }, ownership: { 'default': CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
                ui.actors.render();
                MonksEnhancedJournal.emit("refreshDirectory", { name: "actors" });
            } else {
                entity = await JournalEntryPage.create({ name: name, type: "text", flags: { "monks-enhanced-journal": { type: "loot", purchasing: "confirm" } }, ownership: { 'default': CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } }, { parent: entity, render: false });
                ui.journal.render();
                MonksEnhancedJournal.emit("refreshDirectory", { name: "journal" });
            }
        }

        if (!entity)
            return ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CouldNotFindLootEntity"));

        if (clear) {
            if (EnhancedJournalSheet.isLootActor(lootSheet)) {
                for (let item of entity.items) {
                    await item.delete();
                }
            } else {
                await entity.setFlag('monks-enhanced-journal', 'items', []);
            }
        }

        if (EnhancedJournalSheet.isLootActor(lootSheet)) {
            entity.createEmbeddedDocuments("Item", newitems);

            let newcurr = entity.system.currency || {};
            for (let curr of MonksEnhancedJournal.currencies) {
                if (currency[curr.id]) {
                    let cv = currency[curr.id];
                    if (cv.indexOf("d") != -1) {
                        let r = new Roll(cv);
                        await r.evaluate({ async: true });
                        cv = r.total;
                    } else
                        cv = parseInt(cv);
                    if (isNaN(cv))
                        cv = 0;
                    let newVal = parseInt(getValue(newcurr, curr.id) + cv);
                    setValue(newcurr, curr.id, newVal);
                }
            }

            if (Object.keys(newcurr).length > 0) {
                let data = {};
                if (currencyname() == "")
                    data = mergeObject(data, newcurr);
                else
                    data[currencyname()] = newcurr;
                entity.update({ data: data });
            }
        } else if (lootSheet == 'monks-enhanced-journal') {
            let loot = duplicate(entity.getFlag('monks-enhanced-journal', 'items') || []);

            loot = loot.concat(newitems);
            await entity.setFlag('monks-enhanced-journal', 'items', loot);

            let newcurr = entity.getFlag("monks-enhanced-journal", "currency") || {};
            for (let curr of MonksEnhancedJournal.currencies) {
                if (currency[curr.id]) {
                    let cv = currency[curr.id];
                    if (cv.indexOf("d") != -1) {
                        let r = new Roll(cv);
                        await r.evaluate({ async: true });
                        cv = r.total;
                    } else
                        cv = parseInt(cv);
                    if (isNaN(cv))
                        cv = 0;
                    newcurr[curr.id] = parseInt(getValue(newcurr, curr.id) + cv);
                }
            }
            await entity.setFlag('monks-enhanced-journal', 'currency', newcurr);
        }

        ui.notifications.info(format("MonksEnhancedJournal.ItemAddedToActor", { name: entity.name }));

        //set the currency to 0 and the remaining to 0 for all items
        for (let item of items) {
            if (getProperty(item, "flags.monks-enhanced-journal.remaining") > 0) {
                item = mergeObject(item, { flags: { "monks-enhanced-journal": { remaining: 0, received: entity.name, assigned: true } } });
            }
        }

        return items;
    }

    async _onItemSummary(event) {
        event.preventDefault();

        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");

        let itemData = (this.object.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (!itemData)
            return;

        let item = new CONFIG.Item.documentClass(itemData);
        let chatData = getProperty(item, "system.description");
        if (item.getChatData)
            chatData = item.getChatData({ secrets: false }, item);

        if (chatData instanceof Promise)
            chatData = await chatData;

        if (chatData) {
            // Toggle summary
            if (li.hasClass("expanded")) {
                let summary = li.children(".item-summary");
                summary.slideUp(200, () => summary.remove());
            } else {
                let div;
                if (game.system.id == "pf2e") {
                    var _a, _b;
                    const itemIsPhysical = item.isOfType("physical"),
                        gmVisibilityWrap = (span, visibility) => {
                            const wrapper = document.createElement("span");
                            return wrapper.dataset.visibility = visibility, wrapper.append(span), wrapper
                        },
                        rarityTag = itemIsPhysical ? (() => {
                            const span = document.createElement("span");
                            return span.classList.add("tag", item.rarity), span.innerText = game.i18n.localize(CONFIG.PF2E.rarityTraits[item.rarity]), gmVisibilityWrap(span, item.isIdentified ? "all" : "gm")
                        })() : null,
                        levelPriceLabel = itemIsPhysical && "coins" !== item.system.stackGroup ? (() => {
                            const price = item.price.value.toString(),
                                priceLabel = game.i18n.format("PF2E.Item.Physical.PriceLabel", {
                                    price
                                }),
                                levelLabel = game.i18n.format("PF2E.LevelN", {
                                    level: item.level
                                }),
                                paragraph = document.createElement("p");
                            return paragraph.dataset.visibility = item.isIdentified ? "all" : "gm", paragraph.append(levelLabel, document.createElement("br"), priceLabel), paragraph
                        })() : $(),
                        properties = null !== (_b = null === (_a = chatData.properties) || void 0 === _a ? void 0 : _a.filter((property => "string" == typeof property)).map((property => {
                            const span = document.createElement("span");
                            return span.classList.add("tag", "tag_secondary"), span.innerText = game.i18n.localize(property), itemIsPhysical ? gmVisibilityWrap(span, item.isIdentified ? "all" : "gm") : span
                        }))) && void 0 !== _b ? _b : [],
                        allTags = [rarityTag, ...Array.isArray(chatData.traits) ? chatData.traits.filter((trait => !trait.excluded)).map((trait => {
                            const span = document.createElement("span");
                            return span.classList.add("tag"), span.innerText = game.i18n.localize(trait.label), trait.description && (span.title = game.i18n.localize(trait.description), $(span).tooltipster({
                                maxWidth: 400,
                                theme: "crb-hover",
                                contentAsHTML: !0
                            })), itemIsPhysical ? gmVisibilityWrap(span, item.isIdentified || !trait.mystified ? "all" : "gm") : span
                        })) : [], ...properties].filter((tag => !!tag)),
                        propertiesElem = document.createElement("div");
                    propertiesElem.classList.add("tags", "item-properties"), propertiesElem.append(...allTags);
                    const description = chatData?.description?.value ?? item.description;
                    div = $('<div>').addClass("item-summary").append(propertiesElem, levelPriceLabel, `<div class="item-description">${description}</div>`);
                } else {
                    div = $(`<div class="item-summary">${(typeof chatData == "string" ? chatData : chatData.description.value ?? chatData.description)}</div>`);
                    if (typeof chatData !== "string") {
                        let props = $('<div class="item-properties"></div>');
                        chatData.properties.forEach(p => {
                            if (game.system.id == "pf1" && typeof p == "string" && p.startsWith(`${game.i18n.localize("PF1.ChargePlural")}:`)) {
                                let prop = p;
                                const uses = item.system?.uses;
                                if (uses) prop = `${game.i18n.localize("PF1.ChargePlural")}: ${uses.value}/${uses.max}`;
                                props.append(`<span class="tag">${prop}</span>`);
                            } else
                                props.append(`<span class="tag">${p.name || p}</span>`)
                        });
                        if (chatData.price != undefined) {
                            let price = chatData.price;
                            if (price.denomination)
                                price = `${price.value} ${price.denomination}`;
                            props.append(`<span class="tag">${i18n("MonksEnhancedJournal.Price")}: ${price}</span>`);
                        }
                        div.append(props);
                    }
                }
                li.append(div.hide());
                div.slideDown(200);
            }
            li.toggleClass("expanded");
        }
    }

    async addRelationship(relationship, cascade = true) {
        let entity = await fromUuid(relationship.uuid);

        if (!entity)
            return;

        if (!relationship.id)
            relationship.id = entity.id;

        let page = entity.pages.contents[0];
        let type = getProperty(page, "flags.monks-enhanced-journal.type");
        if (this.allowedRelationships.includes(type)) {
            let relationships = duplicate(this.object.flags["monks-enhanced-journal"].relationships || []);

            //only add one item
            if (relationships.find(t => t.id == relationship.id) != undefined)
                return;

            relationships.push(relationship);
            this.object.setFlag("monks-enhanced-journal", "relationships", relationships);

            //add the reverse relationship
            if (cascade) {
                let original = await fromUuid(relationship.uuid);
                let orgPage = original.pages.contents[0];
                MonksEnhancedJournal.fixType(orgPage);
                let sheet = orgPage.sheet;
                sheet.addRelationship({ id: this.object.parent.id, uuid: this.object.parent.uuid, hidden: false }, false);
            }
        }
    }

    async openRelationship(event) {
        let item = event.currentTarget.closest('.item');
        let journal;
        if (item.dataset.uuid) {
            journal = await fromUuid(item.dataset.uuid);
        } else {
            journal = game.journal.get(item.dataset.id);
        }
        if (!journal.testUserPermission(game.user, "LIMITED"))
            return ui.notifications.error("You don't have permissions to view this document");

        this.open(journal);
    }

    static async createScrollFromSpell(itemData) {

        // Get spell data
        const {
            actionType, description, source, activation, duration, target, range, damage, formula, save, level
        } = itemData.system;

        // Get scroll data
        const scrollUuid = `Compendium.${CONFIG.DND5E.sourcePacks.ITEMS}.${CONFIG.DND5E.spellScrollIds[level]}`;
        const scrollItem = await fromUuid(scrollUuid);
        const scrollData = scrollItem.toObject();
        delete scrollData._id;

        // Split the scroll description into an intro paragraph and the remaining details
        const scrollDescription = scrollData.system.description?.value;
        const pdel = "</p>";
        const scrollIntroEnd = scrollDescription.indexOf(pdel);
        const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
        const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);

        // Create a composite description from the scroll description and the spell details
        const desc = `${scrollIntro}<hr/><h3>${itemData.name} (Level ${level})</h3><hr/>${description.value}<hr/><h3>Scroll Details</h3><hr/>${scrollDetails}`;

        // Create the spell scroll data
        const spellScrollData = foundry.utils.mergeObject(scrollData, {
            name: `${game.i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`,
            img: itemData.img,
            system: {
                description: { value: desc.trim() }, source, actionType, activation, duration, target, range, damage, formula,
                save, level
            }
        });
        return spellScrollData;
    }

    collapseItemSection(event) {
        let header = $(event.currentTarget);
        let ul = header.next();

        if (ul.prop("tagName") == "UL") {
            let that = this;
            if (header.hasClass("collapsed")) {
                header.removeClass("collapsed");
                return new Promise(resolve => {
                    ul.slideDown(200, () => {
                        //icon.removeClass("fa-caret-down").addClass("fa-caret-up");
                        that.object._itemList[header.data("id")] = false;
                        return resolve(false);
                    });
                });
            } else {
                header.addClass("collapsed");
                return new Promise(resolve => {
                    ul.slideUp(200, () => {
                        //icon.removeClass("fa-caret-up").addClass("fa-caret-down");
                        that.object._itemList[header.data("id")] = true;
                        return resolve(true);
                    });
                });
            }
        }
    }

    makeOffer() {
        new MakeOffering(this.object, this).render(true);
    }

    cancelOffer(event) {
        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");

        if (game.user.isGM || this.object.isOwner) {
            let offerings = duplicate(this.object.getFlag("monks-enhanced-journal", "offerings"));
            let offering = offerings.find(r => r.id == id);
            offering.hidden = true;
            offering.state = "cancelled";
            this.object.setFlag('monks-enhanced-journal', "offerings", offerings);
        } else
            MonksEnhancedJournal.emit("cancelOffer", { id: id, uuid: this.object.uuid });
    }

    async acceptOffer(event) {
        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");

        let offerings = duplicate(this.object.getFlag("monks-enhanced-journal", "offerings"));
        let offer = offerings.find(r => r.id == id);
        if (!offer)
            return;

        offer.state = "accepted";

        let offering = duplicate(offer);

        let actor = game.actors.get(offering.actor.id);
        if (!actor) {
            ui.notifications.error("Actor no longer exists, cannot accept this offering");
            return;
        }

        //confirm that there's enough currency and that the items still exist
        for (let item of offering.items) {
            item.actor = actor;
            if (item.actorId != offering.actorId) {
                item.actor = game.actors.get(item.actorId);

                if (!item.actor) {
                    ui.notifications.error(`Actor ${item.actorName} no longer exists, cannot accept this offering`);
                    return;
                }
            }

            item.item = item.actor.items.get(item.id);
            if (!item.item) {
                ui.notifications.error(`Item ${item.itemName} no longer exists, cannot accept this offering`);
                return;
            }

            item.max = getValue(item.item.system, quantityname());
            if (item.qty > item.max) {
                ui.notifications.error(`Not enough of ${item.name} exists, cannot accept this offering`);
                return;
            }
        }

        // If we've made it here then we're good to process this offer
        let destActor;
        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        if (actorLink) 
            destActor = game.actors.find(a => a.id == actorLink.id);

        for (let [k, v] of Object.entries(offering.currency)) {
            this.addCurrency(actor, k, -v);
            if (destActor)
                this.addCurrency(destActor, k, v);
        }

        for (let item of offering.items) {
            if (destActor) {
                let itemData = duplicate(item.item);
                delete itemData._id;
                let itemQty = getValue(itemData, quantityname(), 1);
                setValue(itemData, quantityname(), item.qty * itemQty);
                let sheet = destActor.sheet;
                sheet._onDropItem({ preventDefault: () => { } }, { type: "Item", uuid: `${this.object.uuid}.Items.${item.item._id}`, data: itemData });
            }
            if (item.qty == item.max) {
                await item.item.delete();
            } else {
                let qty = item.max - item.qty;
                let update = { system: {} };
                update.system[quantityname()] = item.item.system[quantityname()];
                setValue(update, quantityname(), qty);
                await item.item.update(update);
            }
        }

        this.object.setFlag('monks-enhanced-journal', "offerings", offerings);
    }

    rejectOffer(event) {
        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");

        let offerings = duplicate(this.object.getFlag("monks-enhanced-journal", "offerings"));
        let offering = offerings.find(r => r.id == id);
        offering.state = "rejected";
        this.object.setFlag('monks-enhanced-journal', "offerings", offerings);
    }

    scaleImage(event) {
        let wheel = (-event.originalEvent.wheelDelta || event.originalEvent.deltaY || event.originalEvent.detail);

        let size = parseInt($(event.currentTarget).data("size") ?? 100);
        size += (wheel < 0 ? -5 : 5);
        size = Math.max(100, size);

        console.log(size);

        $(event.currentTarget).data("size", size);
        $("img", event.currentTarget).css({ "transform": `scale(${size / 100})` });
    }

    async splitJournal() {
        let ctrl = window.getSelection().baseNode?.parentNode;

        if (ctrl == undefined) {
            ui.notifications.info(i18n("MonksEnhancedJournal.NoTextSelected"));
            return;
        }

        //make sure this is editor content selected
        if ($(ctrl).closest('div.editor-content').length > 0) {
            var selection = window.getSelection().getRangeAt(0);
            var selectedText = selection.extractContents();
            let selectedHTML = $('<div>').append(selectedText);
            if (selectedHTML.html() != '') {
                let title = $('h1,h2,h3,h4', selectedHTML).first().text() || i18n("MonksEnhancedJournal.ExtractedJournalEntry");

                //create a new Journal entry in the same folder as the current object
                //set the content to the extracted text (selectedHTML.html()) and use the title
                let type = getProperty(this.object, "flags.monks-enhanced-journal.type");
                if (type == "base" || type == "oldentry") type = "journalentry";
                let types = MonksEnhancedJournal.getDocumentTypes();
                if (types[type]) {
                    let newentry = await JournalEntry.create({ name: title, folder: this.object.parent.folder }, { render: false });
                    let data = { name: title, type: 'journalentry', text: { content: `<p>${selectedHTML.html()}</p>` } };
                    await JournalEntryPage.create(data, { parent: newentry });
                    ui.journal.render();
                    MonksEnhancedJournal.emit("refreshDirectory", { name: "journal" });

                    //add a new tab but don't switch to it
                    this.enhancedjournal.addTab(newentry, { activate: false });
                    this.enhancedjournal.render();

                    //save the current entry and refresh to make sure everything is reset
                    await this.object.update({ text: { content: $(ctrl).closest('div.editor-content').html() } });
                    if (this.enhancedjournal)
                        this.enhancedjournal.render();
                    else
                        this.render();
                }
            } else
                ui.notifications.warn(i18n("MonksEnhancedJournal.NothingSelected"));
        } else {
            ui.notifications.warn(i18n("MonksEnhancedJournal.NoEditorContent"));
        }
    }

    async copyToChat() {
        let ctrl = window.getSelection().baseNode?.parentNode;

        if (ctrl == undefined) {
            ui.notifications.info(i18n("MonksEnhancedJournal.NoTextSelected"));
            return;
        }

        //make sure this is editor content selected
        if ($(ctrl).closest('div.editor-content').length > 0) {
            var selection = window.getSelection().getRangeAt(0);
            var selectedText = selection.cloneContents();
            let selectedHTML = $('<div>').append(selectedText);
            if (selectedHTML.html() != '') {
                let messageData = {
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    content: selectedHTML.html(),
                };

                ChatMessage.create(messageData, {});
            } else
                ui.notifications.warn(i18n("MonksEnhancedJournal.NothingSelected"));
        } else {
            ui.notifications.warn(i18n("MonksEnhancedJournal.NoEditorContent"));
        }
    }

    openOfferingActor(event) {
        let id = event.currentTarget.closest(".item").dataset.actorId;
        let actor = game.actors.find(a => a.id == id);
        if (!actor)
            return;

        actor.sheet.render(true);
    }
}