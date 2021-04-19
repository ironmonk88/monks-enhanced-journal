import { EnhancedDirectory } from "./enhanced-directory.js"
import { MonksEnhancedJournal, log, i18n, setting } from "../monks-enhanced-journal.js"

export class EnhancedJournalSheet extends JournalSheet {
    tabs = [];
    bookmarks = [];

    constructor(object, options = {}) {
        super(object, options);

        this.tabs = duplicate(game.user.getFlag('monks-enhanced-journal', 'tabs') || []);
        this.tabs.active = () => {
            return this.tabs.find(t => t.active);
        };
        this.bookmarks = duplicate(game.user.getFlag('monks-enhanced-journal', 'bookmarks') || []);

        //this.directory = new EnhancedDirectory(this);
        this.sheettabs = new Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description", callback: this.tabChange });

        this._collapsed = false;

        this.document = null;

        MonksEnhancedJournal.journal = this;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: "Monk's Enhanced Journal",
            classes: ["sheet", "journal-sheet", "monks-journal-sheet", `${game.system.id}`, (game.user.isGM || setting('allow-player') ? '' : 'condensed')],
            popOut: true,
            width: 1025,
            height: 700,
            resizable: true,
            dragDrop: [{ dragSelector: ".actor", dropSelector: "#MonksEnhancedJournal .body" }],
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

    _render(force, options = {}) {
        MonksEnhancedJournal.journal = this;
        return super._render(force, options).then(() => {
            /*if (!this.directory.rendered) {
                this.directory._render(true).then(() => {
                    $('.sidebar', this.element).empty().append(this.directory.element);
                    $('.sidebar > section', this.element).show();
                });
            }*/
            $('#journal-directory .entity.journal', this.element).each(function () {
                let id = this.dataset.entityId;
                let entry = ui.journal.entities.find(e => e.id == id);
                let type = entry.getFlag('monks-enhanced-journal', 'type');
                let icon = MonksEnhancedJournal.getIcon(type);

                $('.entity-name', this).prepend($('<i>').addClass('fas fa-fw ' + icon));
            });
        })
    }

    renderDirectory() {

    }

    makeid() {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < 16; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    get id() {
        return "MonksEnhancedJournal";
    }

    get template() {
        return "modules/monks-enhanced-journal/templates/main.html";
    }

    get entrytype() {
        if (this.object instanceof Actor)
            return 'actor';

        let flags = this.object.data?.flags;
        let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'journalentry';

        return type;
    }

    get content() {
        return JSON.parse(this.object.data.content);
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

    addTab(entity) {
        if (entity?.currentTarget != undefined)
            entity = null;

        let tab = {
            id: this.makeid(),
            text: entity?.data.name || 'New Tab',
            active: false,
            entityId: entity?.id,
            entity: entity || { data: { name: '', content: '<div class="journal-message">Open an article</div>' } },
            history: []
        };
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
    }

    activateTab(tab, event) {
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
                if (tab.entityId == undefined)
                    tab.entity = { data: { name: '', content: `<div class="journal-message">Open an article</div>` } };
                else {
                    tab.entity = game.journal.get(tab.entityId);
                    if (tab.entity == undefined)
                        tab.entity = game.actors.get(tab.entityId);
                    if (tab.entity == undefined)
                        tab.entity = { data: { name: tab.text, content: `<div class="journal-message">Cannot find the entity: ${tab.text}</div>` } };
                }
            }
            this.display(tab.entity);
        }

        if (currentTab?.id == tab.id)
            return false;

        if (currentTab != undefined)
            currentTab.active = false;
        tab.active = true;
        $('.journal-tab[data-tabid="' + tab.id + '"]', this.element).addClass('active').siblings().removeClass('active');
        this.saveTabs();

        return true;
    }

    updateTab(tab, entity) {
        if (tab != undefined) {
            if (tab.entityId != entity.data._id) {
                if (game.user.isGM || setting('allow-player')) {    //only save the history if the player is a GM or they get the full journal experience
                    if (tab.history == undefined)
                        tab.history = [];
                    tab.history.push(tab.entityId);
                }
                tab.text = entity.data.name;
                tab.entityId = entity.data._id;
                tab.entity = entity;
                this.saveTabs();

                $('.journal-tab[data-tabid="' + tab.id + '"]', this.element).attr('title', tab.text).find('.tab-content span').html(tab.text);
            } else if (tab.entity == undefined) {
                tab.entity = entity;
            }
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
            let tab = duplicate(t);
            delete tab.entity;
            delete tab.history;
            delete tab.userdata;
            return tab;
        });
        game.user.setFlag('monks-enhanced-journal', 'tabs', update);
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

    gotoURL(event) {
        let ctrl = $(event.currentTarget);
        let url = ctrl.val();

        $('.content iframe', this.element).attr('src', url);
    }

    async display(entity) {
        this.object = entity;

        $('.title input', this.element).val(entity.data.name);

        if (entity instanceof Actor) {
            const sheet = entity.sheet;
            await sheet._render(true);
            $(sheet.element).hide();



            this.document = $('<div>').addClass(sheet.options.classes);
            this.document.append($('.window-content', sheet.element));

            $('.content', this.element).attr('entity-type', 'actor');
            $('.content form', this.element).empty().append(this.document);
            this.activateDocumentListeners($('.content form > *', this.element).get(0), 'actor');

            sheet.close();
        } else {
            let types = MonksEnhancedJournal.getEntityTypes();
            let flags = entity.data?.flags;
            let type = (flags != undefined ? flags['monks-enhanced-journal']?.type : null) || 'journalentry';

            let data = {};
            if (Object.keys(types).includes(type)) {
                data = entity.data;
                try {
                    data.entity = JSON.parse(entity.data.content);
                } catch (err) {
                }

                //set the defaults
                let defValues = {};
                switch (type) {
                    case 'person':
                        defValues = { img: 'modules/monks-enhanced-journal/assets/person.png' };
                        break;
                    case 'place':
                        defValues = { img: 'modules/monks-enhanced-journal/assets/place.png' };
                        break;
                }

                data.entity = mergeObject(defValues, data.entity, { recursive: false });
                data.userid = game.user.id;

                if (data[game.user.id])
                    data.userdata = data[game.user.id];

                //+++ if this is an actor then we need to find the template for that actor and use it instead
                let template = (types[type].template || `modules/monks-enhanced-journal/templates/${type}.html`);
                this.document = await renderTemplate(template, data);
            } else {
                data = entity.data.content;
                this.document = entity.data.content;
            }

            $('.content', this.element).attr('entity-type', type);
            $('.content form', this.element).html(this.document);
            this.activateDocumentListeners($('.content form > *', this.element).get(0), type);
        }
        log('Open entity', entity);
    }

    expandSidebar() {

    }

    collapseSidebar() {

    }

    _onDragLeftDrop(event) {
        log('drag left drop event', event);
        return super._onDragLeftDrop(event);
    }

    _onHandleDragDrop(event) {
        log('handle drag drop event', event);
        return super._onHandleDragDrop(event);
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
            let actor = game.actors.get(data.id);
            this.open(actor);
        }

        log('drop data', event, data);
    }

    _canDragDrop(selector) {
        log('can drag drop', selector);
        return super._canDragDrop(selector);
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
        //don't do anything
    }

    _onEditImage(event) {
        const fp = new FilePicker({
            type: "image",
            current: this.object.data.img,
            callback: path => {
                event.currentTarget.src = path;
                this._onSubmit(event, { preventClose: true });
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        })
        return fp.browse();
    }

    onEditDescription(html) {
        if ($('div.tox-tinymce', html).length > 0) {
            //close the editor
            const name = $('.editor-content', html).attr("data-edit");
            const editor = this.editors[name];
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
    }

    _onSubmit(ev) {
        let type = this.entrytype;

        if (type == 'encounter')
            $('.sheet-body', this.element).removeClass('editing');
            
        const formData = this._getSubmitData();
        let content = this.content;
        content = mergeObject(content, formData.entity, { recursive: false }); 
        if (formData.userdata)
            content[game.user.id] = formData.userdata;

        return this.object.update({ name: formData.name, content: JSON.stringify(content) }).then(() => {
            this.display(this.object);
        });
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.findSplice(b => b.class == "entry-text");
        buttons.findSplice(b => b.class == "entry-image");
        return buttons;
    }

    getEntityControls(type) {
        //{ id: 'show', text: '', icon: '', callback: function () { }}
        let ctrls = [];
        switch (type) {
            case 'person':
            case 'place':
            case 'quest':
                ctrls =
                [
                    { id: 'show', text: 'Show to Players', icon: 'fa-eye', conditional: game.user.isGM, callback: this._onShowPlayers },
                    { id: 'edit', text: 'Edit Description', icon: 'fa-pencil-alt', conditional: (entity) => { return entity.permission == ENTITY_PERMISSIONS.OWNER }, callback: this.onEditDescription }
                ];
            case 'picture': ctrls = [
                { id: 'show', text: 'Show to Players', icon: 'fa-eye', conditional: game.user.isGM, callback: this._onShowPlayers }
            ];
            case 'slideshow': ctrls = [
                { id: 'add', text: 'Add Slide', icon: 'fa-plus', conditional: game.user.isGM, callback: function () { } },
                { id: 'clear', text: 'Clear All', icon: 'fa-trash', conditional: game.user.isGM, callback: function () { } },
                { id: 'play', text: 'Play', icon: 'fa-play', conditional: game.user.isGM, callback: function () { } },
                { id: 'pause', text: 'Pause', icon: 'fa-pause', conditional: game.user.isGM, callback: function () { } },
                { id: 'stop', text: 'Stop', icon: 'fa-stop', conditional: game.user.isGM, callback: function () { } }
            ];
            case 'encounter':
            case 'journalentry':
                ctrls = [
                    { id: 'search', text: 'Search', icon: 'fa-search', callback: function () { } },
                    { id: 'show', text: 'Show to Players', icon: 'fa-eye', conditional: game.user.isGM, callback: this._onShowPlayers },
                    { id: 'edit', text: 'Edit Description', icon: 'fa-pencil-alt', conditional: (entity) => { return entity.permission == ENTITY_PERMISSIONS.OWNER }, callback: this.onEditDescription }
                ];
        }

        return ctrls;
    }

    async _onShowPlayers(event) {
        if (this.entrytype == 'picture') {
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
        } else if (this.entrytype == 'slideshow') {
            //start a slideshow?
        } else
            super._onShowPlayers(event);
    }

    deleteSlide(slide) {

    }

    cloneSlide(slide) {
    }

    editSlide(slide, options) {
        //new FolderConfig(folder, options).render(true);
    }

    _getSlideshowContextOptions() {
        return [
            {
                name: "Edit Slideshow",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM,
                callback: header => {
                    const slide = this.content.slides.get(li.data("entityId"));
                    const options = { top: li.offsetTop, left: window.innerWidth - 310 - FolderConfig.defaultOptions.width };
                    this.editSlide(slide, options);
                }
            },
            {
                name: "SIDEBAR.Duplicate",
                icon: '<i class="far fa-copy"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const slide = this.content.slides.get(li.data("entityId"));
                    return this.cloneSlide(entity);
                }
            },
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const slide = this.content.slides.get(li.data("entityId"));
                    Dialog.confirm({
                        title: `${game.i18n.localize("SIDEBAR.Delete")} slide`,
                        content: game.i18n.localize("SIDEBAR.DeleteConfirm"),
                        yes: this.deleteSlide.bind(slide),
                        options: {
                            top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720
                        }
                    });
                }
            }
        ];
    }

    activateListeners(html) {   
        super.activateListeners(html);

        var that = this;

        $('.sidebar-toggle', html).on('click', function () { if (this._collapsed) this.expandSidebar(); else this.collapseSidebar(); });

        html.find('.tab-add').click(this.addTab.bind(this));
        html.find('.journal-tab').click(this.activateTab.bind(this));
        html.find('.journal-tab .close').click(this.removeTab.bind(this));

        html.find('.navigation .show').click(this._onShowPlayers.bind(this));

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
        });

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

        // Intersection Observer
        const observer = new IntersectionObserver(ui.journal._onLazyLoadImage.bind(this), { root: directory[0] });
        entries.each((i, li) => observer.observe(li));
    }

    activateDocumentListeners(html, type) {
        if (html != undefined) {
            let container = $('#journal-buttons', this.element).empty();
            let ctrls = this.getEntityControls(type);
            if (ctrls) {
                for (let ctrl of ctrls) {
                    if (ctrl.conditional != undefined) {
                        if (typeof ctrl.conditional == 'function') {
                            if (!ctrl.conditional.call(this, this.entity))
                                continue;
                        }
                        else if (!ctrl.conditional)
                            continue;
                    }
                    container.append(
                        $('<div>')
                            .addClass('nav-button ' + ctrl.id)
                            .attr('title', ctrl.text)
                            .append($('<i>').addClass('fas ' + ctrl.icon))
                            .on('click', $.proxy(ctrl.callback, this, html)));
                    //<div class="nav-button search" title="Search"><i class="fas fa-search"></i><input class="search" type="text" name="search-entry" autocomplete="off"></div>
                }
            }

            $('.back-button, .forward-button').toggle(game.user.isGM || setting('allow-player'));

            $('img[data-edit]', html).on('click', $.proxy(this._onEditImage, this))
            let editor = $(".editor-content", html).get(0);
            if(editor != undefined)
                this._activateEditor(editor);

            this.sheettabs.bind(html);

            if (type == 'encounter') {
                new ResizeObserver(function (obs) {
                    log('resize observer', obs);
                    $(obs[0].target).toggleClass('flexcol', obs[0].contentRect.width < 900).toggleClass('flexrow', obs[0].contentRect.width >= 900);
                }).observe(html);
            } else if (type == 'slideshow') {
                const slideshowOptions = this._getSlideshowContextOptions();
                Hooks.call(`getMonksEnhancedJournalSlideshowContext`, html, slideshowOptions);
                if (slideshowOptions) new ContextMenu($(html), ".slide", slideshowOptions);
            }
        }
    }

    addResizeObserver(html) {
        new ResizeObserver(function (obs) {
            log('resize observer', obs);
            $(obs[0].target).toggleClass('flexcol', obs[0].contentRect.width < 900).toggleClass('flexrow', obs[0].contentRect.width >= 900);
        }).observe(html);
    }
}