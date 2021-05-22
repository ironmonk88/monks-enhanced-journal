import { makeid } from "../monks-enhanced-journal.js";
import { MonksEnhancedJournal, log, i18n, setting } from "../monks-enhanced-journal.js"
import { SubSheet, ActorSubSheet } from "../classes/EnhancedJournalEntry.js"

export class EnhancedJournalSheet extends JournalSheet {
    tabs = [];
    bookmarks = [];

    constructor(object, options = {}) {
        super(object, options);

        this.tabs = duplicate(game.user.getFlag('monks-enhanced-journal', 'tabs') || [])
            /*.map(t => {
            if(t.entityId != undefined)
                t.history = [t.entityId];
            return t;
        });*/
        this.tabs.active = () => {
            let tab = this.tabs.find(t => t.active);
            if (tab == undefined && this.tabs.length > 0)
                tab = this.tabs[0];
            return tab;
        };
        this.bookmarks = duplicate(game.user.getFlag('monks-enhanced-journal', 'bookmarks') || []);

        this.sheettabs = new Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description", callback: this.tabChange });

        this._collapsed = false;

        this.document = null;

        MonksEnhancedJournal.journal = this;

        this.sheettabs = new Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description", callback: function () { } });
    }

    static get defaultOptions() {
        let expanded = game.user.isGM || setting('allow-player');
        return mergeObject(super.defaultOptions, {
            title: "Monk's Enhanced Journal",
            classes: ["sheet", "journal-sheet", "monks-journal-sheet", `${game.system.id}`, (expanded? '' : 'condensed')],
            popOut: true,
            width: (expanded ? 1025 : 700),
            height: (expanded ? 700 : 650),
            resizable: true,
            dragDrop: [{ dragSelector: ".entity.actor,.entity.item", dropSelector: "#MonksEnhancedJournal .body" }],
            closeOnSubmit: false,
            submitOnClose: false,
            submitOnChange: true,
            viewPermission: ENTITY_PERMISSIONS.NONE
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                tabs: this.tabs,
                bookmarks: this.bookmarks,
                content: this.document,
                tree: ui.journal.tree,
                canCreate: ui.journal.constructor.cls.can(game.user, "create"),
                sidebarIcon: CONFIG[ui.journal.constructor.entity].sidebarIcon,
                user: game.user
            }, {recursive: false}
        );
    }

    checkForm() {
        let that = this;
        window.setInterval(function () {
            if (that.form == undefined)
                debugger;
        }, 10);
    }

    _render(force, options = {}) {
        MonksEnhancedJournal.journal = this;
        if (options.data) {
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
        let template = "modules/monks-enhanced-journal/templates/directory.html";
        let data = {
            tree: ui.journal.tree,
            canCreate: ui.journal.constructor.cls.can(game.user, "create"),
            sidebarIcon: CONFIG[ui.journal.constructor.entity].sidebarIcon,
            user: game.user
        };

        let html = await renderTemplate(template, data);
        html = $(html);

        $('.entity.journal', html).each(function () {
            let id = this.dataset.entityId;
            let entry = ui.journal.entities.find(e => e.id == id);
            let type = entry.getFlag('monks-enhanced-journal', 'type');
            let icon = MonksEnhancedJournal.getIcon(type);

            $('.entity-name', this).prepend($('<i>').addClass('fas fa-fw ' + icon));
        });

        $('.sidebar', this.element).empty().append(html);

        this.activateListeners(html);
    }

    activateEditor(name, options = {}, initialContent = "") {
        let custom = options.style_formats.find(s => s.title == "Custom");
        if (custom) {
            custom.items.push({block: "section", classes:"readaloud", title:"Read Aloud", wrapper: true});
        }
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
        let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'journalentry';

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

    tabChange(tab, event) {
        log('tab change', tab, event);
    }

    canBack(tab) {
        return tab.history.length > 1 && (tab.historyIdx == undefined || tab.historyIdx < tab.history.length - 1);
    }

    canForward(tab) {
        return tab.history.length > 1 && tab.historyIdx && tab.historyIdx > 0;
    }

    findEntity(entityId, text) {
        if (entityId == undefined)
            return { apps: {}, data: { flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: { msg: "MonksEnhancedJournal.OpenEntry" } } };
        else {
            let entity = game.journal.get(entityId);
            if (entity == undefined)
                entity = game.actors.get(entityId);
            if (entity == undefined)
                entity = { apps: {}, data: { name: text, flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: { msg: `Cannot find the entity: ${text}` } } };

            return entity;
        }
    }

    addTab(entity) {
        if (entity?.currentTarget != undefined)
            entity = null;

        let tab = {
            id: makeid(),
            text: entity?.data.name || 'New Tab',
            active: false,
            entityId: entity?.id,
            entity: entity || { apps: {}, data: { flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: { msg: "MonksEnhancedJournal.OpenEntry"} } },
            history: []
        };
        if (tab.entityId != undefined)
            tab.history.push(tab.entityId);
        this.tabs.push(tab);
        $('<div>')
            .addClass('journal-tab')
            .attr('title', tab.text)
            .attr('data-tabid', tab.id)
            .append(
                $('<div>')
                    .addClass('tab-content')
                    .append($('<span>').html(tab.text))
                    .append($('<div>').addClass('close').on('click', $.proxy(this.removeTab, this, tab)).append($('<i>').addClass('fas fa-times'))))
            .on('click', $.proxy(this.activateTab, this, tab))
            .insertBefore($('.tab-add', this.element));
        this.activateTab(tab);  //activating the tab should save it

        return tab;
    }

    activateTab(tab, event) {
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

        let currentTab = this.tabs.active();
        if (currentTab?.id != tab.id || this.document == undefined) {
            if (tab.entity == undefined) {
                //try to find the entity
                tab.entity = this.findEntity(tab.entityId, tab.text);
                /*
                if (tab.entityId == undefined)
                    tab.entity = { apps: {}, data: { flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: { msg: "MonksEnhancedJournal.OpenEntry"} } };
                else {
                    tab.entity = game.journal.get(tab.entityId);
                    if (tab.entity == undefined)
                        tab.entity = game.actors.get(tab.entityId);
                    if (tab.entity == undefined)
                        tab.entity = { apps: {}, data: { name: tab.text, flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: { msg: `Cannot find the entity: ${tab.text}` } } };
                }*/
            }
            this.display(tab.entity);
        }

        $('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
        $('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));

        if (currentTab?.id == tab.id)
            return false;

        log('activateTab JournalID', this.appId, this.tabs);
        if (currentTab != undefined)
            currentTab.active = false;
        tab.active = true;
        $(`.journal-tab[data-tabid="${tab.id}"]`, this.element).addClass('active').siblings().removeClass('active');
        this.saveTabs();

        return true;
    }

    updateTab(tab, entity) {
        if (tab != undefined) {
            if (tab.entityId != entity.data._id) {
                tab.text = entity.data.name;
                tab.entityId = entity.data._id;
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
                        tab.history = tab.history.slice(0, 9);
                }

                this.saveTabs();

                $(`.journal-tab[data-tabid="${tab.id}"]`, this.element).attr('title', tab.text).find('.tab-content span').html(tab.text);
            } else if (tab.entity == undefined) {
                tab.entity = entity;
            }

            $('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
            $('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));
        }

        this.display(tab.entity);
    }

    removeTab(tab, event) {
        if (tab.currentTarget != undefined) {
            tab.preventDefault();
            tab = tab.currentTarget.parentElement.parentElement.dataset.tabid;
        }
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

            if (!this.activateTab((idx >= this.tabs.length ? idx - 1 : idx)))
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

    changeHistory(event) {
        if (!$(event.currentTarget).hasClass('disabled')) {
            let dir = event.currentTarget.dataset.history;
            let tab = this.tabs.active();

            if (tab.history.length > 1) {
                tab.historyIdx = clampNumber(((tab.historyIdx == undefined ? 0 : tab.historyIdx) + (dir == 'back' ? 1 : -1)), 0, (tab.history.length - 1));

                tab.entityId = tab.history[tab.historyIdx];
                tab.entity = this.findEntity(tab.entityId, tab.text);
                /*
                tab.entity = game.journal.get(tab.entityId);
                if (tab.entity == undefined)
                    tab.entity = game.actors.get(tab.entityId);
                if (tab.entity == undefined)
                    tab.entity = { apps: {}, data: { name: tab.text, flags: { 'monks-enhanced-journal': { type: 'blank' } }, content: { msg: `Cannot find the entity: ${tab.text}` } } };
                    */

                this.saveTabs();

                this.display(tab.entity);

                $('.back-button', this.element).toggleClass('disabled', !this.canBack(tab));
                $('.forward-button', this.element).toggleClass('disabled', !this.canForward(tab));
            }
        }
    }

    addBookmark() {
        //get the current tab and save the entity and name
        let tab = this.tabs.active();

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

    activateBookmark(event) {
        let id = event.currentTarget.dataset.bookmarkId;
        let bookmark = this.bookmarks.find(b => b.id == id);
        let entity = this.findEntity(bookmark.entityId, bookmark.text);
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

        $('.title input', this.element).val(entity.data.name);

        let types = this.getEntityTypes;
        let type = (entity instanceof Actor ? 'actor' : this.entitytype);

        /*if (entity instanceof Actor) {
            const sheet = entity.sheet;
            await sheet._render(true);
            $(sheet.element).hide();

            sheet._onChangeTab = function (event, tabs, active) {
                log('clicking tab');
            }

            this.document = $('<div>').addClass(sheet.options.classes);
            this.document.append($('.window-content', sheet.element));

            $('.content', this.element).attr('entity-type', 'actor');
            $('.content form', this.element).empty().append(this.document);
            this.activateDocumentListeners($('.content form > *', this.element).get(0), 'actor');

            sheet.close();
        } else {*/
            //let types = MonksEnhancedJournal.getEntityTypes();
            //let type = this.entitytype;

            let subsheet = types[type] || JournalEntrySubSheet;

            this.subsheet = new subsheet(this.object);

        this.document = await this.subsheet.render();

            $('.content', this.element).attr('entity-type', type).attr('entity-id', this.object.id);
        $('.content form', this.element).empty().append(this.document);

        Hooks.callAll('displaySubSheet', this, this.object, this.document);

        this.subsheet.activateControls($('#journal-buttons', this.element).empty());
        //}
        log('Open entity', entity);
    }

    expandSidebar() {

    }

    collapseSidebar() {

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
                let scrollTop = $('.encounter-content', this.element).scrollTop();
                this.subsheet.addMonster(data).then(() => {
                    this.display(this.object).then(() => {
                        $('.encounter-content', this.element).scrollTop(scrollTop);
                    });
                });
            } else if (data.pack != undefined) {
                let actor = game.actors.get(data.id);
                this.open(actor);
            }
        } else if (data.type == 'Item' && (this.entitytype == 'encounter' || this.entitytype == 'quest')) {
            this.subsheet.addItem(data);
            this.display(this.object);
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
        let type = this.entitytype;

        //if (type == 'encounter')
        //    $('.sheet-body', this.element).removeClass('editing');

        let update = {};
            
        const formData = expandObject(this._getSubmitData());

        if (formData.name)
            update.name = formData.name;

        if (formData.content) {
            if (this.entitytype == 'journalentry') {
                update.content = formData.content;
            } else {
                update.content = this.object.data.content;
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
        }

        if (!this.isEditable && formData.userdata) {
            //need to have the GM update this, but only the user notes
            game.socket.emit(MonksEnhancedJournal.SOCKET, {
                action: "saveUserData",
                args: {
                    entityId: this.object.id,
                    userId: game.user.id,
                    userdata: formData.userdata
                }
            });
            return new Promise(() => { });
        }else
            return this.object.update(update);
    }

    saveData() {
        this.object.update({ content: JSON.stringify(this.object.data.content) });
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.findSplice(b => b.class == "entry-text");
        buttons.findSplice(b => b.class == "entry-image");
        return buttons;
    }

    async _onShowPlayers(event) {
        if (this.entitytype == 'picture') {
            game.socket.emit("shareImage", {
                image: this.content.img,
                title: this.object.name,
                uuid: this.object.uuid
            });
            ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                mode: "image",
                title: this.object.name,
                which: "all"
            }));
        } else if (this.entitytype == 'slideshow') {
            //start a slideshow?
        } else
            super._onShowPlayers(event);
    }

    _onEditImage(event) {
        if (this.object.permission < ENTITY_PERMISSIONS.OWNER)
            return null;

        const fp = new FilePicker({
            type: "image",
            current: this.object.data.content.img,
            callback: path => {
                event.currentTarget.src = path;
                //I have no idea why the form gets deleted sometimes, but add it back.
                if (this.form == undefined)
                    this.form = $('.monks-enhanced-journal .body > .content form', this.element).get(0);
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
                name: "Delete",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    const bookmark = this.bookmarks.find(b => b.id === li[0].dataset.bookmarkId);
                    this.removeBookmark(bookmark);
                }
            }
        ]);
    }

    activateListeners(html) {   
        super.activateListeners(html);

        this._contextMenu(html);

        $('.sidebar-toggle', html).on('click', function () { if (this._collapsed) this.expandSidebar(); else this.collapseSidebar(); });

        html.find('.add-bookmark').click(this.addBookmark.bind(this));
        html.find('.bookmark-button:not(.add-bookmark)').click(this.activateBookmark.bind(this));

        html.find('.tab-add').click(this.addTab.bind(this));
        html.find('.journal-tab').click(this.activateTab.bind(this));
        html.find('.journal-tab .close').click(this.removeTab.bind(this));

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

        ui.journal._contextMenu.call(ui.journal, html);

        const directory = html.find(".directory-list");
        const entries = directory.find(".directory-item");

        // Directory-level events
        html.find('.create-entity').click(ev => ui.journal._onCreateEntity(ev));
        html.find('.collapse-all').click(ui.journal.collapseAll.bind(this));
        html.find(".folder .folder .folder .create-folder").remove(); // Prevent excessive folder nesting
        if (game.user.isGM) html.find('.create-folder').click(ev => ui.journal._onCreateFolder(ev));

        // Entry-level events
        directory.on("click", ".entity-name", ui.journal._onClickEntityName.bind(ui.journal));
        directory.on("click", ".folder-header", ui.journal._toggleFolder.bind(this));
        //this._contextMenu(html);

        $('.back-button, .forward-button').toggle(game.user.isGM || setting('allow-player')).on('click', $.proxy(this.changeHistory, this));

        // Intersection Observer
        const observer = new IntersectionObserver(ui.journal._onLazyLoadImage.bind(this), { root: directory[0] });
        entries.each((i, li) => observer.observe(li));
    }

    addResizeObserver(html) {
        new ResizeObserver(function (obs) {
            log('resize observer', obs);
            $(obs[0].target).toggleClass('flexcol', obs[0].contentRect.width < 900).toggleClass('flexrow', obs[0].contentRect.width >= 900);
        }).observe($('.encounter-content', html).get(0));
    }
}