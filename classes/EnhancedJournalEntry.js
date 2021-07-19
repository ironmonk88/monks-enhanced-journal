import { DCConfig } from "../apps/dc-config.js";
import { SlideConfig } from "../apps/slideconfig.js";
import { TrapConfig } from "../apps/trap-config.js";
import { Objectives } from "../apps/objectives.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";

export class SubSheet {
    constructor(object) {
        this.object = object;
        this.refresh();
    }

    static get defaultOptions() {
        return {
            text: "MonksEnhancedJournal.NewTab",
            template: "modules/monks-enhanced-journal/templates/blank.html"
        };
    }

    get type() {
        return 'blank';
    }

    refresh() {
        try {
            if (game.modules.get("polyglot")?.active) {
                this.renderPolyglot();
            }
        } catch (err) {
        }
    }

    get defaultObject() {
        return {};
    }

    getData(data) {
        if (data == undefined)
            data = this.object.data;

        data.userid = game.user.id;
        data.editable = MonksEnhancedJournal.journal.isEditable && this.isEditable;

        if (data.flags["monks-enhanced-journal"] && data.flags["monks-enhanced-journal"][game.user.id])
            data.userdata = data.flags["monks-enhanced-journal"][game.user.id];

        data.entrytype = this.type;
        data.description = data.content;

        data.owner = this.object.isOwner;

        return data;
    }

    get isEditable() {
        return this.object.permission == CONST.ENTITY_PERMISSIONS.OWNER && MonksEnhancedJournal.journal.isEditable && this.object?.compendium?.locked !== true;
    }

    async render(data) {
        let templateData = this.getData(data);

        let html = await renderTemplate(this.constructor.defaultOptions.template, templateData);
        this.element = $(html).get(0);

        this.activateListeners($(this.element));

        if (game.modules.get("polyglot")?.active) {
            this.renderPolyglot();
        }

        return this.element;
    }

    activateListeners(html) {
        if (MonksEnhancedJournal.journal) {
            if (!MonksEnhancedJournal.journal.isEditable) {
                MonksEnhancedJournal.journal._disableFields.call(this, html.get(0));
                $(`textarea[name="flags.monks-enhanced-journal.${game.user.id}.notes"]`, html).removeAttr('disabled').on('change', $.proxy(MonksEnhancedJournal.journal._onChangeInput, MonksEnhancedJournal.journal));
                $('.editor-edit', html).css({ width: '0px !important', height: '0px !important'});
            }

            html.on("change", "input,select,textarea", MonksEnhancedJournal.journal?._onChangeInput.bind(MonksEnhancedJournal.journal));
            html.find('.editor-content[data-edit]').each((i, div) => MonksEnhancedJournal.journal?._activateEditor(div));
            for (let fp of html.find('button.file-picker')) {
                fp.onclick = MonksEnhancedJournal.journal?._activateFilePicker.bind(MonksEnhancedJournal.journal);
            }
            //html.find('button.file-picker').each((i, button) => MonksEnhancedJournal.journal?._activateFilePicker());
            html.find('img[data-edit]').click(ev => {
                MonksEnhancedJournal.journal?._onEditImage(ev)
            });

            html.find('.recent-link').click(ev => {
                let id = ev.currentTarget.dataset.entityId;
                let entity = game.journal.find(j => j.id == id);
                if(entity)
                    MonksEnhancedJournal.journal.open(entity);
            });

            $('.magnify-image', html).click(this.magnifyImage.bind(this));
            $('.fullscreen-image', html).click(ev => {
                $('.fullscreen-image', html).hide();
            });

            for (let dragdrop of MonksEnhancedJournal.journal._dragDrop)
                dragdrop.bind(html[0]);

            if (MonksEnhancedJournal.journal.editors.content) {
                let oldSaveCallback = MonksEnhancedJournal.journal.editors.content.options.save_onsavecallback;
                MonksEnhancedJournal.journal.editors.content.options.save_onsavecallback = async (name) => {
                    await oldSaveCallback.call(MonksEnhancedJournal.journal.editors.content, name);
                    MonksEnhancedJournal.journal.subsheet.refresh();
                }
            }
        }
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
                            .on('click', $.proxy(ctrl.callback, MonksEnhancedJournal.journal));
                        break;
                    case 'input':
                        div = $('<input>')
                            .addClass('nav-input ' + ctrl.id)
                            .attr(mergeObject({ 'type': 'text', 'autocomplete': 'off', 'placeholder': ctrl.text }, (ctrl.attributes || {})))
                            .on('keyup', function (event) {
                                ctrl.callback.call(MonksEnhancedJournal.journal, this.value, event);
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
        return [{ id: 'locate', text: i18n("SIDEBAR.JumpPin"), icon: 'fa-crosshairs', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.findMapEntry }];
    }

    onEditDescription() {
        if (!this.isEditable)
            return null;

        if ($('div.tox-tinymce', this.element).length > 0) {
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

            return submit.then(() => {
                mce.destroy();
                editor.mce = null;
                this.render(true, { action:'update', data: {content: editor.initial, _id: this.object.id}}); //need to send this so that the render looks to the subsheet instead
                editor.changed = false;
                $('.sheet-body', this.element).removeClass('editing');
            });            
        } else {
            $('.editor .editor-edit', this.element).click();
            //$('.sheet-body', this.element).addClass('editing');
        }
    }

    async renderPolyglot() {

        //show the runes if [(gm or owner) and userunes][not gm and lang unknown]

        let that = this;
        //userunes = !(this.object.getFlag('monks-enhanced-journal', 'use-runes') != undefined ? this.object.getFlag('monks-enhanced-journal', 'use-runes') : setting('use-runes'));
        //MonksEnhancedJournal.journal.object.setFlag('monks-enhanced-journal', 'use-runes', userunes);
        //$('.nav-button.polyglot i', this.element).attr('class', 'fas ' + (userunes ? 'fa-link' : 'fa-unlink'));


        $('.editor-content span.polyglot-journal:not(.converted)', this.element).each(function () {
            const lang = this.dataset.language;
            if (!lang) return;

            let scramble = polyglot.polyglot.scrambleString(this.textContent, game.settings.get('polyglot', 'useUniqueSalt') ? that.object.id : lang, lang);
            let scrambleSpan = $('<span>').addClass('polyglot-scramble').css({ 'font': polyglot.polyglot._getFontStyle(lang) }).html(scramble);
						
            $('<div>')
                .addClass('polyglot-container')
                .attr('data-language', (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || polyglot.polyglot.known_languages.has(lang) ? polyglot.polyglot.LanguageProvider.languages[lang] : 'Unknown'))
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
                );

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

    addPolyglotButton(ctrls) {
        /*
        if (game.modules.get("polyglot")?.active) {
            let app = $(MonksEnhancedJournal.journal.element).closest('.app');
            let btn = $('.polyglot-button', app);
            if (btn.length > 0) {
                let userunes = (this.object.getFlag('monks-enhanced-journal', 'use-runes') != undefined ? this.object.getFlag('monks-enhanced-journal', 'use-runes') : setting('use-runes'));
                ctrls.push({
                    id: 'polyglot',
                    text: 'Polyglot: ' + game.i18n.localize("POLYGLOT.ToggleRunes"),
                    icon: (userunes ? 'fa-link' : 'fa-unlink'),
                    callback: this.renderPolyglot
                });
            }
        }*/
    }

    magnifyImage(event) {
        $('.fullscreen-image').show();
    }
}

export class ActorSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.actor",
            template: ""
        });
    }

    get type() {
        return 'actor';
    }

    async render(data) {
        if (data == undefined)
            data = duplicate(this.object.data);

        const sheet = this.object.sheet;
        if (!sheet.rendered) {
            await sheet._render(true);
            $(sheet.element).hide();
        }

        let body = $('<div>').addClass(sheet.options.classes).append($('.window-content', sheet.element));

        this.activateListeners($(sheet.element));

        sheet.close(true);

        this.element = body.get(0);
        return this.element;
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('img[data-edit]', html).on('click', $.proxy(this._onEditImage, this))
        let editor = $(".editor-content", html).get(0);
        if (editor != undefined && this.type != 'actor')
            this._activateEditor(editor);
    }

    _entityControls() {
        let ctrls = [
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers },
            { id: 'open', text: "Open Actor Sheet", icon: 'fa-user', conditional: game.user.isGM, callback: function (event) { 
                MonksEnhancedJournal.journal.object.sheet.render(true);
            } },
        ];
        return ctrls;
    }
}

export class EncounterSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.encounter",
            template: "modules/monks-enhanced-journal/templates/encounter.html"
        });
    }

    get type() {
        return 'encounter';
    }

    static get defaultObject() {
        return { items: [], monsters: [], dcs: [], traps: [] };
    }

    getData(data) {
        data = super.getData(data);

        let safeGet = function (container, value) {
            if (config == undefined) return;
            if (config[container] == undefined) return;
            return config[container][value];
        }

        let config = (game.system.id == "tormenta20" ? CONFIG.T20 : CONFIG[game.system.id.toUpperCase()]);

        if (data.flags["monks-enhanced-journal"].dcs) {
            for (let dc of data.flags["monks-enhanced-journal"].dcs) {
                if (dc.attribute == undefined || dc.attribute.indexOf(':') < 0)
                    dc.label = 'Invalid';
                else {
                    let [type, value] = dc.attribute.split(':');
                    dc.label = safeGet('abilities', value) || safeGet('skills', value) || safeGet('scores', value) || safeGet('atributos', value) || safeGet('pericias', value) || value;
                    dc.label = i18n(dc.label);
                }
            }
        }

        return data;
    }

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchEncounterDescription"), callback: MonksEnhancedJournal.journal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: this.onEditDescription },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: MonksEnhancedJournal.journal.requestConvert }
        ];
        this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html) {
        super.activateListeners(html);

        /*
        new ResizeObserver(function (obs) {
                log('resize observer', obs);
                $(obs[0].target).toggleClass('condensed', obs[0].contentRect.width < 1100);
        }).observe($('.encounter-content', html).get(0));*/

        MonksEnhancedJournal.journal.sheettabs.bind(html[0]);

        //monster
        $('.monster-icon', html).click(this.clickItem.bind(this));
        $('.monster-delete', html).on('click', $.proxy(this._deleteItem, this));
        html.on('dragstart', ".monster-icon", TextEditor._onDragEntityLink);

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        //DCs
        $('.dc-create', html).on('click', $.proxy(this.createDC, this));
        $('.dc-edit', html).on('click', $.proxy(this.editDC, this));
        $('.dc-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.encounter-dcs .item-name', html).on('click', $.proxy(this.rollDC, this));

        //Traps
        $('.trap-create', html).on('click', $.proxy(this.createTrap, this));
        $('.trap-edit', html).on('click', $.proxy(this.editTrap, this));
        $('.trap-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.encounter-traps .item-name', html).on('click', $.proxy(this.rollTrap, this));

        let that = this;
        $('.item-assigned input', html).on('change', function (event) {
            let id = $(event.currentTarget).closest('li').attr('data-id');
            let items = that.object.data.flags['monks-enhanced-journal'].items;
            let item = items.find(i => i.id == id);
            if (item) {
                item.assigned = $(this).is(':checked');
                delete item.received;
                that.object.setFlag('monks-enhanced-journal', 'items', items);
                $(event.currentTarget).parent().siblings('.item-received').html('');
            }
        });
    }

    refresh() {
        const owner = this.object.isOwner;
        const content = TextEditor.enrichHTML(this.object.data.content, { secrets: owner, entities: true });

        $('.editor-content[data-edit="content"]').html(content);

        super.refresh();
    }

    async addMonster(data) {
        let actor;
        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            actor = id ? await pack.getDocument(id) : null;
        } else {
            actor = game.actors.get(data.id);
            if (actor.documentName === "Scene" && actor.journal) actor = actor.journal;
            if (!actor.testUserPermission(game.user, "LIMITED")) {
                return ui.notifications.warn(`You do not have permission to view this ${actor.entity} sheet.`);
            }
        }

        if (this.object.data.flags["monks-enhanced-journal"].monsters == undefined)
            this.object.data.flags["monks-enhanced-journal"].monsters = [];

        if (actor) {
            let monster = {
                id: actor.id,
                img: actor.img,
                name: actor.name
            };

            if (data.pack)
                monster.pack = data.pack;

            this.object.data.flags["monks-enhanced-journal"].monsters.push(monster);
            await MonksEnhancedJournal.journal.saveData();
            this.refresh();
        }
    }

    deleteMonster(event) {
        let item = event.currentTarget.closest('.item');
        if (this.object.data.flags["monks-enhanced-journal"].dcs.findSplice(dc => dc.id == item.dataset.id));
        $(item).remove();
        MonksEnhancedJournal.journal.saveData()
    }

    async addItem(data) {
        let item;

        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            item = id ? await pack.getDocument(id) : null;
        } else {
            item = game.items.get(data.id);
        }

        if (this.object.data.flags["monks-enhanced-journal"].items == undefined)
            this.object.data.flags["monks-enhanced-journal"].items = [];

        if (item) {
            let olditem = this.object.data.flags["monks-enhanced-journal"].items.find(i => i.id == item.id);
            if (olditem) {
                olditem.qty++;
            } else {
                let newitem = {
                    id: item.id,
                    img: item.img,
                    name: item.name,
                    qty: 1
                };

                if (data.pack)
                    newitem.pack = data.pack;

                this.object.data.flags["monks-enhanced-journal"].items.push(newitem);
            }
            await MonksEnhancedJournal.journal.saveData();
            this.refresh();
        }
    }

    clickItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        event.currentTarget = li;
        TextEditor._onClickContentLink(event);
    }

    _deleteItem(event) {
        let item = event.currentTarget.closest('.item');
        this.deleteItem(item.dataset.id, item.dataset.container);
    }

    deleteItem(id, container) {
        this.object.data.flags["monks-enhanced-journal"][container].findSplice(i => i.id == id);
        $(`li[data-id="${id}"]`, this.element).remove();
        MonksEnhancedJournal.journal.saveData();
    }

    createDC() {
        let dc = { dc:10 };
        if (this.object.data.flags["monks-enhanced-journal"].dcs == undefined)
            this.object.data.flags["monks-enhanced-journal"].dcs = [];
        //this.object.data.flags["monks-enhanced-journal"].dcs.push(dc);
        new DCConfig(dc).render(true);
    }

    editDC(event) {
        let item = event.currentTarget.closest('.item');
        let dc = this.object.data.flags["monks-enhanced-journal"].dcs.find(dc => dc.id == item.dataset.id);
        if(dc != undefined)
            new DCConfig(dc).render(true);
    }

    rollDC(event) {
        let item = event.currentTarget.closest('.item');
        let dc = this.object.data.flags["monks-enhanced-journal"].dcs.find(dc => dc.id == item.dataset.id);

        let config = (game.system.id == "tormenta20" ? CONFIG.T20 : CONFIG[game.system.id.toUpperCase()]);
        let dctype = 'ability';
        //if (config?.skills[dc.attribute] || config?.pericias[dc.attribute] != undefined)
        //    dctype = 'skill';

        if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
            game.MonksTokenBar.requestRoll(canvas.tokens.controlled, { request: `${dc.attribute}`, dc: dc.dc });
        }
    }

    createTrap() {
        let trap = { };
        if (this.object.data.flags["monks-enhanced-journal"].traps == undefined)
            this.object.data.flags["monks-enhanced-journal"].traps = [];
        //this.object.data.flags["monks-enhanced-journal"].traps.push(trap);
        new TrapConfig(trap).render(true);
    }

    editTrap(event) {
        let item = event.currentTarget.closest('.item');
        let trap = this.object.data.flags["monks-enhanced-journal"].traps.find(dc => dc.id == item.dataset.id);
        if (trap != undefined)
            new TrapConfig(trap).render(true);
    }

    rollTrap(event) {

    }
}

export class JournalEntrySubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    get type() {
        return MonksEnhancedJournal.journal.entitytype;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.journalentry",
            template: "modules/monks-enhanced-journal/templates/journalentry.html"
        });
    }

    getData(data) {
        data = super.getData(data);

        return data;
    }

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchJournalEntry"), callback: MonksEnhancedJournal.journal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: this.onEditDescription },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: MonksEnhancedJournal.journal.requestConvert },
            { id: 'split', text: i18n("MonksEnhancedJournal.Extract"), icon: 'fa-file-export', conditional: (game.user.isGM && this.isEditable), callback: MonksEnhancedJournal.journal.splitJournal }
        ];
        
        this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html) {
        super.activateListeners(html);
        MonksEnhancedJournal.journal.sheettabs.bind(html[0]);

        let journaltype = (this.object.data.img != undefined && this.object.data.img != '' && this.object.data.content == '' ? 'picture' : 'description');
        MonksEnhancedJournal.journal.sheettabs.activate(journaltype);
        //$(`.tabs .item[data-tab="${journaltype}"]`, html).addClass('active').siblings().removeClass('active');
        //$(`.tab[data-tab="${journaltype}"]`, html).addClass('active').siblings().removeClass('active');
    }

    refresh() {
        const owner = this.object.isOwner;
        const content = TextEditor.enrichHTML(this.object.data.content, { secrets: owner, entities: true });

        $('.editor-content[data-edit="content"]', MonksEnhancedJournal.journal.element).html(content);
        MonksEnhancedJournal.journal.updateStyle(this.object.getFlag('monks-enhanced-journal', 'style'));

        if (!owner && ((this.object.data.img != undefined && this.object.data.img != '' && this.object.data.content == '') || ((this.object.data.img == undefined || this.object.data.img == '') && this.object.data.content != '')))
            $('.sheet-navigation.tabs', MonksEnhancedJournal.journal.element).hide();

        super.refresh();
    }

    async render(data) {
        let element = await super.render(data);

        if (!this.object.isOwner && ((this.object.data.img != undefined && this.object.data.img != '' && this.object.data.content == '') || ((this.object.data.img == undefined || this.object.data.img == '') && this.object.data.content != '')))
            $('.sheet-navigation.tabs', element).hide();

        return element;
    }
}

export class OrganizationSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.organization",
            template: "modules/monks-enhanced-journal/templates/organization.html"
        });
    }

    get type() {
        return 'organization';
    }

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchOrganizationDescription"), callback: MonksEnhancedJournal.journal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: this.onEditDescription },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: MonksEnhancedJournal.journal.requestConvert }
        ];
        this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html) {
        super.activateListeners(html);
        MonksEnhancedJournal.journal.sheettabs.bind(html[0]);
    }

    refresh() {
        const owner = this.object.isOwner;
        const content = TextEditor.enrichHTML(this.object.data.content, { secrets: owner, entities: true });

        $('.editor-content[data-edit="content"]', MonksEnhancedJournal.journal.element).html(content);
        super.refresh();
    }
}

export class PersonSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.person",
            template: "modules/monks-enhanced-journal/templates/person.html"
        });
    }

    get type() {
        return 'person';
    }

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchPersonDescription"), callback: MonksEnhancedJournal.journal.searchText },
            /*{ id: 'random', text: 'Generate Random Character', icon: 'fa-exchange-alt', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal._randomizePerson },*/
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: this.onEditDescription },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: MonksEnhancedJournal.journal.requestConvert }
        ];
        this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html) {
        super.activateListeners(html);
        MonksEnhancedJournal.journal.sheettabs.bind(html[0]);

        $('.actor-img img', html).click(this.openActor.bind(this));
    }

    refresh() {
        const owner = this.object.isOwner;
        const content = TextEditor.enrichHTML(this.object.data.content, { secrets: owner, entities: true });

        $('.editor-content[data-edit="content"]', MonksEnhancedJournal.journal.element).html(content);
        super.refresh();
    }

    async addActor(data) {
        let actor;
        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            actor = id ? await pack.getDocument(id) : null;
        } else {
            actor = game.actors.get(data.id);
            if (actor.documentName === "Scene" && actor.journal) actor = actor.journal;
            if (!actor.testUserPermission(game.user, "LIMITED")) {
                return ui.notifications.warn(`You do not have permission to view this ${actor.entity} sheet.`);
            }
        }

        if (actor) {
            let actorLink = {
                id: actor.id,
                img: actor.img,
                name: actor.name
            };

            if (data.pack)
                actorLink.pack = data.pack;

            this.object.data.flags["monks-enhanced-journal"].actor = actorLink;
            MonksEnhancedJournal.journal.saveData();
            this.refresh();
        }
    }

    openActor(event) {
        let actorLink = this.object.getFlag('monks-enhanced-journal', 'actor');
        let actor = game.actors.find(a => a.id == actorLink.id);
        if (actor) {
            //actor.sheet.render(true);
            MonksEnhancedJournal.journal.open(actor, event.shiftKey);
        }
    }
}

export class PictureSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.picture",
            template: "modules/monks-enhanced-journal/templates/picture.html"
        });
    }

    get type() {
        return 'picture';
    }

    _entityControls() {
        let ctrls = [
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers }
        ];
        return ctrls.concat(super._entityControls());
    }
}

export class PlaceSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.place",
            template: "modules/monks-enhanced-journal/templates/place.html"
        });
    }

    get type() {
        return 'place';
    }

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchPlaceDescription"), callback: MonksEnhancedJournal.journal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: this.onEditDescription },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: MonksEnhancedJournal.journal.requestConvert }
        ];
        this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html) {
        super.activateListeners(html);
        MonksEnhancedJournal.journal.sheettabs.bind(html[0]);
    }

    refresh() {
        const owner = this.object.isOwner;
        const content = TextEditor.enrichHTML(this.object.data.content, { secrets: owner, entities: true });

        $('.editor-content[data-edit="content"]', MonksEnhancedJournal.journal.element).html(content);
        super.refresh();
    }
}

export class QuestSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.quest",
            template: "modules/monks-enhanced-journal/templates/quest.html"
        });
    }

    getData(data) {
        data = super.getData(data);
        data.statusOptions = {
            inactive: "MonksEnhancedJournal.inactive",
            available: "MonksEnhancedJournal.available",
            inprogress: "MonksEnhancedJournal.inprogress",
            completed: "MonksEnhancedJournal.completed",
            failed: "MonksEnhancedJournal.failed"
        };

        if (this.object?.folder?.name == '_fql_quests') {
            //This is a Forien's quest log, let's try and convert
            let fq = JSON.parse(this.object.data.content);

            let source = '';
            /*
            if (fq.giver != '') {
                let entity = await fromUuid(fq.giver);
                source = entity.name;
            }*/

            let convert = {
                description: fq.description,
                name: fq.title,
                source: source,
                img: fq.splash,
                flags: {
                    'monks-enhanced-journal': {
                        status: (fq.status == 'active' ? 'inprogress' : (fq.status == 'hidden' ? 'inactive' : fq.status)),
                        objectives: fq.tasks.map(t => { return { id: makeid(), content: t.name, status: t.completed } }),
                        items: fq.rewards.filter(r => r.type == 'Item').map(r => { return { id: r.data._id, img: r.data.img, name: r.data.name, qty: 1} })

                    }}
            };
            convert.flags['monks-enhanced-journal'][game.user.id] = fq.gmnotes;

            data = mergeObject(data, convert);
        }

        data.currency = Object.entries(CONFIG[game.system.id.toUpperCase()]?.currencies).map(([k, v]) => {
            return {name: k, value: this.object.getFlag('monks-enhanced-journal', k) };
        });

        return data;
    }

    get defaultObject() {
        return { items: [], objectives: [], seen: false, completed: false };
    }

    get type() {
        return 'quest';
    }

    _entityControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchQuestDescription"), callback: MonksEnhancedJournal.journal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: MonksEnhancedJournal.journal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: this.onEditDescription },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: MonksEnhancedJournal.journal.requestConvert }
        ];
        this.addPolyglotButton(ctrls);
        return ctrls.concat(super._entityControls());
    }

    activateListeners(html) {
        super.activateListeners(html);
        MonksEnhancedJournal.journal.sheettabs.bind(html[0]);

        $('.objective-create', html).on('click', $.proxy(this.createObjective, this));
        $('.objective-edit', html).on('click', $.proxy(this.editObjective, this));
        $('.objective-delete', html).on('click', $.proxy(this._deleteItem, this));

        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));

        let that = this;
        $('.item-assigned input', html).on('change', function (event) {
            let id = $(event.currentTarget).closest('li').attr('data-id');
            let items = that.object.data.flags['monks-enhanced-journal'].items;
            let item = items.find(i => i.id == id);
            if (item) {
                item.assigned = $(this).is(':checked');
                delete item.received;
                that.object.setFlag('monks-enhanced-journal', 'items', items);
                $(event.currentTarget).parent().siblings('.item-received').html('');
            }
        });

        $('.assign-xp', html).on('click', function (event) {
            if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
                game.MonksTokenBar.assignXP(null, { xp: that.object.getFlag('monks-enhanced-journal', 'xp') });
            }
        });
    }

    refresh() {
        const owner = this.object.isOwner;
        const content = TextEditor.enrichHTML(this.object.data.content, { secrets: owner, entities: true });

        $('.editor-content[data-edit="content"]', MonksEnhancedJournal.journal.element).html(content);
        super.refresh();
    }

    async addItem(data) {
        let item;

        if (data.pack) {
            const pack = game.packs.get(data.pack);
            let id = data.id;
            if (data.lookup) {
                if (!pack.index.length) await pack.getIndex();
                const entry = pack.index.find(i => (i._id === data.lookup) || (i.name === data.lookup));
                id = entry.id;
            }
            item = id ? await pack.getDocument(id) : null;
        } else {
            item = game.items.get(data.id);
        }

        if (this.object.data.flags["monks-enhanced-journal"].items == undefined)
            this.object.data.flags["monks-enhanced-journal"].items = [];

        if (item) {
            let olditem = this.object.data.flags["monks-enhanced-journal"].items.find(i => i.id == item.id);
            if (olditem) {
                olditem.qty++;
            } else {
                let newitem = {
                    id: item.id,
                    img: item.img,
                    name: item.name,
                    qty: 1
                };

                if (data.pack)
                    newitem.pack = data.pack;

                this.object.data.flags["monks-enhanced-journal"].items.push(newitem);
            }
            await MonksEnhancedJournal.journal.saveData();
            this.refresh();
        }
    }

    clickItem(event) {
        let target = event.currentTarget;
        let li = target.closest('li');
        event.currentTarget = li;
        TextEditor._onClickEntityLink(event);
    }

    _deleteItem(event) {
        let item = event.currentTarget.closest('.item');
        this.deleteItem(item.dataset.id, item.dataset.container);
    }

    deleteItem(id, container) {
        this.object.data.flags["monks-enhanced-journal"][container].findSplice(i => i.id == id);
        $(`li[data-id="${id}"]`, this.element).remove();
        MonksEnhancedJournal.journal.saveData();
    }

    createObjective() {
        let objective = { status: false };
        if (this.object.data.flags["monks-enhanced-journal"].objectives == undefined)
            this.object.data.flags["monks-enhanced-journal"].objectives = [];
        new Objectives(objective).render(true);
    }

    editObjective(event) {
        let item = event.currentTarget.closest('.item');
        let objective = this.object.data.flags["monks-enhanced-journal"].objectives.find(obj => obj.id == item.dataset.id);
        if (objective != undefined)
            new Objectives(objective).render(true);
    }
}

export class SlideshowSubSheet extends SubSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            text: "MonksEnhancedJournal.slideshow",
            template: "modules/monks-enhanced-journal/templates/slideshow.html"
        });
    }

    get type() {
        return 'slideshow';
    }

    static get defaultObject() {
        return { state: 'stopped', slides: [] };
    }

    getData(data) {
        data = super.getData(data);
        data.showasOptions = { canvas: "Canvas", fullscreen: "Full Screen", window: "Window" };
        if (data.flags["monks-enhanced-journal"].state == undefined)
            data.flags["monks-enhanced-journal"].state = 'stopped';
        data.playing = (data.flags["monks-enhanced-journal"].state != 'stopped');

        let idx = 0;
        if (data.flags["monks-enhanced-journal"].slides) {
            data.slides = data.flags["monks-enhanced-journal"].slides.map(s => {
                let slide = duplicate(s);
                if (slide.background?.color == '')
                    slide.background = `background-image:url(\'${slide.img}\');`;
                else
                    slide.background = `background-color:${slide.background.color}`;

                slide.textbackground = hexToRGBAString(colorStringToHex(slide.text?.background || '#000000'), 0.5);

                slide.topText = (slide.text?.valign == 'top' ? slide.text?.content : '');
                slide.middleText = (slide.text?.valign == 'middle' ? slide.text?.content : '');
                slide.bottomText = (slide.text?.valign == 'bottom' ? slide.text?.content : '');

                return slide;
            });

            if (this.object.data.flags['monks-enhanced-journal'].slideAt && this.object.data.flags['monks-enhanced-journal'].slideAt < data.slides.length)
                data.slides[this.object.data.flags['monks-enhanced-journal'].slideAt].active = true;
        }

        if (this.object.data.flags["monks-enhanced-journal"].state !== 'stopped') {
            data.slideshowing = this.object.data.flags["monks-enhanced-journal"].slides[this.object.data.flags["monks-enhanced-journal"].slideAt];

            if (data.slideshowing.background?.color == '')
                data.slideshowing.background = `background-image:url(\'${data.slideshowing.img}\');`;
            else
                data.slideshowing.background = `background-color:${data.slideshowing.background.color}`;

            data.slideshowing.textbackground = hexToRGBAString(colorStringToHex(data.slideshowing.text?.background || '#000000'), 0.5);

            data.slideshowing.topText = (data.slideshowing.text?.valign == 'top' ? data.slideshowing.text?.content : '');
            data.slideshowing.middleText = (data.slideshowing.text?.valign == 'middle' ? data.slideshowing.text?.content : '');
            data.slideshowing.bottomText = (data.slideshowing.text?.valign == 'bottom' ? data.slideshowing.text?.content : '');

            if (data.slideshowing.transition?.duration > 0) {
                let time = data.slideshowing.transition.duration * 1000;
                let timeRemaining = time - ((new Date()).getTime() - data.slideshowing.transition.startTime);
                data.slideshowing.durprog = (timeRemaining / time) * 100;
            }else
                data.slideshowing.durlabel = i18n("MonksEnhancedJournal.ClickForNext");
        }

        return data;
    }

    _entityControls() {
        let ctrls = [
            { id: 'add', text: i18n("MonksEnhancedJournal.AddSlide"), icon: 'fa-plus', visible: this.object.data.flags["monks-enhanced-journal"].state === 'stopped', conditional: game.user.isGM, callback: this.addSlide },
            { id: 'clear', text: i18n("MonksEnhancedJournal.ClearAll"), icon: 'fa-dumpster', visible: this.object.data.flags["monks-enhanced-journal"].state === 'stopped', conditional: game.user.isGM, callback: this.deleteAll },
            { id: 'play', text: i18n("MonksEnhancedJournal.Play"), icon: 'fa-play', visible: this.object.data.flags["monks-enhanced-journal"].state !== 'playing', conditional: game.user.isGM, callback: this.playSlideshow },
            { id: 'pause', text: i18n("MonksEnhancedJournal.Pause"), icon: 'fa-pause', visible: this.object.data.flags["monks-enhanced-journal"].state === 'playing', conditional: game.user.isGM, callback: this.pauseSlideshow },
            { id: 'stop', text: i18n("MonksEnhancedJournal.Stop"), icon: 'fa-stop', visible: this.object.data.flags["monks-enhanced-journal"].state !== 'stopped', conditional: game.user.isGM, callback: this.stopSlideshow }
        ];
        ctrls = ctrls.concat(super._entityControls());
        let ctrl = ctrls.find(c => c.id == 'locate');
        if (ctrl)
            ctrl.visible = (this.object.data.flags["monks-enhanced-journal"].state === 'stopped');
        return ctrls;
    }

    activateListeners(html) {
        super.activateListeners(html);

        const slideshowOptions = this._getSlideshowContextOptions();
        Hooks.call(`getMonksEnhancedJournalSlideshowContext`, html, slideshowOptions);
        if (slideshowOptions) new ContextMenu($(html), ".slideshow-body .slide", slideshowOptions);

        let that = this;
        html.find('.slideshow-body .slide')
            .click(this.activateSlide.bind(this))
            .dblclick(function (event) {
                let id = event.currentTarget.dataset.slideId;
                that.editSlide(id);
            });
        html.find('.slide-showing').click(this.advanceSlide.bind(this, 1)).contextmenu(this.advanceSlide.bind(this, -1));
    }

    addSlide(data = {}, options = { showdialog: true }) {
        if (this.object.data.flags["monks-enhanced-journal"].slides == undefined)
            this.object.data.flags["monks-enhanced-journal"].slides = [];

        let slide = mergeObject({
            sizing: 'contain',
            background: { color: '' },
            text: { color: '#FFFFFF', background: '#000000', align: 'center', valign: 'middle' },
            transition: { duration: 5, effect: 'fade' }
        }, data);
        //slide.id = makeid();
        //this.object.data.flags["monks-enhanced-journal"].slides.push(slide);

        //MonksEnhancedJournal.createSlide(slide, $('.slideshow-body', this.element));

        if (options.showdialog)
            new SlideConfig(slide).render(true);
    }

    deleteAll() {
        this.object.data.flags["monks-enhanced-journal"].slides = [];
        $(`.slideshow-body`, this.element).empty();
        MonksEnhancedJournal.journal.saveData();
    }

    deleteSlide(id, html) {
        this.object.data.flags["monks-enhanced-journal"].slides.findSplice(s => s.id == id);
        $(`.slide[data-slide-id="${id}"]`, this.element).remove();
        MonksEnhancedJournal.journal.saveData();
    }

    cloneSlide(id) {
        let slide = this.object.data.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        let data = duplicate(slide);
        this.addSlide(data, { showdialog: false });
    }

    editSlide(id, options) {
        let slide = this.object.data.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        if (slide != undefined)
            new SlideConfig(slide, options).render(true);
    }

    activateSlide(event) {
        if (this.object.data.flags["monks-enhanced-journal"].state != 'stopped') {
            let idx = $(event.currentTarget).index();
            this.object.data.flags["monks-enhanced-journal"].slideAt = idx;
            this.playSlide(idx);
        }
    }

    updateButtons() {
        $('.navigation .add', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state === 'stopped');
        $('.navigation .clear', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state === 'stopped');
        $('.navigation .locate', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state === 'stopped');
        $('.navigation .play', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state !== 'playing');
        $('.navigation .pause', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state === 'playing');
        $('.navigation .stop', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state !== 'stopped');
    }

    async playSlideshow(refresh = true) {
        if (this.object.data.flags["monks-enhanced-journal"].slides.length == 0) {
            ui.notifications.warn('Cannot play a slideshow with no slides');
            return;
        }

        if (this.object.data.flags["monks-enhanced-journal"].state == 'playing')
            return;

        if (this.object.data.flags["monks-enhanced-journal"].state == 'stopped') {
            this.object.data.flags["monks-enhanced-journal"].slideAt = 0;
            this.object.sound = undefined;

            if (this.object.data.flags["monks-enhanced-journal"].audiofile != undefined && this.object.data.flags["monks-enhanced-journal"].audiofile != '')
                AudioHelper.play({ src: this.object.data.flags["monks-enhanced-journal"].audiofile, loop: true }).then((sound) => {
                    this.object.sound = sound;
                });
        } else {
            if (this.object.sound && this.object.sound.paused)
                this.object.sound.play();
        }

        let animate = (this.object.data.flags["monks-enhanced-journal"].state != 'paused');
        this.object.data.flags["monks-enhanced-journal"].state = 'playing';
        $('.slide-showing .duration', this.element).show();
        $('.slideshow-container', this.element).toggleClass('playing', this.object.data.flags["monks-enhanced-journal"].state != 'stopped');
        this.subsheet.updateButtons.call(this);

        //inform players
        game.socket.emit(
            MonksEnhancedJournal.SOCKET,
            {
                action: 'playSlideshow',
                args: { id: this.object.id, idx: this.object.data.flags["monks-enhanced-journal"].slideAt }
            }
        );

        if (refresh && this.object.data.flags["monks-enhanced-journal"].state == 'stopped')
            $('.slide-showing .slide', this.element).remove();
        this.subsheet.playSlide(this.object.data.flags["monks-enhanced-journal"].slideAt, animate);

        this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags["monks-enhanced-journal"]});
    }

    pauseSlideshow() {
        let slide = this.object.data.flags["monks-enhanced-journal"].slides[this.object.data.flags["monks-enhanced-journal"].slideAt];
        if (slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        $('.slide-showing .duration', this.element).hide().stop();

        this.object.data.flags["monks-enhanced-journal"].state = 'paused';
        this.subsheet.updateButtons.call(this);

        if (this.object.sound)
            this.object.sound.pause();

        this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags["monks-enhanced-journal"] });
    }

    stopSlideshow() {
        let slide = this.object.data.flags["monks-enhanced-journal"].slides[this.object.data.flags["monks-enhanced-journal"].slideAt];
        if (slide && slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        this.object.data.flags["monks-enhanced-journal"].state = 'stopped';
        this.object.data.flags["monks-enhanced-journal"].slideAt = 0;
        $('.slide-showing .slide', this.element).remove();
        $('.slide-showing .duration', this.element).hide().stop();
        $('.slideshow-container', MonksEnhancedJournal.journal.element).toggleClass('playing', this.object.data.flags["monks-enhanced-journal"].state != 'stopped');
        this.subsheet.updateButtons.call(this);

        if (this.object.sound?.src != undefined) {
            game.socket.emit("stopAudio", { src: this.object.data.flags["monks-enhanced-journal"].audiofile });
            this.object.sound.stop();
            this.object.sound = undefined;
        }

        //inform players
        game.socket.emit(
            MonksEnhancedJournal.SOCKET,
            {
                action: 'stopSlideshow',
                args: { }
            }
        );

        this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags["monks-enhanced-journal"] });
    }

    playSlide(idx, animate = true) {
        let slide = this.object.data.flags["monks-enhanced-journal"].slides[idx];

        //remove any that are still on the way out
        $('.slide-showing .slide.out', this.element).remove();

        if (animate) {
            //remove any old slides
            let oldSlide = $('.slide-showing .slide', this.element);
            oldSlide.addClass('out').animate({ opacity: 0 }, 1000, 'linear', function () { $(this).remove() });

            //bring in the new slide
            let newSlide = MonksEnhancedJournal.createSlide(slide, $('.slide-showing', this.element));
            newSlide.css({ opacity: 0 }).animate({ opacity: 1 }, 1000, 'linear');
        }

        /*
        let background = '';

        this.object.data.flags["monks-enhanced-journal"].slideAt = idx;

        if (slide.background?.color == '')
            background = `background-image:url(\'${slide.img}\');`;
        else
            background = `background-color:${slide.background?.color}`;

        let textBackground = hexToRGBAString(colorStringToHex(slide.text?.background || '#000000'), 0.5);

        let slideShowing = $('.slide-showing', this.element);
        $('.slide-background > div', slideShowing).attr({ style: background });
        $('.slide > img', slideShowing).attr('src', slide.img).css({ 'object-fit': (slide.sizing || 'contain') });
        $('.slide-text > div', slideShowing).css({ 'text-align': slide.text?.align, color: slide.text?.color });
        $('.text-upper > div', slideShowing).css({ 'background-color': textBackground }).html(slide.text?.valign == 'top' ? slide.text?.content : '');
        $('.text-middle > div', slideShowing).css({ 'background-color': textBackground }).html(slide.text?.valign == 'middle' ? slide.text?.content : '');
        $('.text-lower > div', slideShowing).css({ 'background-color': textBackground }).html(slide.text?.valign == 'bottom' ? slide.text?.content : '');
        */

        $(`.slideshow-body .slide:eq(${idx})`, this.element).addClass('active').siblings().removeClass('active');
        $('.slideshow-body', this.element).scrollLeft((idx * 116));
        $('.slide-showing .duration', this.element).empty();

        if (this.object?._currentSlide?.transition?.timer)
            window.clearTimeout(this.object?._currentSlide?.transition?.timer);

        if (slide.transition?.duration > 0) {
            //set up the transition
            let time = slide.transition.duration * 1000;
            slide.transition.startTime = (new Date()).getTime();
            slide.transition.timer = window.setTimeout(this.advanceSlide.bind(this, 1), time);
            $('.slide-showing .duration', this.element).append($('<div>').addClass('duration-bar').css({ width: '0' }).show().animate({width: '100%'}, time, 'linear'));
        } else {
            $('.slide-showing .duration', this.element).append($('<div>').addClass('duration-label').html(i18n("MonksEnhancedJournal.ClickForNext")));
        }

        this.object._currentSlide = slide;

        game.socket.emit(
            MonksEnhancedJournal.SOCKET,
            {
                action: 'playSlide',
                args: {
                    id: this.object.id,
                    idx: idx
                }
            }
        );
    }

    advanceSlide(dir, event) {
        this.object.data.flags["monks-enhanced-journal"].slideAt = this.object.data.flags["monks-enhanced-journal"].slideAt + dir;

        if (this.object.data.flags["monks-enhanced-journal"].slideAt < 0)
            this.object.data.flags["monks-enhanced-journal"].slideAt = 0;
        else if (this.object.data.flags["monks-enhanced-journal"].slideAt >= this.object.data.flags["monks-enhanced-journal"].slides.length) {
            if (this.object.data.flags["monks-enhanced-journal"].loop) {
                this.object.data.flags["monks-enhanced-journal"].slideAt = 0;
                this.playSlide(0, true);
            }
            else
                this.stopSlideshow.call(MonksEnhancedJournal.journal);
        }
        else
            this.playSlide(this.object.data.flags["monks-enhanced-journal"].slideAt, dir > 0);
    }

    _getSlideshowContextOptions() {
        return [
            {
                name: "MonksEnhancedJournal.EditSlide",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM,
                callback: li => {
                    const id = li.data("slideId");
                    //const slide = this.object.data.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    //const options = { top: li[0].offsetTop, left: window.innerWidth - SlideConfig.defaultOptions.width };
                    this.editSlide(id); //, options);
                }
            },
            {
                name: "SIDEBAR.Duplicate",
                icon: '<i class="far fa-copy"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.data("slideId");
                    //const slide = this.object.data.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    return this.cloneSlide(id);
                }
            },
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const id = li.data("slideId");
                    //const slide = this.object.data.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    Dialog.confirm({
                        title: `${game.i18n.localize("SIDEBAR.Delete")} slide`,
                        content: game.i18n.format("SIDEBAR.DeleteWarning", { type: 'slide'}),
                        yes: this.deleteSlide.bind(this, id),
                        options: {
                            top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720
                        }
                    });
                }
            }
        ];
    }
}