import { makeid } from "../monks-enhanced-journal.js";
import { MonksEnhancedJournal, log, i18n, setting } from "../monks-enhanced-journal.js"
import { SubSheet, ActorSubSheet, JournalEntrySubSheet } from "../classes/EnhancedJournalEntry.js"
import { SelectPlayer } from "./selectplayer.js";

export class EnhancedJournalSheet extends JournalSheet {
    tabs = [];
    bookmarks = [];
    searchresults = [];
    searchpos = 0;
    lastquery = '';
    _imgcontext = null;

    constructor(object, options = {}) {
        super(object, options);

        this.tabs = duplicate(game.user.getFlag('monks-enhanced-journal', 'tabs') || [])
            /*.map(t => {
            if(t.entityId != undefined)
                t.history = [t.entityId];
            return t;
        });*/
        this.tabs.active = (findone = true) => {
            let tab = this.tabs.find(t => t.active);
            if (findone) {
                if (tab == undefined && this.tabs.length > 0)
                    tab = this.tabs[0];
            }
            return tab;
        };
        this.bookmarks = duplicate(game.user.getFlag('monks-enhanced-journal', 'bookmarks') || []);

        this.sheettabs = new Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description", callback: this.tabChange });

        this._collapsed = false;

        this.subdocument = null;

        if (MonksEnhancedJournal.journal == undefined)
            MonksEnhancedJournal.journal = this;

        this.sheettabs = new Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description", callback: function () { } });

        //this.dirDrag = this._createDragDropHandlers();
    }

    static get defaultOptions() {
        let expanded = game.user.isGM || setting('allow-player');
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.Title"),
            classes: ["sheet", "journal-sheet", "monks-journal-sheet", `${game.system.id}`, (expanded? '' : 'condensed')],
            popOut: true,
            width: (expanded ? 1025 : 700),
            height: (expanded ? 700 : 650),
            resizable: true,
            dragDrop: [
                { dragSelector: ".entity.actor", dropSelector: "#MonksEnhancedJournal .body" },
                { dragSelector: ".entity.item", dropSelector: "#MonksEnhancedJournal .body" },
                { dragSelector: ".encounter-items .item-list .item", dropSelector: "null" },
                { dragSelector: ".reward-items .item-list .item", dropSelector: "null" }],
            closeOnSubmit: false,
            submitOnClose: false,
            submitOnChange: true,
            viewPermission: CONST.ENTITY_PERMISSIONS.NONE,
            scrollY: ["ol.directory-list",".encounter-content"]
        });
    }

    getData(options) {
        const cfg = CONFIG["JournalEntry"];
        return mergeObject(super.getData(options),
            {
                tabs: this.tabs,
                bookmarks: this.bookmarks,
                content: this.subdocument,
                tree: ui.journal.tree,
                canCreate: cfg.documentClass.canUserCreate(game.user),
                sidebarIcon: cfg.sidebarIcon,
                user: game.user
            }, {recursive: false}
        );
    }

    /*_createDragDropHandlers() {
        return [{ dragSelector: ".directory-item", dropSelector: ".directory-list" }].map(d => {
            d.permissions = {
                dragstart: ui.journal._canDragStart.bind(ui.journal),
                drop: ui.journal._canDragDrop.bind(ui.journal)
            };
            d.callbacks = {
                dragstart: ui.journal._onDragStart.bind(ui.journal),
                dragover: ui.journal._onDragOver.bind(ui.journal),
                drop: ui.journal._onDrop.bind(ui.journal)
            };
            return new DragDrop(d);
        });
    }*/

    checkForm() {
        let that = this;
        window.setInterval(function () {
            if (that.form == undefined)
                debugger;
        }, 10);
    }

    _inferDefaultMode() {
        return "text";
    }

    _render(force, options = {}) {
        if (MonksEnhancedJournal.journal == undefined)
            MonksEnhancedJournal.journal = this;

        if (options.action != 'create' && (options.data || MonksEnhancedJournal.journal._element != null)) {
            return new Promise((resolve, reject) => {
                if (this.subsheet != undefined)
                    this.subsheet.refresh();

                if (this.form == undefined)
                    this.form = $('.monks-enhanced-journal .body > .content form', this.element).get(0);
                //this is an entity update, but we don't want to update the entire window because of it.
                //this.display(this.object); //+++is this needed?
            });
        }

        return super._render(force, options).then(() => {
            /*
            $('#journal-directory .entity.journal', this.element).each(function () {
                let id = this.dataset.entityId;
                let entry = ui.journal.entities.find(e => e.id == id);
                let type = entry.getFlag('monks-enhanced-journal', 'type');
                let icon = MonksEnhancedJournal.getIcon(type);

                $('.entity-name', this).prepend($('<i>').addClass('fas fa-fw ' + icon));
            });*/

            this.renderDirectory();
        })
    }

    async _renderInner(...args) {
        log('render inner:', ...args);
        return super._renderInner(...args);
    }

    async renderDirectory() {
        const cfg = CONFIG["JournalEntry"];
        let template = "modules/monks-enhanced-journal/templates/directory.html";
        let data = {
            tree: ui.journal.tree,
            canCreate: cfg.documentClass.canUserCreate(game.user),
            sidebarIcon: cfg.sidebarIcon,
            user: game.user
        };

        this._saveScrollPositions($('#journal-directory'));

        let html = await renderTemplate(template, data);
        html = $(html);

        $('.entity.journal', html).each(function () {
            let id = this.dataset.entityId;
            let entry = ui.journal.entities.find(e => e.id == id);
            let type = entry.getFlag('monks-enhanced-journal', 'type');
            let icon = MonksEnhancedJournal.getIcon(type);

            $('.entity-name', this).prepend($('<i>').addClass('fas fa-fw ' + icon));

            if (type == 'quest')
                $(this).attr('status', entry.getFlag('monks-enhanced-journal', 'status'));
        });

        $('.sidebar', this.element).empty().append(html);

        if (game.modules.get("forien-quest-log")?.active && !game.settings.get("forien-quest-log", 'showFolder')) {
            let folder = game.journal.directory.folders.find(f => (f.name == '_fql_quests' && f.parent == null));
            let elem = html.find(`.folder[data-folder-id="${folder.id}"]`);
            elem.remove();
        }

        this.activateDirectoryListeners(html);

        this._restoreScrollPositions($('#journal-directory'));
    }

    activateEditor(name, options = {}, initialContent = "") {
        let editor = this.editors[name]
        if (editor?.options?.style_formats == undefined)
            options.style_formats = [...CONFIG.TinyMCE.style_formats];

        let custom = editor?.options?.style_formats?.find(s => s.title == "Custom");
        if (custom) {
            let readaloud = custom.items.find(s => s.title == "Read Aloud");
            if(!readaloud)
                custom.items.push({ block: "section", classes: "readaloud", title: "Read Aloud", wrapper: true });
        }

        if (editor?.options?.content_css == undefined)
            options.content_css = [...CONFIG.TinyMCE.content_css];

        if (options.content_css) {
            if (options.content_css.find(c => c == 'modules/monks-enhanced-journal/css/editor.css') == undefined)
                options.content_css.push('modules/monks-enhanced-journal/css/editor.css');

            if (game.modules.get("polyglot")?.active && options.content_css.find(c => c == 'modules/polyglot/css/polyglot.css') == undefined)
                options.content_css.push('modules/polyglot/css/polyglot.css');
        }

        $('.editor .editor-content', this.element).unmark();

        super.activateEditor(name, options, initialContent);
    }

    get id() {
        return "MonksEnhancedJournal";
    }

    get template() {
        return "modules/monks-enhanced-journal/templates/main.html";
    }

    get getEntityTypes() {
        return mergeObject(MonksEnhancedJournal.getEntityTypes(), {
            actor: ActorSubSheet,
            blank: SubSheet
        });
    }

    get entitytype() {
        if (this.object instanceof Actor)
            return 'actor';

        let flags = this.object.data?.flags;
        let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'oldentry';

        if (this.object?.folder?.name == '_fql_quests')
            type = 'quest';

        return type;
    }

    get title() {
        return game.i18n.localize(this.options.title);
    }

    async close(options) {
        if (options?.submit !== false) {
            MonksEnhancedJournal.journal = null;
            //const states = Application.RENDER_STATES;
            //this.directory._state = states.CLOSED;
            //delete ui.windows[this.directory.appId];
            super.close(options);
        }
    }

    getRecent() {
        return (game.user.getFlag("monks-enhanced-journal", "_recentlyViewed") || []).map(r => {
            return mergeObject(r, { img: MonksEnhancedJournal.getIcon(r.type)});
        });
    }

    getCommon() {
        return [];
    }

    tabChange(tab, event) {
        log('tab change', tab, event);
    }

    canBack(tab) {
        return tab.history?.length > 1 && (tab.historyIdx == undefined || tab.historyIdx < tab.history.length - 1);
    }

    canForward(tab) {
        return tab.history?.length > 1 && tab.historyIdx && tab.historyIdx > 0;
    }

    async findEntity(entityId, text) {
        if (entityId == undefined)
            return { apps: {}, data: { flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: "", recent: this.getRecent(), common: this.getCommon() }, ignore: true };
        else {
            let entity;
            if (entityId.indexOf('.') >= 0)
                entity = await fromUuid(entityId);
            else {
                if (entity == undefined)
                    entity = game.journal.get(entityId);
                if (entity == undefined)
                    entity = game.actors.get(entityId);
            }
            if (entity == undefined)
                entity = { apps: {}, data: { name: text, flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: `${i18n("MonksEnhancedJournal.CannotFindEntity")}: ${text}`, recent: this.getRecent(), common: this.getCommon() }, ignore: true };

            return entity;
        }
    }

    async deleteEntity(entityId){
        //an entity has been deleted, what do we do?
        for (let tab of this.tabs) {
            if (tab.entityId == entityId)
                tab.entity = await this.findEntity('', tab.text); //I know this will return a blank one, just want to maintain consistency

            //remove it from the history
            tab.history = tab.history.filter(h => h != entityId);

            if (tab.active)
                this.display(tab.entity);
        }

        this.saveTabs();
    }

    addTab(entity) {
        if (entity?.currentTarget != undefined)
            entity = null;

        let tab = {
            id: makeid(),
            text: entity?.data.name || i18n("MonksEnhancedJournal.NewTab"),
            active: false,
            entityId: entity?.uuid,
            entity: entity || { apps: {}, data: { flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: "", recent: this.getRecent(), common: this.getCommon() }, ignore: true },
            history: []
        };
        if (tab.entityId != undefined)
            tab.history.push(tab.entityId);
        this.tabs.push(tab);
        $('<div>')
            .addClass('journal-tab flexrow')
            .attr('title', tab.text)
            .attr('data-tabid', tab.id)
            .append($('<div>').addClass('tab-content').html(tab.text))
            .append($('<div>').addClass('close').click(this.removeTab.bind(this, tab)).append($('<i>').addClass('fas fa-times')))
            .on('click', $.proxy(this.activateTab, this, tab))
            .insertBefore($('.tab-add', this.element));
        this.activateTab(tab);  //activating the tab should save it

        return tab;
    }

    async activateTab(tab, event) {
        if (tab == undefined)
            tab = this.addTab();

        if (event != undefined)
            event.preventDefault();

        if (tab.currentTarget != undefined) {
            tab.preventDefault();
            tab = tab.currentTarget.dataset.tabid;
        }
        if (typeof tab == 'string')
            tab = this.tabs.find(t => t.id == tab);
        else if (typeof tab == 'number')
            tab = this.tabs[tab];

        let currentTab = this.tabs.active(false);
        if (currentTab?.id != tab.id || this.subdocument == undefined) {
            if (tab.entity == undefined) {
                //try to find the entity
                tab.entity = await this.findEntity(tab.entityId, tab.text);
            }
            
        }

        log('activateTab JournalID', this.appId, this.tabs);
        
        if (currentTab?.id == tab.id) {
            this.display(tab.entity);
            this.updateHistory();
            return false;
        }

        if (currentTab != undefined)
            currentTab.active = false;
        tab.active = true;

        $('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
        $('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));

        $(`.journal-tab[data-tabid="${tab.id}"]`, this.element).addClass('active').siblings().removeClass('active');

        this.display(tab.entity);

        this.saveTabs();

        this.updateHistory();

        return true;
    }

    updateTab(tab, entity) {
        if (tab != undefined) {
            if (tab.entityId != entity.uuid) {
                tab.text = entity.data.name;
                tab.entityId = entity.uuid;
                tab.entity = entity;

                if ((game.user.isGM || setting('allow-player')) && tab.entityId != undefined) {    //only save the history if the player is a GM or they get the full journal experience... and if it's not a blank tab
                    if (tab.history == undefined)
                        tab.history = [];
                    if (tab.historyIdx != undefined) {
                        tab.history = tab.history.slice(tab.historyIdx);
                        tab.historyIdx = 0;
                    }
                    tab.history.unshift(tab.entityId);

                    if (tab.history.length > 10)
                        tab.history = tab.history.slice(0, 10);
                }

                this.saveTabs();

                //$(`.journal-tab[data-tabid="${tab.id}"]`, this.element).attr('title', tab.text).find('.tab-content').html(tab.text);
            } else if (tab.entity == undefined) {
                tab.entity = entity;
            }

            $('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
            $('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));
            this.updateHistory();
        }

        this.display(tab.entity);
    }

    removeTab(tab, event) {
        if (typeof tab == 'string')
            tab = this.tabs.find(t => t.id == tab);

        let idx = this.tabs.findIndex(t => t.id == tab.id);
        if (idx >= 0) {
            this.tabs.splice(idx, 1);
            $('.journal-tab[data-tabid="' + tab.id + '"]', this.element).remove();
        }

        if (this.tabs.length == 0)
            this.addTab();
        else {
            let nextIdx = (idx >= this.tabs.length ? idx - 1 : idx);
            if (!this.activateTab(nextIdx))
                this.saveTabs();
        }

        if (event != undefined)
            event.preventDefault();
    }

    saveTabs() {
        let update = this.tabs.map(t => {
            let entity = t.entity;
            delete t.entity;
            let tab = duplicate(t);
            t.entity = entity;
            delete tab.element;
            delete tab.entity;
            //delete tab.history;  //technically we could save the history if it's just an array of ids
            //delete tab.historyIdx;
            delete tab.userdata;
            return tab;
        });
        game.user.setFlag('monks-enhanced-journal', 'tabs', update);
    }

    navigateHistory(event) {
        if (!$(event.currentTarget).hasClass('disabled')) {
            let dir = event.currentTarget.dataset.history;
            let tab = this.tabs.active();

            if (tab.history.length > 1) {
                let result = true;
                let idx = 0;
                do {
                    idx = ((tab.historyIdx == undefined ? 0 : tab.historyIdx) + (dir == 'back' ? 1 : -1));
                    result = this.changeHistory(idx);
                } while (!result && idx > 0 && idx < tab.history.length )
            }
        }
        event.preventDefault();
    }

    async changeHistory(idx) {
        let tab = this.tabs.active();
        tab.historyIdx = Math.clamped(idx, 0, (tab.history.length - 1));

        tab.entityId = tab.history[tab.historyIdx];
        tab.entity = await this.findEntity(tab.entityId, tab.text);

        this.saveTabs();

        this.display(tab.entity);

        $('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
        $('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));

        return (tab.entity != undefined && tab.entity.ignore !== true);
    }

    async updateHistory() {
        let index = 0;
        let tab = this.tabs.active();
        this._tabcontext.menuItems = [];

        if (tab.history == undefined)
            return;

        for (let i = 0; i < tab.history.length; i++) {
            let h = tab.history[i];
            let entity = await this.findEntity(h, '');
            if (entity != undefined && entity.ignore !== true) {
                let type = entity.getFlag('monks-enhanced-journal', 'type');
                let icon = MonksEnhancedJournal.getIcon(type);
                let item = {
                    name: entity.name || 'Unknown',
                    icon: `<i class="fas ${icon}"></i>`,
                    callback: (li) => {
                        let idx = i;
                        this.changeHistory(idx)
                    }
                }
                this._tabcontext.menuItems.push(item);
            }
        };
    }

    addBookmark() {
        //get the current tab and save the entity and name
        let tab = this.tabs.active();

        if (tab?.entityId == undefined)
            return;

        if (this.bookmarks.find(b => b.entityId == tab.entityId) != undefined) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.MsgOnlyOneBookmark"));
            return;
        }

        let entitytype = function(entity) {
            if (entity instanceof Actor)
                return 'actor';

            let flags = entity.data?.flags;
            let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'journalentry';

            return type;
        }

        let bookmark = {
            id: makeid(),
            entityId: tab.entityId,
            text: tab.entity.name,
            icon: MonksEnhancedJournal.getIcon(entitytype(tab.entity))
        }

        this.bookmarks.push(bookmark);

        $('<div>')
            .addClass('bookmark-button')
            .attr({ title: bookmark.text, 'data-bookmark-id': bookmark.id, 'data-entity-id': bookmark.entityId })
            .html(`<i class="fas ${bookmark.icon}"></i> ${bookmark.text}`)
            .appendTo('.bookmark-bar', this.element).get(0).click(this.activateBookmark.bind(this));

        this.saveBookmarks();
    }

    async activateBookmark(event) {
        let id = event.currentTarget.dataset.bookmarkId;
        let bookmark = this.bookmarks.find(b => b.id == id);
        let entity = await this.findEntity(bookmark.entityId, bookmark.text);
        this.open(entity);
    }

    removeBookmark(bookmark) {
        this.bookmarks.findSplice(b => b.id == bookmark.id);
        $(`.bookmark-button[data-bookmark-id="${bookmark.id}"]`, this.element).remove();
        this.saveBookmarks();
    }

    saveBookmarks() {
        let update = this.bookmarks.map(b => {
            let bookmark = duplicate(b);
            return bookmark;
        });
        game.user.setFlag('monks-enhanced-journal', 'bookmarks', update);
    }

    async open(entity, newtab) {
        //if there are no tabs, then create one
        if (this.tabs.length == 0) {
            this.addTab(entity);
        } else {
            if (!game.user.isGM && !setting('allow-player'))
                this.updateTab(this.tabs[0], entity);   //if this is a player and they're not seeing the full journal, then only ever use the first tab
            else if (newtab === true) {
                //the journal is getting created
                //lets see if we can find  tab with this entity?
                let tab = this.tabs.find(t => t.entityId == entity.data._id);
                if (tab != undefined)
                    this.activateTab(tab);
                else
                    this.addTab(entity);
            } else {
                this.updateTab(this.tabs.active(), entity);
            }
        }
    }

    /*
    gotoURL(event) {
        let ctrl = $(event.currentTarget);
        let url = ctrl.val();

        $('.content iframe', this.element).attr('src', url);
    }*/

    async display(entity) {
        this.object = entity;

        //make sure that it sticks to one EnhancedJournal, and calling sheet() has a habit of creating a new one, if this one isn't added manually
        if (this.object.apps[this.appId] == undefined)
            this.object.apps[this.appId] = this;

        let tab = this.tabs.active();
        tab.text = entity.data.name || i18n("MonksEnhancedJournal.NewTab");
        $(`.journal-tab[data-tabid="${tab.id}"]`, this.element).attr('title', tab.text).find('.tab-content').html(tab.text);

        $('.title input', this.element).val(entity.data.name);

        let types = this.getEntityTypes;
        let type = (entity instanceof Actor ? 'actor' : this.entitytype);

        /*
        try {
            let content = JSON.parse(this.object.data.content);
            let flags = this.object.data.flags['monks-enhanced-journal'];
            flags = mergeObject(flags, content);
            this.object.data.content = flags.summary;
            delete flags.summary;
            this.object.update({ 'flags.monks-enhanced-journal': flags, content: this.object.data.content});
        } catch (e) {

        }*/

        if ((game.user.isGM || setting('allow-player')) && type == 'quest' && entity.getFlag("monks-enhanced-journal", "status") == undefined) {
            if (entity.getFlag("monks-enhanced-journal", "completed") === true)
                entity.setFlag("monks-enhanced-journal", "status", 'completed');
            else if (entity.getFlag("monks-enhanced-journal", "seen") === true)
                entity.setFlag("monks-enhanced-journal", "status", 'available');
            else
                entity.setFlag("monks-enhanced-journal", "status", 'inactive');
        }

        if (entity != undefined && entity.ignore != true) {
            if (game.user.isGM || setting('allow-player'))
                entity.setFlag("monks-enhanced-journal", "_viewcount", (parseInt(entity.getFlag("monks-enhanced-journal", "_viewcount")) || 0) + 1);
            let recent = game.user.getFlag("monks-enhanced-journal", "_recentlyViewed") || [];
            recent.findSplice(e => e.id == entity.id || typeof e != 'object');
            recent.unshift({ id: entity.id, name: entity.name, type: entity.getFlag("monks-enhanced-journal", "type") });
            if (recent.length > 5)
                recent = recent.slice(0, 5);
            game.user.setFlag("monks-enhanced-journal", "_recentlyViewed", recent);
        }

        let subsheet = types[type] || JournalEntrySubSheet;

        this.subsheet = new subsheet(this.object);

        this.subdocument = await this.subsheet.render();

        this.searchpos = 0;

        $('.content', this.element).attr('entity-type', type).attr('entity-id', this.object.id);
        $('.content form', this.element).empty().append(this.subdocument);

        Hooks.callAll('displaySubSheet', this, this.object, this.subdocument);

        this.subsheet.activateControls($('#journal-buttons', this.element).empty());
        if (game.modules.get("polyglot")?.active) {
            let btn = $('.polyglot-button', this.element);
            if ($('i', btn).hasClass('fa-link')) {
                btn.click().click();  //click the button off then on again so that it refreshes the text.  Change this if polyglot ever adds an API
            }
        }
        //}
        log('Open entity', entity);
    }

    expandSidebar() {

    }

    collapseSidebar() {

    }

    _randomizePerson() {
        //randomize first name, last name, race, gender, profession
        //check first to see if the field needs to be rendomized, or if the fields are filled in
    }

    searchText(query) {
        let that = this;
        $('.editor .editor-content', this.element).unmark().mark(query, {
            wildcards: 'enabled',
            accuracy: "complementary",
            separateWordSearch: false,
            noMatch: function () {
                if (query != '')
                    $('.mainbar .navigation .search', that.element).addClass('error');
            },
            done: function (total) {
                if (query == '')
                    $('.mainbar .navigation .search', that.element).removeClass('error');
                if (total > 0) {
                    $('.mainbar .navigation .search', that.element).removeClass('error');
                    let first = $('.editor .editor-content mark:first', that.element);
                    $('.editor', that.element).parent().scrollTop(first.position().top - 10);
                }
            }
        });
    }

    requestConvert() {

    }

    convert(type) {

    }

    _onDragStart(event) {
        const li = event.currentTarget;

        const dragData = {};

        let id = li.dataset.id;
        if (li.dataset.entity == 'Item') {
            dragData.id = id;
            dragData.pack = li.dataset.pack;
            dragData.type = "Item";
            //dragData.data = item.data;
        }

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        MonksEnhancedJournal.journal._dragItem = id;
    }

    async itemDropped(id, actor) {
        let items = this.object.getFlag('monks-enhanced-journal', 'items');
        if (items) {
            let item = items.find(i => i.id == id);
            if (item) {
                item.received = actor.name;
                item.assigned = true;
                this.object.setFlag('monks-enhanced-journal', 'items', items).then(() => {
                    log('Item Dropped', item);
                    this.display(this.object);
                });
            }
        }
    }

    _onDrop(event) {
        log('drop', event);
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'Actor') {
            if (this.entitytype == 'encounter') {
                //let scrollTop = $('.encounter-content', this.element).scrollTop();
                this.subsheet.addMonster(data).then(() => {
                    this.display(this.object);/*.then(() => {
                        $('.encounter-content', this.element).scrollTop(scrollTop);
                    });*/
                });
            } else if (this.entitytype == 'person') {
                this.subsheet.addActor(data).then(() => {
                    this.display(this.object);
                });
            } else if (data.pack == undefined) {
                let actor = game.actors.get(data.id);
                this.open(actor);
            }
        } else if (data.type == 'Item' && (this.entitytype == 'encounter' || this.entitytype == 'quest')) {
            this.subsheet.addItem(data).then(() => {
                this.display(this.object);
            })
        }

        log('drop data', event, data);
    }

    _handleDropData(event, data) {
        log('handle drop data', event, data);
        return super._handleDropData(event, data);
    }

    async _updateObject(event, formData) {
        if (this._sheetMode === "image") {
            formData.name = formData.title;
            delete formData["title"];
            formData.img = formData.image;
            delete formData["image"];
        }
        return super._updateObject(event, formData);
    }

    async _onSwapMode(event, mode) {
        //don't do anything, but leave this here to prevent the regular journal page from doing anything
    }

    _onSubmit(ev) {
        //let type = this.entitytype;

        //if (type == 'encounter')
        //    $('.sheet-body', this.element).removeClass('editing');
        if ($(ev.currentTarget).hasClass('objective-status')) {
            let id = ev.currentTarget.closest('li').dataset.id;
            let objective = this.object.data.flags['monks-enhanced-journal'].objectives.find(o => o.id == id);
            if (objective) {
                objective.status = $(ev.currentTarget).is(':checked');
                return this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags['monks-enhanced-journal']});
            }
        } else {
            if (this.form == undefined)
                this.form = $('.monks-enhanced-journal .body > .content form', this.element).get(0);

            const formData = expandObject(this._getSubmitData());

            if (this.entitytype == 'quest') {
                $(`li[data-entity-id="${this.object.id}"]`, '#journal,#journal-directory').attr('status', formData.flags['monks-enhanced-journal'].status);
            }

            //let update = {};

            /*
            if (formData.name)
                update.name = formData.name;
    
            if (formData.img)
                update.img = formData.img;
    
            if (formData.content) {
                if (this.entitytype == 'oldentry' || this.entitytype == 'journalentry') {
                    update.content = formData.content;
                } else {
                    update.content = this.object.data.content;
                    if (typeof update.content == 'string')
                        update.content = JSON.parse(update.content);
                    update.content = mergeObject(update.content, formData.content, { recursive: false });
                    if (formData.userdata) {
                        update.content[game.user.id] = formData.userdata;
                    }
    
                    if (update.content.items) {
                        for (let item of update.content.items) {
                            delete item.item;
                        }
                    }
    
                    update.content = JSON.stringify(update.content);
                }
            }*/

            if (!this.isEditable && foundry.utils.getProperty(formData, 'flags.monks-enhanced-journal.' + game.user.id)) {
                //need to have the GM update this, but only the user notes
                game.socket.emit(MonksEnhancedJournal.SOCKET, {
                    action: "saveUserData",
                    args: {
                        entityId: this.object.id,
                        userId: game.user.id,
                        userdata: formData.flags["monks-enhanced-journal"][game.user.id]
                    }
                });
                return new Promise(() => { });
            } else
                return this.object.update(formData);
        }
    }

    async saveData() {
        return this.object.update({
            name: this.object.data.name,
            img: this.object.data.img,
            content: this.object.data.content,
            flags: this.object.data.flags
        });
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.findSplice(b => b.class == "entry-text");
        buttons.findSplice(b => b.class == "entry-image");
        buttons.findSplice(b => b.class == "share-image");

        buttons.unshift({
            label: i18n("MonksEnhancedJournal.Maximize"),
            class: "toggle-fullscreen",
            icon: "fas fa-expand-arrows-alt",
            onclick: async (ev) => {
                MonksEnhancedJournal.journal.fullscreen();
            },
        });

        return buttons;
    }

    findMapEntry(event) {
        let mainbar = event.currentTarget.closest('.mainbar');
        let content = $(mainbar).next();
        let id = $(content).attr('entity-id');
        //find this id on the map

        let note = canvas.scene.data.notes.find(n => {
            return n.data.entryId == id;
        });
        if (note) {
            //if (note.visible && !canvas.notes._active) canvas.notes.activate();
            canvas.animatePan({ x: note.data.x, y: note.data.y, scale: 1, duration: 250 });
        }
    }

    doShowPlayers(event) {
        if (event.shiftKey)
            this._onShowPlayers(this.object, null, { showpic: false }, event);
        else if (event.ctrlKey)
            this._onShowPlayers(this.object, null, { showpic: true }, event);
        else {
            new SelectPlayer(this.object, { showpic: $('.fullscreen-image', this.element).is(':visible')}).render(true);
        }
    }

    fullscreen() {
        if (this.element.hasClass("maximized")) {
            this.element.removeClass("maximized");
            $('.toggle-fullscreen', this.element).html(`<i class="fas fa-expand-arrows-alt"></i>${i18n("MonksEnhancedJournal.Maximize")}`);
            this.setPosition({ width: this._previousPosition.width, height: this._previousPosition.height });
            this.setPosition({ left: this._previousPosition.left, top: this._previousPosition.top });
        } else {
            this.element.addClass("maximized");
            $('.toggle-fullscreen', this.element).html(`<i class="fas fa-compress-arrows-alt"></i>${i18n("MonksEnhancedJournal.Restore")}`);
            
            this._previousPosition = duplicate(MonksEnhancedJournal.journal.position);
            this.setPosition({ left: 0, top: 0 });
            this.setPosition({ height: $('body').height(), width: $('body').width() - $('#sidebar').width() });
        }
    }

    async _onShowPlayers(object, users, options, event) {
        if(users != undefined)
            users = users.filter(u => u.selected);
        //if we havn't picked anyone to show this to, then exit
        if (users instanceof Array && users.length == 0)
            return;

        if (!object.isOwner) throw new Error("You may only request to show Journal Entries which you own.");

        let args = {
            title: object.name,
            uuid: object.uuid,
            users: (users != undefined ? users.map(u => u.id) : users),
            showid: makeid()
        }
        if (options.showpic || this.object.data.flags["monks-enhanced-journal"].type == 'picture')
            args.image = object.data.img;

        game.socket.emit(MonksEnhancedJournal.SOCKET, {
            action: "showEntry",
            args: args
        });
        ui.notifications.info(game.i18n.format("MonksEnhancedJournal.MsgShowPlayers", {
            title: object.name,
            which: (users == undefined ? 'all players' : users.map(u => u.name).join(', '))
        }) + (options.showpic || this.object.data.flags["monks-enhanced-journal"].type == 'picture' ? ', click <a onclick="game.MonksEnhancedJournal.journal.cancelSend(\'' + args.showid + '\', ' + options.showpic + ');event.preventDefault();">here</a> to cancel' : ''));

        if (options.updatepermission) {
            let permissions = {};
            Object.assign(permissions, object.data.permission);
            if (users == undefined)
                permissions["default"] = CONST.ENTITY_PERMISSIONS.OBSERVER;
            else {
                users.forEach(user => { permissions[user.id] = CONST.ENTITY_PERMISSIONS.OBSERVER; });
            }
            object.update({ permission : permissions });
        }
        /*
        if (this.entitytype == 'picture') {
            game.socket.emit("shareImage", {
                image: this.object.data.img,
                title: this.object.name,
                uuid: this.object.uuid
            });
            ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                mode: "image",
                title: this.object.name,
                which: "all"
            }));
        } else {
            super._onShowPlayers(event);
        }*/
    }

    cancelSend(id, showpic) {
        game.socket.emit(MonksEnhancedJournal.SOCKET, {
            action: "cancelShow",
            args: {
                showid: id,
                userId: game.user.id
            }
        });
    }

    _onSelectFile(selection, filePicker, event) {
        log(selection, filePicker, event);
        let updates = {};
        updates[filePicker.field.name] = selection;
        this.object.update(updates);
    }

    _onEditImage(event) {
        if (this.object.permission < CONST.ENTITY_PERMISSIONS.OWNER)
            return null;

        const fp = new FilePicker({
            type: "image",
            current: this.object.data.img,
            callback: path => {
                event.currentTarget.src = path;
                //I have no idea why the form gets deleted sometimes, but add it back.
                if (this.form == undefined)
                    this.form = $('.monks-enhanced-journal .body > .content form', this.element).get(0);
                $('img[data-edit="img"]').css({ opacity: '' });
                this._onSubmit(event, { preventClose: true });
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        })
        return fp.browse();
    }

    _contextMenu(html) {
        this._context = new ContextMenu(html, ".bookmark-button", [
            {
                name: "MonksEnhancedJournal.Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    const bookmark = this.bookmarks.find(b => b.id === li[0].dataset.bookmarkId);
                    this.removeBookmark(bookmark);
                }
            }
        ]);
        this._tabcontext = new ContextMenu(html, ".mainbar .navigation .nav-button.history", [
        ]);
        this._imgcontext = new ContextMenu(html, ".journal-body.oldentry .tab.picture", [
            {
                name: "MonksEnhancedJournal.Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    log('Remove image on old entry');
                }
            }
        ]);
        this._convertmenu = new ContextMenu(html, ".nav-button.convert", [
            {
                name: "Encounter",
                icon: '<i class="fas fa-toolbox"></i>',
                callback: li => {
                    this.object.setFlag('monks-enhanced-journal', 'type', 'encounter').then(() => {
                        MonksEnhancedJournal.journal.display(this.object);
                    });
                }
            },
            {
                name: "Journal Entry",
                icon: '<i class="fas fa-book-open"></i>',
                callback: li => {
                    this.object.setFlag('monks-enhanced-journal', 'type', 'journalentry').then(() => {
                        MonksEnhancedJournal.journal.display(this.object);
                    });
                }
            },
            {
                name: "Organization",
                icon: '<i class="fas fa-flag"></i>',
                callback: li => {
                    this.object.setFlag('monks-enhanced-journal', 'type', 'organization').then(() => {
                        MonksEnhancedJournal.journal.display(this.object);
                    });
                }
            },
            {
                name: "Person",
                icon: '<i class="fas fa-user"></i>',
                callback: li => {
                    this.object.setFlag('monks-enhanced-journal', 'type', 'person').then(() => {
                        MonksEnhancedJournal.journal.display(this.object);
                    });
                }
            },
            {
                name: "Picture",
                icon: '<i class="fas fa-image"></i>',
                callback: li => {
                    this.object.setFlag('monks-enhanced-journal', 'type', 'picture').then(() => {
                        MonksEnhancedJournal.journal.display(this.object);
                    });
                }
            },
            {
                name: "Place",
                icon: '<i class="fas fa-place-of-worship"></i>',
                callback: li => {
                    this.object.setFlag('monks-enhanced-journal', 'type', 'place').then(() => {
                        MonksEnhancedJournal.journal.display(this.object);
                    });
                }
            },
            {
                name: "Quest",
                icon: '<i class="fas fa-map-signs"></i>',
                callback: li => {
                    this.object.setFlag('monks-enhanced-journal', 'type', 'quest').then(() => {
                        MonksEnhancedJournal.journal.display(this.object);
                    });
                }
            }
        ], { eventName: 'click' });
    }

    async _onChangeInput(event) {
        let ctrl = $(event.currentTarget);
        if (ctrl.hasClass('search') && ctrl.hasClass('nav-input')) {
            event.preventDefault();
        } else
            super._onChangeInput(event);
    }

    activateDirectoryListeners(html) {   
        $('.sidebar-toggle', html).on('click', function () { if (this._collapsed) this.expandSidebar(); else this.collapseSidebar(); });

        ui.journal._contextMenu.call(ui.journal, html);

        const directory = html.find(".directory-list");
        const entries = directory.find(".directory-item");

        // Directory-level events
        html.find('.create-entity').click(ev => ui.journal._onCreateDocument(ev));
        html.find('.collapse-all').click(ui.journal.collapseAll.bind(this));
        html.find(".folder .folder .folder .create-folder").remove(); // Prevent excessive folder nesting
        if (game.user.isGM) html.find('.create-folder').click(ev => ui.journal._onCreateFolder(ev));

        // Entry-level events
        directory.on("click", ".entity-name", ui.journal._onClickEntityName.bind(ui.journal));
        directory.on("click", ".folder-header", ui.journal._toggleFolder.bind(this));
        //this._contextMenu(html);

        // Intersection Observer
        const observer = new IntersectionObserver(ui.journal._onLazyLoadImage.bind(this), { root: directory[0] });
        entries.each((i, li) => observer.observe(li));

        this._searchFilters = [new SearchFilter({ inputSelector: 'input[name="search"]', contentSelector: ".directory-list", callback: ui.journal._onSearchFilter.bind(ui.journal) })];
        this._searchFilters.forEach(f => f.bind(html[0]));

        ui.journal._dragDrop.forEach(d => d.bind(html[0]));
    }

    activateListeners(html) {
        super.activateListeners(html);

        this._contextMenu(html);

        $('.sidebar-toggle', html).on('click', function () { if (this._collapsed) this.expandSidebar(); else this.collapseSidebar(); });

        html.find('.add-bookmark').click(this.addBookmark.bind(this));
        html.find('.bookmark-button:not(.add-bookmark)').click(this.activateBookmark.bind(this));

        html.find('.tab-add').click(this.addTab.bind(this));
        html.find('.journal-tab').click(this.activateTab.bind(this));

        let that = this;
        $('.journal-tab .close').each(function () {
            let tabid = $(this).closest('.journal-tab')[0].dataset.tabid;
            let tab = that.tabs.find(t => t.id == tabid);
            $(this).click(that.removeTab.bind(that, tab));
        });

        //html.find('.navigation .show').click(this._onShowPlayers.bind(this));
        /*
        html.find('.navigation .edit').click(function () {
            if ($('div.tox-tinymce', html).length > 0) {
                //close the editor
                const name = $('.editor-content', html).attr("data-edit");
                const editor = that.editors[name];
                if (!editor || !editor.mce) throw new Error(`${name} is not an active editor name!`);
                editor.active = false;
                editor.changed = false;
                const mce = editor.mce;
                mce.remove();
                mce.destroy();
                editor.mce = null;
                $('.sheet-body', html).removeClass('editing');
            } else {
                $('.sheet-body .editor-edit', html).click();
                $('.sheet-body', html).addClass('editing');
            }
        });*/

        $('.back-button, .forward-button', html).toggle(game.user.isGM || setting('allow-player')).on('click', this.navigateHistory.bind(this));
    }

    /*addResizeObserver(html) {
        new ResizeObserver(function (obs) {
            log('resize observer', obs);
            $(obs[0].target).toggleClass('flexcol', obs[0].contentRect.width < 900).toggleClass('flexrow', obs[0].contentRect.width >= 900);
        }).observe($('.encounter-content', html).get(0));
    }*/
}