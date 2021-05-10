import { registerSettings } from "./settings.js";
import { EnhancedJournalSheet } from "./apps/enhanced-journal.js"
import { SlideshowDisplay } from "./apps/slideshow-display.js"
import { SubSheet, ActorSubSheet, EncounterSubSheet, JournalEntrySubSheet, PersonSubSheet, PictureSubSheet, PlaceSubSheet, QuestSubSheet, SlideshowSubSheet } from "./classes/EnhancedJournalEntry.js"

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
            journalentry: JournalEntrySubSheet,
            slideshow: SlideshowSubSheet,
            picture: PictureSubSheet,
            person: PersonSubSheet,
            place: PlaceSubSheet,
            quest: QuestSubSheet,
            encounter: EncounterSubSheet
        };
    }

    static getTypeLabels() {
        return {
            journalentry: "MonksEnhancedJournal.journalentry",
            slideshow: "MonksEnhancedJournal.slideshow",
            picture: "MonksEnhancedJournal.picture",
            person: "MonksEnhancedJournal.person",
            place: "MonksEnhancedJournal.place",
            quest: "MonksEnhancedJournal.quest",
            encounter: "MonksEnhancedJournal.encounter"
        };
    }

    static init() {
        log('Initializing Monks Enhanced Journal');
        registerSettings();

        MonksEnhancedJournal.SOCKET = "module.monks-enhanced-journal";

        MonksEnhancedJournal._oldSheetClass = CONFIG.JournalEntry.sheetClass;
        CONFIG.JournalEntry.sheetClass = EnhancedJournalSheet;

        let types = MonksEnhancedJournal.getEntityTypes();
        game.system.entityTypes.JournalEntry = Object.keys(types);
        CONFIG.JournalEntry.typeLabels = MonksEnhancedJournal.getTypeLabels();

        const oldOnClickEntityName = JournalDirectory._onClickEntityName;
        function onClickEntityName(event) {
            event.preventDefault();
            const element = event.currentTarget;
            const entityId = element.parentElement.dataset.entityId;
            const entity = this.constructor.collection.get(entityId);

            //if the enhanced journal is already open, then just pass it the new object, if not then let it render as normal
            if (MonksEnhancedJournal.journal != undefined) {
                log('JournalID', MonksEnhancedJournal.journal.appId, MonksEnhancedJournal.journal.tabs);
                MonksEnhancedJournal.journal.open(entity);
            }
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

        Handlebars.registerHelper({ selectGroups: MonksEnhancedJournal.selectGroups});
    }

    static selectGroups(choices, options) {
        const localize = options.hash['localize'] ?? false;
        let selected = options.hash['selected'] ?? null;
        let blank = options.hash['blank'] || null;
        selected = selected instanceof Array ? selected.map(String) : [String(selected)];

        // Create an option
        const option = (key, label) => {
            if (localize) label = game.i18n.localize(label);
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
                Object.entries(group.groups).forEach(e => option(...e));
                html += `</optgroup>`;
            }
        } else {
            Object.entries(group.groups).forEach(e => option(...e));
        }
        return new Handlebars.SafeString(html);
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
        game.socket.on(MonksEnhancedJournal.SOCKET, MonksEnhancedJournal.onMessage);

        $('<div>').attr('id', 'slideshow-canvas').addClass('monks-enhanced-journal flexrow').append($('<div>').addClass('slideshow-container flexcol playing').append($('<div>').addClass('slide-showing'))).append($('<div>').addClass('slide-padding')).appendTo($('body'));
        new SlideshowDisplay().render(true);
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

    static onMessage(data) {
        MonksEnhancedJournal[data.action].call(MonksEnhancedJournal, data.args);
    }

    static saveUserData(data) {
        if (game.user.isGM) {
            let entity = game.journal.get(data.entityId);
            let content = JSON.parse(entity.data.content);
            content[data.userId] = data.userdata;

            entity.update({ content: JSON.stringify(content) });
        }
    }

    static async playSlideshow(data) {
        if (!game.user.isGM) {
            //clear any old ones
            if (MonksEnhancedJournal.slideshow != undefined)
                MonksEnhancedJournal.stopSlideshow();

            let slideshow = game.journal.find(e => e.id == data.id);
            if (slideshow) {
                MonksEnhancedJournal.slideshow = {
                    id: data.id,
                    object: slideshow,
                    content: JSON.parse(slideshow.data.content)
                }

                let showas = MonksEnhancedJournal.slideshow.content.showas;
                if (showas == 'window') {
                    //if for some reason the slideshow window isn't there, recreate it
                    if ($('#slideshow-display').length == 0) {
                        let display = new SlideshowDisplay();
                        await display._render(true);
                        /*
                         *             width: ($('body').width() * 0.75),
            height: ($('body').height() * 0.75),
            left: ($('body').width() * 0.125),
            top: ($('body').height() * 0.125),*/
                    }
                    MonksEnhancedJournal.slideshow.element = $('#slideshow-display');
                } else {
                    MonksEnhancedJournal.slideshow.element = $('#slideshow-canvas');
                    $('.slide-padding', MonksEnhancedJournal.slideshow.element).css({ flex: '0 0 ' + $('#sidebar').width() + 'px' });
                    MonksEnhancedJournal.slideshow.element.toggleClass('fullscreen', showas == 'fullscreen');
                }
                MonksEnhancedJournal.slideshow.element.addClass('active');

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
                let newSlide = MonksEnhancedJournal.createSlide(slide, $('.slide-showing', MonksEnhancedJournal.slideshow.element));
                newSlide.css({ opacity: 0 }).animate({ opacity: 1 }, 1000, 'linear');
            }
        }
    }

    static stopSlideshow(data) {
        if (!game.user.isGM) {
            if (MonksEnhancedJournal.slideshow != undefined) {
                MonksEnhancedJournal.slideshow.element.removeClass('active');
                delete MonksEnhancedJournal.slideshow;
            }
        }
    }

    static createSlide(slide, container) {
        let background = '';
        if (slide.background?.color == '')
            background = `background-image:url(\'${slide.img}\');`;
        else
            background = `background-color:${slide.background?.color}`;

        let textBackground = hexToRGBAString(colorStringToHex(slide.text?.background || '#000000'), 0.5);

        return $('<div>').addClass("slide").attr('data-slide-id', slide.id)
            .append($('<div>').addClass('slide-background').append($('<div>').attr('style', background)))
            .append($('<img>').attr('src', slide.img))
            .append($('<div>').addClass('slide-text flexcol').css({ 'text-align': slide.text?.align, color: slide.text?.color })
                .append($('<div>').addClass('text-upper').append($('<div>').css({ 'background-color': textBackground }).html(slide.text?.valign == 'top' ? slide.text?.content : '')))
                .append($('<div>').addClass('text-middle').append($('<div>').css({ 'background-color': textBackground }).html(slide.text?.valign == 'middle' ? slide.text?.content : '')))
                .append($('<div>').addClass('text-lower').append($('<div>').css({ 'background-color': textBackground }).html(slide.text?.valign == 'bottom' ? slide.text?.content : '')))
            )
            .appendTo(container);
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
    //if (MonksEnhancedJournal.journal)
    //    MonksEnhancedJournal.journal.render(true);    //this is causing an uneccessary refresh
    //+++ this should call a refresh to the side bar only
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