import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EditFields } from "../apps/editfields.js";

export class EnhancedJournalSheet extends JournalSheet {
    constructor(object, options = {}) {
        super(object, options);

        if (this.options.tabs.length) {
            let lasttab = this.object.getFlag('monks-enhanced-journal', '_lasttab') || this.options.tabs[0].initial;
            this.options.tabs[0].initial = lasttab;
            this._tabs[0].active = lasttab;
        }
    }

    static get defaultOptions() {
        let defOptions = super.defaultOptions;
        return foundry.utils.mergeObject(defOptions, {
            id: "enhanced-journal-sheet",
            title: i18n("MonksEnhancedJournal.NewTab"),
            template: "modules/monks-enhanced-journal/templates/blank.html",
            classes: defOptions.classes.concat(['monks-journal-sheet']),
            popOut: true,
            width: 1025,
            height: 700,
            resizable: true,
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

    _inferDefaultMode() {
        return "text";
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();

        buttons.findSplice(b => b.class == "entry-text");
        buttons.findSplice(b => b.class == "entry-image");

        return buttons;
    }

    _onChangeTab(event) {
        if(this.object.isOwner)
            this.object.setFlag('monks-enhanced-journal', '_lasttab', this._tabs[0].active);
    }

    get defaultObject() {
        return {};
    }

    getData() {
        let data = (this.object.id ? super.getData() : {
            cssClass: this.isEditable ? "editable" : "locked",
            editable: this.isEditable,
            data: this.object.data,
            content: this.object.data.content,
            options: this.options,
            owner: false,
            title: i18n("MonksEnhancedJournal.NewTab"),
            recent: (game.user.getFlag("monks-enhanced-journal", "_recentlyViewed") || []).map(r => {
                return mergeObject(r, { img: MonksEnhancedJournal.getIcon(r.type) });
            })
        });

        data.userid = game.user.id;

        if (data.data.flags && data.data.flags["monks-enhanced-journal"] && data.data.flags["monks-enhanced-journal"][game.user.id])
            data.userdata = data.data.flags["monks-enhanced-journal"][game.user.id];

        data.entrytype = this.type;
        data.isGM = game.user.isGM;

        let fields = this.fieldlist();
        if (fields != undefined)
            data.fields = mergeObject(fields, data.data.flags['monks-enhanced-journal'].fields);

        return data;
    }

    refresh() { }

    get isEditable() {
        if (this.enhancedjournal && !this.enhancedjournal.isEditable)
            return false;

        return this.object.permission == CONST.ENTITY_PERMISSIONS.OWNER && this.object?.compendium?.locked !== true;
    }

    fieldlist() {
        return null;
    }

    async _render(force, options = {}) {
        super._render(force, options);

        log('Subsheet rendering');

        this.updateStyle();
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html);

        html.on("click", "a.inline-request-roll", this._onClickInlineRequestRoll);

        $('.sheet-image .profile', html).contextmenu(() => { $('.fullscreen-image').show(); });
        $('.fullscreen-image', html).click(() => { $('.fullscreen-image', html).hide(); });

        html.find('img[data-edit]').click(this._onEditImage.bind(this));

        if (enhancedjournal) {
            html.find('.recent-link').click(ev => {
                let id = ev.currentTarget.dataset.entityId;
                let entity = game.journal.find(j => j.id == id);
                if (entity)
                    enhancedjournal.open(entity);
            });

            for (let dragdrop of enhancedjournal._dragDrop)
                dragdrop.bind(html[0]);

            if (enhancedjournal.editors?.content) {
                let oldSaveCallback = enhancedjournal.editors.content.options.save_onsavecallback;
                enhancedjournal.editors.content.options.save_onsavecallback = async (name) => {
                    await oldSaveCallback.call(enhancedjournal.editors.content, name);
                }
            }
        }
    }

    activateEditor(name, options = {}, initialContent = "") {
        $('.editor .editor-content', this.element).unmark();

        if (this.editors[name] != undefined) {
            if (this.object.type == 'base' || this.object.type == 'journalentry' || this.object.type == 'oldentry') {
                options = foundry.utils.mergeObject(options, {
                    menubar: true,
                    plugins: CONFIG.TinyMCE.plugins + ' background',
                    toolbar: CONFIG.TinyMCE.toolbar + ' background'//,
                    //font_formats: "Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Oswald=oswald; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats;Anglo Text=anglo_textregular;Lovers Quarrel=lovers_quarrelregular;Play=Play-Regular"
                });
            }
            super.activateEditor(name, options, initialContent);
            //need this because foundry doesn't allow access to the init of the editor
            if (this.object.type == 'base' || this.object.type == 'journalentry' || this.object.type == 'oldentry') {
                let count = 0;
                let that = this;
                let data = this.object.getFlag('monks-enhanced-journal', 'style');
                if (data) {
                    let timer = window.setInterval(function () {
                        count++;
                        if (count > 20) {
                            window.clearInterval(timer);
                        }
                        let editor = that.editors.content;
                        if (editor && editor.mce) {
                            editor.mce.enhancedsheet = that;
                            that.updateStyle(data, $(editor.mce.contentDocument));
                            window.clearInterval(timer);
                        }
                    }, 100);
                }

            }
        }
    }

    _disableFields(form) {
        super._disableFields(form);
        $(`textarea[name="flags.monks-enhanced-journal.${game.user.id}.notes"]`, form).removeAttr('disabled').on('change', this._onChangeInput.bind(this));
        $('.editor-edit', form).css({ width: '0px !important', height: '0px !important' });
    }

    _onClickInlineRequestRoll(event) {
        event.preventDefault();
        const a = event.currentTarget;

        if (game.MonksTokenBar) {
            let requesttype = a.dataset.requesttype.toLowerCase();
            if (requesttype == 'request')
                game.MonksTokenBar.requestRoll(canvas.tokens.controlled, a.dataset);
            else if (requesttype == 'contested')
                game.MonksTokenBar.contextedRoll();
        }
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

    _onSubmit(ev) {
        if ($(ev.currentTarget).attr('ignoresubmit') == 'true')
            return;

        const formData = expandObject(this._getSubmitData());

        if (Object.keys(formData).length == 0)
            return;

        if (this.type == 'quest') {
            $(`li[data-entity-id="${this.object.id}"]`, '#journal,#journal-directory').attr('status', formData.flags['monks-enhanced-journal'].status);
        }

        if (!this.isEditable && foundry.utils.getProperty(formData, 'flags.monks-enhanced-journal.' + game.user.id)) {
            //need to have the GM update this, but only the user notes
            MonksEnhancedJournal.emit("saveUserData", {
                entityId: this.object.id,
                userId: game.user.id,
                userdata: formData.flags["monks-enhanced-journal"][game.user.id]
            });
            return new Promise(() => { });
        } else
            return this.object.update(formData);
    }

    activateControls(html) {
        let ctrls = this._entityControls();
        Hooks.callAll('activateControls', this, ctrls);
        let that = this;
        if (ctrls) {
            for (let ctrl of ctrls) {
                if (ctrl.conditional != undefined) {
                    if (typeof ctrl.conditional == 'function') {
                        if (!ctrl.conditional.call(this))
                            continue;
                    }
                    else if (!ctrl.conditional)
                        continue;
                }
                let div = '';
                switch (ctrl.type || 'button') {
                    case 'button':
                        div = $('<div>')
                            .addClass('nav-button ' + ctrl.id)
                            .attr('title', ctrl.text)
                            .append($('<i>').addClass('fas ' + ctrl.icon))
                            .on('click', ctrl.callback.bind(this));
                        break;
                    case 'input':
                        div = $('<input>')
                            .addClass('nav-input ' + ctrl.id)
                            .attr(mergeObject({ 'type': 'text', 'autocomplete': 'off', 'placeholder': ctrl.text }, (ctrl.attributes || {})))
                            .on('keyup', function (event) {
                                ctrl.callback.call(that, this.value, event);
                            });
                        break;
                    case 'text':
                        div = $('<div>').addClass('nav-text ' + ctrl.id).html(ctrl.text);
                        break;
                }

                if (div != '') {
                    if (ctrl.visible === false)
                        div.hide();
                    html.append(div);
                }
                //<div class="nav-button search" title="Search"><i class="fas fa-search"></i><input class="search" type="text" name="search-entry" autocomplete="off"></div>
            }
        }
    }

    _entityControls() {
        let ctrls = [];
        if (this.object.id)
            ctrls.push({ id: 'locate', text: i18n("SIDEBAR.JumpPin"), icon: 'fa-crosshairs', conditional: game.user.isGM, callback: this.enhancedjournal.findMapEntry.bind(this) });
        if (this.fieldlist() != undefined)
            ctrls.push({ id: 'settings', text: i18n("MonksEnhancedJournal.EditFields"), icon: 'fa-cog', conditional: game.user.isGM, callback: this.onEditFields });
        return ctrls;
    }

    open(entity) {
        if (entity) {
            //if (game.user.isGM || actor.testUserPermission(game.user, "OBSERVER")) {
            if (this.enhancedjournal)
                this.enhancedjournal.open(entity, event.shiftKey);
            else
                entity.sheet.render(true);
        }
    }

    updateStyle(data, element) {
        if (data == undefined)
            data = this.object.getFlag('monks-enhanced-journal', 'style');

        if (data == undefined)
            return;

        let content = $('.editor-content[data-edit="content"],.mce-content-body', (element || this.element));

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

        if (this.editors?.content?.active) {
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
            const name = $('.editor-content', this.element).attr("data-edit");
            this.saveEditor(name);
        } else {
            $('.editor .editor-edit', this.element).click();
            //$('.sheet-body', this.element).addClass('editing');
        }
    }

    onEditFields() {
        //popup a dialog with the available fields to edit
        let fields = mergeObject(this.fieldlist(), this.object.data.flags['monks-enhanced-journal'].fields);
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
            let scramble = polyglot.polyglot.scrambleString(this.textContent, game.settings.get('polyglot', 'useUniqueSalt') ? that.object.id : lang, lang);
            let font = polyglot.polyglot._getFontStyle(lang);

            $(this).addClass('converted')
                .attr('title', (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || polyglot.polyglot.known_languages.has(lang) ? polyglot.polyglot.LanguageProvider.languages[lang] : 'Unknown'))
                .attr('data-language', lang)
                .css({ font: font })
                .data({ text: text, scramble: scramble, lang: lang, font: font, changed: true })
                .html(scramble)
                .click(
                    function () {
                        let data = $(this).data();
                        const lang = data.lang;
                        if (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || polyglot.polyglot.known_languages.has(lang)) {
                            $(this).data('changed', !data.changed).html(data.changed ? data.scramble : data.text).css({ font: (data.changed ? data.font : '') });
                        }
                    }
                );

            /*
            $('<div>')
                .addClass('polyglot-container')
                .attr('data-lang-text', (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || polyglot.polyglot.known_languages.has(lang) ? polyglot.polyglot.LanguageProvider.languages[lang] : 'Unknown'))
                .attr('data-language', lang)
                .insertBefore($(this).addClass('converted').attr('title', ''))
                .append(this)
                .append(scrambleSpan)
                .hover(
                    function () {
                        //hover in
                        const lang = this.dataset.language;
                        if (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || polyglot.polyglot.known_languages.has(lang)) {
                            $(this).addClass('translate');
                        }
                    },
                    function () {
                        //hover out
                        $(this).removeClass('translate');
                    }
                );*/

            /*
            if (!$(this).data('converted')) {
                $(this).data({
                    'text': this.textContent,
                    'scramble': MonksEnhancedJournal.polyglot.scrambleString(this.textContent, game.settings.get('polyglot', 'useUniqueSalt') ? that.object.id : lang),
                    'font': this.style.font,
                    'converted': true
                });
            }

            this.textContent = $(this).data('scramble');
            this.style.font = MonksEnhancedJournal.polyglot._getFontStyle(lang);

            $(this).hover(
                function () {
                    //hover in
                    const lang = this.dataset.language;
                    if (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || that.known_languages.has(lang)) {
                        this.textContent = $(this).data('text');
                        this.style.font = $(this).data('font');
                    }
                },
                function () {
                    //hover out
                    const lang = this.dataset.language;
                    this.textContent = $(this).data('scramble');
                    this.style.font = MonksEnhancedJournal.polyglot._getFontStyle(lang);
                }
            );*/



            /*
            else if (!userunes && $(this).data('converted')) {
                this.textContent = $(this).data('text');
                this.style.font = $(this).data('font');
                $(this).data('converted', false)
            }*/
        });
    }

    async getEntity(data) {
        let entity;
        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            entity = id ? await pack.getDocument(id) : null;
        } else {
            entity = game.collections.get(data.type).get(data.id);
            if (entity.documentName === "Scene" && entity.journal)
                entity = entity.journal;
            if (!entity.testUserPermission(game.user, "LIMITED")) {
                return ui.notifications.warn(`You do not have permission to view this ${entity.documentName} sheet.`);
            }
        }

        let result = { entity: entity, data: {} };
        if (entity) {
            result.data = {
                id: entity.id,
                uuid: entity.uuid,
                img: entity.img,
                name: entity.name,
                qty: 1
            };

            if (data.type)
                result.data.type = data.type;

            if (data.pack)
                result.data.pack = data.pack;
        }
        return result;
    }

    _deleteItem(event) {
        let item = event.currentTarget.closest('.item');
        this.deleteItem(item.dataset.id, item.dataset.container);
    }

    deleteItem(id, container) {
        let data = duplicate(this.object.data.flags["monks-enhanced-journal"][container]);
        data.findSplice(i => i.id == id);
        this.object.setFlag('monks-enhanced-journal', container, data);
    }

    checkForChanges() {
        return this.editors?.content?.active && this.editors?.content?.mce?.isDirty();
    }

    async close(options) {
        if (options?.submit !== false) {
            if (this.checkForChanges()) {
                if (!confirm('You have unsaved changes, are you sure you want to close this window?'))
                    return false;
            }

            return super.close(options);
        }
    }

    async _onShowPlayers(event) {
        let users = event.data.users;
        let options = event.data.options;

        if (users != undefined)
            users = users.filter(u => u.selected);
        //if we havn't picked anyone to show this to, then exit
        if (users instanceof Array && users.length == 0)
            return;

        if (!this.object.isOwner) throw new Error("You may only request to show Journal Entries which you own.");

        let args = {
            title: this.object.name,
            uuid: this.object.uuid,
            users: (users != undefined ? users.map(u => u.id) : users),
            showid: makeid()
        }
        if (options?.showpic || this.object.data?.flags["monks-enhanced-journal"]?.type == 'picture')
            args.image = this.object.data.img;

        MonksEnhancedJournal.emit("showEntry", args);

        ui.notifications.info(game.i18n.format("MonksEnhancedJournal.MsgShowPlayers", {
            title: this.object.name,
            which: (users == undefined ? 'all players' : users.map(u => u.name).join(', '))
        }) + (options?.showpic || this.object.data?.flags["monks-enhanced-journal"]?.type == 'picture' ? ', click <a onclick="game.MonksEnhancedJournal.journal.cancelSend(\'' + args.showid + '\', ' + options?.showpic + ');event.preventDefault();">here</a> to cancel' : ''));

        if (options?.updatepermission) {
            let permissions = {};
            Object.assign(permissions, this.object.data.permission);
            if (users == undefined)
                permissions["default"] = CONST.ENTITY_PERMISSIONS.OBSERVER;
            else {
                users.forEach(user => { permissions[user.id] = CONST.ENTITY_PERMISSIONS.OBSERVER; });
            }
            this.object.update({ permission: permissions });
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

    /*
     * let checklang = !game.user.isGM && this.object.permission < CONST.ENTITY_PERMISSIONS.OWNER;
            let known_languages = new Set();
            if (checklang)
                [known_languages] = MonksEnhancedJournal.polyglot.getUserLanguages([game.user.character]);
            let userunes = !game.user.isGM || (this.object && !this.object.ignore && (this.object.getFlag('monks-enhanced-journal', 'use-runes') != undefined ? this.object.getFlag('monks-enhanced-journal', 'use-runes') : setting('use-runes')));
            if (userunes) {
                $('span.polyglot-journal', this.element).each(function () {
                    const lang = this.dataset.language;
                    if (lang) {
                        const known = known_languages.has(lang);
                        if (checklang && known)
                            return; //Do not show the runes if the language is known and it's not the GM

                        $(this).data({ 'text': this.textContent, 'font': this.style.font, 'converted': true });
                        this.textContent = MonksEnhancedJournal.polyglot.scrambleString(this.textContent, game.settings.get('polyglot', 'useUniqueSalt') ? that.object.id : lang);
                        this.style.font = MonksEnhancedJournal.polyglot._getFontStyle(lang);
                    }
                });
            }
    */
}