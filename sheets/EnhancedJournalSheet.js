import { setting, i18n, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EditFields } from "../apps/editfields.js";
import { SelectPlayer } from "../apps/selectplayer.js";

export class EnhancedJournalSheet extends JournalSheet {
    constructor(object, options = {}) {
        super(object, options);

        if (this.options.tabs.length) {
            let lasttab = this.object.getFlag('monks-enhanced-journal', '_lasttab') || this.options.tabs[0].initial;
            this.options.tabs[0].initial = lasttab;
            this._tabs[0].active = lasttab;
        }

        try {
            this._scrollPositions = JSON.parse(this.object.data.flags['monks-enhanced-journal']?.scrollPos || {});
        } catch (e) { }
    }

    static get defaultOptions() {
        let defOptions = super.defaultOptions;
        let classes = defOptions.classes.concat(['monks-journal-sheet']);
        return foundry.utils.mergeObject(defOptions, {
            id: "enhanced-journal-sheet",
            title: i18n("MonksEnhancedJournal.NewTab"),
            template: "modules/monks-enhanced-journal/templates/blank.html",
            classes: classes,
            dragDrop: [{ dragSelector: "null", dropSelector: ".blank-body" }],
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

    get allowedRelationships() {
        return [];
    }

    _inferDefaultMode() {
        const hasImage = !!this.object.data.img;
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
        data.hasGM = (game.users.find(u => u.isGM && u.active) != undefined);

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
        let mode = options.sheetMode || this._sheetMode;
        if (this.object.limited && mode === "image" && this.object.data.img) {
            const img = this.object.data.img;
            new ImagePopout(this.object.data.img, {
                title: this.object.name,
                uuid: this.object.uuid,
                shareable: false,
                editable: false
            })._render(true);
            return;
        }

        await super._render(force, options);

        log('Subsheet rendering');

        this.updateStyle();
    }

    _canDragStart(selector) {
        return game.user.isGM;
    }

    _canDragDrop(selector) {
        return game.user.isGM;
    }

    _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'JournalEntry' && this.enhancedjournal) {
            let document = game.journal.find(j => j.id == data.id);
            this.enhancedjournal.open(document);
        } else
            return false;
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html);
        this._contextMenu(html);

        $("a.inline-request-roll", html).click(this._onClickInlineRequestRoll.bind(this));//.contextmenu(this._onClickInlineRequestRoll);
        html.on("click", "a.picture-link", this._onClickPictureLink.bind(this));

        $('a[href^="#"]').click(this._onClickAnchor.bind(this));

        $('.sheet-image .profile', html).contextmenu(() => { $('.fullscreen-image').show(); });
        $('.fullscreen-image', html).click(() => { $('.fullscreen-image', html).hide(); });

        html.find('img[data-edit],div.picture-img').click(this._onEditImage.bind(this));

        if (enhancedjournal) {
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
            if (this.object.type == 'base' || this.object.type == 'journalentry' || this.object.type == 'oldentry' || setting("show-menubar")) {
                options = foundry.utils.mergeObject(options, {
                    menubar: true,
                    plugins: CONFIG.TinyMCE.plugins + ' background anchor',
                    toolbar: CONFIG.TinyMCE.toolbar + ' background anchor'//,
                    //font_formats: "Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Oswald=oswald; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats;Anglo Text=anglo_textregular;Lovers Quarrel=lovers_quarrelregular;Play=Play-Regular"
                });
            }
            super.activateEditor(name, options, initialContent);
            //need this because foundry doesn't allow access to the init of the editor
            if (this.object.type == 'base' || this.object.type == 'journalentry' || this.object.type == 'oldentry' || setting("show-menubar")) {
                let count = 0;
                let that = this;
                let data = this.object.getFlag('monks-enhanced-journal', 'style');
                //if (data) {
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
                //}
            }
        }
    }

    _contextMenu(html) {
    }

    _disableFields(form) {
        super._disableFields(form);
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (hasGM)
            $(`textarea[name="flags.monks-enhanced-journal.${game.user.id}.notes"]`, form).removeAttr('disabled').on('change', this._onChangeInput.bind(this));
        $('.editor-edit', form).css({ width: '0px !important', height: '0px !important' });
    }

    static getValue(item, name, defvalue = 0) {
        name = name || pricename();
        if (!item)
            return defvalue;
        let value = (item.data != undefined ? item?.data[name] : item[name]);
        return (value?.hasOwnProperty("value") ? value.value : value) ?? defvalue;
    }

    getValue(item, name, defvalue) {
        return this.constructor.getValue(item, name, defvalue);
    }

    static setValue(item, name, value = 1) {
        let prop = (item.data != undefined ? item.data : item);
        prop[name] = (prop[name] && prop[name].hasOwnProperty("value") ? { value: value } : value);
    }

    setValue(item, name, value) {
        this.constructor.setValue(item, name, value);
    }

    static defaultCurrency() {
        if (MonksEnhancedJournal.currencies["gp"])
            return "gp";
        else {
            if (game.system.id == 'tormenta20')
                return "tp";
            let currencies = Object.keys(MonksEnhancedJournal.currencies);
            return (currencies.length > 0 ? currencies[0] : "");
        }
    }

    static getCurrency(actor, denomination) {
        let coinage;
        if (game.system.id == 'pf2e') {
            let coin = actor.data.items.find(i => { return i.isCoinage && i.data.data.denomination.value == denomination });
            coinage = (coin && this.getValue(coin.data, quantityname(), 0));
        } else if (game.system.id == 'age-system') {
            coinage = parseInt(actor.data.data[denomination]);
        } else if (game.system.id == 'swade') {
            coinage = parseInt(actor.data.data.details.currency);
        } else {
            let coin = this.getValue(actor.data, currencyname());
            coinage = parseInt(this.getValue(coin, denomination));
        }

        return parseInt(coinage ?? 0);
    }

    getCurrency(actor, denomination) {
        return this.constructor.getCurrency(actor, denomination);
    }

    static addCurrency(actor, denomination, value) {
        let newVal = parseInt(this.getCurrency(actor, denomination) ?? 0) + value;
        let updates = {};
        if (game.system.id == 'pf2e') {
            let coinage = actor.data.items.find(i => { return i.isCoinage && i.data.data.denomination.value == denomination });
            updates[`data.quantity`] = newVal;
            return coinage.update(updates);
        } else if (game.system.id == 'age-system') {
            updates[`data.${price.currency}`] = newVal;
        } else if (game.system.id == 'swade') {
            updates[`data.details.currency`] = newVal;
        } else {
            let coin = this.getValue(actor.data, currencyname());
            updates[`data.${currencyname()}.${denomination}`] = (coin[denomination] && coin[denomination].hasOwnProperty("value") ? { value: newVal } : newVal);
        }
        return actor.update(updates);
    }

    addCurrency(actor, denomination, value) {
        return this.constructor.addCurrency(actor, denomination, value);
    }

    static getPrice(item, name) {
        let result = {};

        name = name || pricename();
        var countDecimals = function (value) {
            if (Math.floor(value) !== value)
                return value.toString().split(".")[1].length || 0;
            return 0;
        }

        let cost = (typeof item == "string" ? item : (item.data?.denomination != undefined && name != "cost" ? item.data?.value.value + " " + item.data?.denomination.value : this.getValue(item, name)));

        cost = "" + cost;
        let price = parseFloat(cost.replace(',', ''));
        if (price == 0 || isNaN(price)) {
            return { value: 0, currency: this.defaultCurrency() };
        }
        if (price < 0) {
            result.consume = true;
            price = Math.abs(price);
        }

        let currency = cost.replace(/[^a-z]/gi, '');

        if (currency == "")
            currency = this.defaultCurrency();

        if (parseInt(price) != price) {
            if (["dnd5e", "pf2e", "pf1e"].includes(game.system.id)) {
                if (currency == "ep") {
                    price = price / 2;
                    currency = "gp";
                }

                let decimals = countDecimals(price);
                let curArr = ["pp", "gp", "sp", "cp"];
                let idx = curArr.indexOf(currency);
                let idx2 = Math.min(idx + decimals, 3);

                price = Math.floor(price * (10 ** (idx2 - idx)));
                currency = curArr[idx2];
            } else
                price = Math.floor(price);
        }

        result.value = price;
        result.currency = currency;

        return result;
    }

    getPrice(item, name) {
        return this.constructor.getPrice(item, name);
    }

    _onClickInlineRequestRoll(event) {
        event.preventDefault();
        const a = event.currentTarget;

        if (game.MonksTokenBar) {
            let data = duplicate(a.dataset);
            if (data.dc) data.dc = parseInt(data.dc);
            if (data.fastForward) data.fastForward = true;
            if (data.silent) data.silent = true;

            let requesttype = a.dataset.requesttype.toLowerCase();
            if (requesttype == 'request')
                game.MonksTokenBar.requestRoll(canvas.tokens.controlled, data);
            else if (requesttype == 'contested')
                game.MonksTokenBar.requestContestedRoll({ request: a.dataset.request }, { request: a.dataset.request1 }, data);
        }
    }

    async _onClickPictureLink(event) {
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
                return ui.notifications.warn(`You do not have permission to view this ${document.documentName} sheet.`);
            }
        //}
        if (!document) return;

        new ImagePopout(document.data.img, {
            title: document.name,
            uuid: document.uuid,
            shareable: false,
            editable: false
        })._render(true);

        //if (game.user.isGM)
        //    this._onShowPlayers({ data: { object: document } });
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
        if (this.object.permission < CONST.ENTITY_PERMISSIONS.OWNER)
            return null;

        const fp = new FilePicker({
            type: "image",
            current: this.object.data.img,
            callback: path => {
                $(event.currentTarget).attr('src', path).css({ backgroundImage: `url(${path})` });
                $('img[data-edit="img"]', this.element).css({ opacity: '' });
                $('.tab.picture .instruction', this.element).hide();
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
                documentId: this.object.id,
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
            //if (game.user.isGM || actor.testUserPermission(game.user, "OBSERVER")) {
            if (this.enhancedjournal)
                this.enhancedjournal.open(document, event.shiftKey);
            else
                document.sheet.render(true);
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
            let polyglot = (isNewerVersion(game.modules.get("polyglot").data.version, "1.7.30") ? game.polyglot : polyglot.polyglot);
            let scramble = polyglot.scrambleString(this.textContent, game.settings.get('polyglot', 'useUniqueSalt') ? that.object.id : lang, lang);
            let font = polyglot._getFontStyle(lang);

            $(this).addClass('converted')
                .attr('title', (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || polyglot.known_languages.has(lang) ? polyglot.LanguageProvider.languages[lang] : 'Unknown'))
                .attr('data-language', lang)
                .css({ font: font })
                .data({ text: text, scramble: scramble, lang: lang, font: font, changed: true })
                .html(scramble)
                .click(
                    function () {
                        let data = $(this).data();
                        const lang = data.lang;
                        if (game.user.isGM || that.object.permission == CONST.ENTITY_PERMISSIONS.OWNER || polyglot.known_languages.has(lang)) {
                            $(this).data('changed', !data.changed).html(data.changed ? data.scramble : data.text).css({ font: (data.changed ? data.font : '') });
                        }
                    }
                );
        });
    }

    getItemGroups(data) {
        let type = data?.data?.flags['monks-enhanced-journal'].type;
        let purchasing = data?.data?.flags['monks-enhanced-journal'].purchasing;

        let groups = {};
        for (let item of data.items || data?.data?.flags['monks-enhanced-journal'].items || []) {
            if (!item)
                continue;
            let requests = (Object.entries(item.requests || {})).map(([k, v]) => {
                if (!v)
                    return null;
                let user = game.users.get(k);
                if (!user)
                    return null;
                return { id: user.id, border: user.data.border, color: user.data.color, letter: user.name[0], name: user.name };
            }).filter(r => !!r);

            let hasRequest = (requests.find(r => r.id == game.user.id) != undefined);
            let quantity = this.getValue(item, quantityname(), "");
            let text = (type == 'shop' ?
                (quantity === 0 ? "Sold Out" : (item.lock ? "Unavailable" : "Purchase")) :
                (purchasing == "free" || purchasing == "confirm" ? "Take" : (hasRequest ? "Cancel" : "Request")));
            let icon = (type == 'shop' ?
                (quantity === 0 ? "" : (item.lock ? "fa-lock" : "fa-dollar-sign")) :
                (purchasing == "free" || purchasing == "confirm" ? "fa-hand-paper" : (hasRequest ? "" : "fa-hand-holding-medical")));

            let price = this.getPrice(item);
            let cost = price;
            if (item.data.cost != undefined)
                cost = this.getPrice(item, "cost");
            let itemData = {
                id: item._id,
                name: item.name,
                type: item.type,
                img: item.img,
                hide: item.hide,
                lock: item.lock,
                from: item.from,
                quantity: quantity,
                remaining: item.data?.remaining,
                price: (price.consume ? "-" : "") + price.value + " " + price.currency,
                cost: (cost.consume && (game.user.isGM || this.object.isOwner) ? "-" : "") + (cost.value + " " + cost.currency), //this.getValue(item, "cost") ?? (price.value + " " + price.currency),
                text: text,
                icon: icon,
                assigned: item.assigned,
                received: item.received,
                requests: requests
            };

            if (game.user.isGM || this.object.isOwner || (item.hide !== true && (quantity !== 0 || setting('show-zero-quantity')))) {
                if (groups[item.type] == undefined)
                    groups[item.type] = { name: item.type, items: [] };
                groups[item.type].items.push(itemData);
            }
        }

        for (let [k, v] of Object.entries(groups)) {
            groups[k].items = groups[k].items.sort((a, b) => {
                if (a.name < b.name) return -1;
                return a.name > b.name ? 1 : 0;
            });
        }

        groups = Object.values(groups).sort((a, b) => {
            if (a.name < b.name) return -1;
            return a.name > b.name ? 1 : 0;
        })

        return groups;
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
                            return ui.notifications.warn(`You do not have permission to view this ${document.documentName} sheet.`);
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

    static async createRequestMessage(entry, item, actor) {
        let price = this.getPrice(item, "cost");
        item.sell = price?.value;
        item.currency = price?.currency;
        item.maxquantity = item.maxquantity ?? this.getValue(item, quantityname());
        if (item.maxquantity)
            item.quantity = Math.max(Math.min(item.maxquantity, item.quantity), 1);
        item.total = (price ? item.quantity * item.sell : null);

        let messageContent = {
            action: 'buy',
            actor: { id: actor.id, name: actor.name, img: actor.img },
            items: [item],
            shop: { id: entry.id, name: entry.data.name, img: entry.data.img }
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
            flavor: (speaker.alias ? speaker.alias + ` wants to <b>${price ? 'purchase' : 'take'}</b> an item` : null),
            whisper: whisper,
            flags: {
                'monks-enhanced-journal': messageContent
            }
        };

        ChatMessage.create(messageData, {});
    }

    static async confirmQuantity(item, max, verb, showTotal = true, price) {
        if (!price)
            price = this.getPrice(item, "cost");

        let maxquantity = max != "" ? parseInt(max) : null;
        if (maxquantity == 1 && !showTotal)
            return { quantity: 1, price: price };

        let quantity = 1;
        let content = await renderTemplate('/modules/monks-enhanced-journal/templates/confirm-purchase.html',
            {
                msg: `How many would you like to ${verb}?`,
                img: item.img,
                name: item.name,
                quantity: quantity,
                price: price?.value + " " + price?.currency,
                maxquantity: maxquantity,
                total: (showTotal ? price?.value + " " + price?.currency : null),
                isGM: game.user.isGM
            });
        let result = await Dialog.confirm({
            title: `Confirm Quantity`,
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
                    price = this.getPrice($(event.currentTarget).val());
                    $(event.currentTarget).val(price?.value + " " + price?.currency);
                    if (showTotal)
                        $('.request-total', html).html((quantity * price?.value) + " " + price?.currency);
                });
            },
            yes: (html) => {
                //let quantity = parseInt($('input[name="quantity"]', html).val());
                //let price = this.getPrice(item, $('input[name="price"]', html).val());
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
            let reward = rewards.find(r => r.active);
            if (reward)
                items = reward.items;
        }
        if (items) {
            let item = items.find(i => i._id == id);
            if (item) {
                if (remaining) {
                    item.data.remaining = Math.max(item.data.remaining - quantity, 0);
                    item.received = actor?.name;
                    item.assigned = true;
                } else {
                    let qty = this.getValue(item, quantityname(), "");
                    if (qty != "") {
                        let newQty = Math.max(qty - quantity, 0);
                        this.setValue(item, quantityname(), newQty);
                    }
                }
                if (rewards)
                    entry.setFlag('monks-enhanced-journal', 'rewards', rewards);
                else {
                    if(entry.getFlag('monks-enhanced-journal', 'type') == 'loot')
                        items = items.filter(i => this.getValue(i, quantityname()) > 0);
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
            if (actor.data.permission.default >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER)
                whisper = null;
            else {
                for (let [user, perm] of Object.entries(actor.data.permission)) {
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
                flavor: (actor.alias ? actor.alias : actor.name) + (purchased ? " purchased" : " received") + " an item",
                whisper: whisper,
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
            img: document.img || document.data?.img,
            name: document.name,
            quantity: "1",
            type: document.data.flags['monks-enhanced-journal']?.type
        };

        if (data.pack)
            result.pack = data.pack;

        return result;
    }

    clearAllItems() {
        Dialog.confirm({
            title: `Clear contents`,
            content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>All items will be permanently deleted and cannot be recovered.</p>`,
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

                sheet._submitting = true;
                const states = this.constructor.RENDER_STATES;

                // Process the form data
                const formData = expandObject(sheet._getSubmitData(updateData));

                let items = duplicate(this.object.getFlag('monks-enhanced-journal', 'items') || []);
                let itm = items.find(i => i._id == itemData._id);
                if (itm) {
                    itm = mergeObject(itm, formData);
                    await this.object.setFlag('monks-enhanced-journal', 'items', items);
                }

                mergeObject(sheet.object.data, formData);

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
                let result = sheet.render(true);
                result.options.addcost = true;
            } catch {
                ui.notifications.warn("Error trying to edit this object");
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
        rolltables.push({ text: "Rollable Tables", groups: groups });

        let that = this;

        let html = await renderTemplate("modules/monks-enhanced-journal/templates/roll-table.html", { rollTables: rolltables, useFrom: useFrom});
        Dialog.confirm({
            title: `Populate from Rollable table`,
            content: html,
            yes: async (html) => {
                let rolltable = $('[name="rollable-table"]').val();
                let count = $('[name="count"]').val();
                let clear = $('[name="clear"]').prop("checked");
                let duplicate = $('[name="duplicate"]').val();

                let table = await fromUuid(rolltable);
                if (table) {
                    let items = (clear ? [] : that.object.getFlag('monks-enhanced-journal', itemtype) || []);
                    let currency = that.object.getFlag('monks-enhanced-journal', "currency");
                    let currChanged = false;

                    for (let i = 0; i < count; i++) {
                        let result = await table.draw({ rollMode: "selfroll", displayChat: false });

                        if (!result.results[0])
                            continue;

                        let item = null;

                        if (result.results[0].data.collection === undefined) {
                            //check to see if this is a roll for currency
                            if (this.object.type == 'loot') {
                                async function tryRoll(formula) {
                                    try {
                                        return (await (new Roll(formula)).roll({ async: true })).total || 1;
                                    } catch {
                                        return 1;
                                    }
                                }

                                let text = result.results[0].data.text;
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
                                        if (coin == undefined || coin.length == 0 || MonksEnhancedJournal.currencies[coin] == undefined)
                                            coin = this.constructor.defaultCurrency();

                                        let value = await tryRoll(formula);

                                        currency[coin] = (currency[coin] || 0) + value;
                                        currChanged = true;
                                    }
                                }
                            }
                        } else if (result.results[0].data.collection === "Item") {
                            let collection = game.collections.get(result.results[0].data.collection);
                            if(collection)
                                item = collection.get(result.results[0].data.resultId);
                        } else {
                            // Try to find it in the compendium
                            const items = game.packs.get(result.results[0].data.collection);
                            if (items)
                                item = await items.getDocument(result.results[0].data.resultId);
                        }

                        if (item) {
                            if (itemtype == "items" && item instanceof Item) {
                                let itemData = item.toObject();

                                if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                                    itemData = await EnhancedJournalSheet.createScrollFromSpell(itemData);
                                }

                                let oldId = itemData._id;
                                let oldItem = items.find(i => i.flags['monks-enhanced-journal']?.parentId == oldId);
                                if (oldItem && duplicate != "additional") {
                                    if (duplicate == "increase") {
                                        let oldqty = this.getValue(oldItem, quantityname(), 1);
                                        let newqty = this.getValue(itemData.data, quantityname(), 1);
                                        newqty = parseInt(oldqty) + parseInt(newqty);
                                        this.setValue(oldItem, quantityname(), newqty);
                                    }
                                } else {
                                    itemData._id = makeid();
                                    itemData.flags['monks-enhanced-journal'] = { parentId: oldId };
                                    itemData.from = table.name;
                                    items.push(itemData);
                                }
                            } else if(itemtype == "actors" && item instanceof Actor) {
                                let itemData = {
                                    _id: item.id,
                                    uuid: item.uuid,
                                    img: item.img,
                                    name: item.name,
                                    quantity: 1,
                                    type: "Actor"
                                }
                                if (item.pack)
                                    itemData.pack = item.pack;
                                items.push(itemData);
                            }
                        }
                    }

                    if (items.length > 0)
                        await that.object.setFlag('monks-enhanced-journal', itemtype, items);
                    if (currChanged)
                        await that.object.setFlag('monks-enhanced-journal', "currency", currency);
                }
            },
        });
    }

    _deleteItem(event) {
        let item = event.currentTarget.closest('.item');
        this.deleteItem(item.dataset.id, item.dataset.container);
    }

    deleteItem(id, container, cascade = true) {
        let data = duplicate(this.object.data.flags["monks-enhanced-journal"][container]);
        data.findSplice(i => i.id == id || i._id == id);
        this.object.setFlag('monks-enhanced-journal', container, data);

        if (container == "relationships" && cascade) {
            let journal = game.journal.get(id);
            if (journal) {
                let data = duplicate(journal.data.flags["monks-enhanced-journal"].relationships);
                data.findSplice(i => i.id == this.object.id || i._id == this.object.id);
                journal.setFlag('monks-enhanced-journal', "relationships", data);
            }
        }
    }

    async alterItem(event) {
        $(event.currentTarget).prev().click();
        if ($(event.currentTarget).hasClass('item-hide')) {
            let li = $(event.currentTarget).closest('li.item');
            const id = li.data("id");
            let journal = game.journal.get(id);
            if (journal) {
                let relationships = duplicate(journal.data.flags["monks-enhanced-journal"].relationships);
                let relationship = relationships.find(r => r.id == this.object.id);
                relationship.hidden = $(event.currentTarget).prev().prop('checked');
                journal.setFlag('monks-enhanced-journal', "relationships", relationships);
            }
        }
    }

    async alterRelationship(event) {
        let li = $(event.currentTarget).closest('li.item');
        const id = li.data("id");
        let journal = game.journal.get(id);
        if (journal) {
            if ((this.object.type == "person" && journal.type == "person") || (this.object.type == "organization" && journal.type == "organization"))
                return;
            let relationships = duplicate(journal.data.flags["monks-enhanced-journal"].relationships);
            let relationship = relationships.find(r => r.id == this.object.id);
            relationship.relationship = $(event.currentTarget).val();
            journal.setFlag('monks-enhanced-journal', "relationships", relationships);
        }
    }

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

            if (this.object.data.type == 'blank')
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

            return super.close(options);
        }
    }

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

            if (!object.isOwner) throw new Error("You may only request to show Journal Entries which you own.");

            let args = {
                title: object.name,
                uuid: object.uuid,
                users: (users != undefined ? users.map(u => u.id) : users),
                showid: makeid()
            }
            if (options?.showpic || object.data?.flags["monks-enhanced-journal"]?.type == 'picture')
                args.image = object.data.img;

            if (!object.data.img && !object.data.content)
                return ui.notifications.warn("Cannot show an entry that has no content or image");

            MonksEnhancedJournal.emit("showEntry", args);

            ui.notifications.info(game.i18n.format("MonksEnhancedJournal.MsgShowPlayers", {
                title: object.name,
                which: (users == undefined ? 'all players' : users.map(u => u.name).join(', '))
            }) + (options?.showpic || object.data?.flags["monks-enhanced-journal"]?.type == 'picture' ? ', click <a onclick="game.MonksEnhancedJournal.journal.cancelSend(\'' + args.showid + '\', ' + options?.showpic + ');event.preventDefault();">here</a> to cancel' : ''));

            if (options?.updatepermission) {
                let permissions = {};
                Object.assign(permissions, object.data.permission);
                if (users == undefined)
                    permissions["default"] = CONST.ENTITY_PERMISSIONS.OBSERVER;
                else {
                    users.forEach(user => { permissions[user.id] = CONST.ENTITY_PERMISSIONS.OBSERVER; });
                }
                object.update({ permission: permissions });
            }
        }
    }

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

        let getLootableName = () => {
            let folder = setting('loot-folder');

            //find the folder and find the next available 'Loot Entry (x)'
            let previous = collection.filter(e => {
                return e.data.folder == folder && e.name.startsWith("Loot Entry");
            }).map((e, i) =>
                parseInt(e.name.replace('Loot Entry ', '').replace('(', '').replace(')', '')) || (i + 1)
            ).sort((a, b) => { return b - a; });
            let num = (previous.length ? previous[0] + 1 : 1);

            name = (num == 1 ? 'Loot Entry' : `Loot Entry (${num})`);
            return name;
        }

        let entity;
        if (lootentity != 'create') {
            entity = await collection.get(lootentity);//find the correct entity;
            name = entity?.name;

            if (entity == undefined)
                warn("Could not find Loot Entity, defaulting to creating one");
        }

        if (lootentity == 'create' || entity == undefined) {
            //create the entity in the Correct Folder
            let folder = setting('loot-folder');

            if (name == undefined || name == '')
                name = getLootableName();

            const cls = collection.documentClass;
            if (EnhancedJournalSheet.isLootActor(lootSheet)) {
                entity = await cls.create({ folder: folder, name: name, img: 'icons/svg/chest.svg', type: 'npc', flags: { core: { 'sheetClass': (lootSheet == "lootsheetnpc5e" ? 'dnd5e.LootSheetNPC5e' : 'core.a') } }, permission: { 'default': CONST.ENTITY_PERMISSIONS.OBSERVER } });
                ui.actors.render();
            } else {
                entity = await cls.create({ folder: folder, name: name, permission: { 'default': CONST.ENTITY_PERMISSIONS.OBSERVER } }, { render: false });
                await entity.setFlag('monks-enhanced-journal', 'type', 'loot');
                await entity.setFlag('monks-enhanced-journal', 'purchasing', 'confirm');
                ui.journal.render();
            }
        }

        if (!entity)
            return ui.notifications.warn("Could not find Loot Entity");

        if (clear && lootentity != 'create') {
            if (EnhancedJournalSheet.isLootActor(lootSheet)) {
                for (let item of entity.items) {
                    await item.delete();
                }
            } else {
                await entity.setFlag('monks-enhanced-journal', 'items', []);
            }
        }

        let newitems = items.map(i => {
            let item = duplicate(i);
            item._id = makeid();
            return (item.data.remaining > 0 ? item : null);
        }).filter(i => i);

        if (EnhancedJournalSheet.isLootActor(lootSheet)) {
            entity.createEmbeddedDocuments("Item", newitems);

            let newcurr = entity.data.data.currency || {};
            for (let curr of Object.keys(MonksEnhancedJournal.currencies)) {
                if (currency[curr]) {
                    newVal = parseInt(this.getValue(newcurr, curr) + (currency[curr] || 0));
                    this.setValue(newcurr, curr, newVal);
                }
            }

            if (Object.keys(newcurr).length > 0) {
                let data = {};
                data[currencyname()] = newcurr;
                entity.update({ data: data });
            }
        } else if (lootSheet == 'monks-enhanced-journal') {
            let loot = duplicate(entity.getFlag('monks-enhanced-journal', 'items') || []);

            loot = loot.concat(newitems);
            await entity.setFlag('monks-enhanced-journal', 'items', loot);

            let newcurr = entity.getFlag("monks-enhanced-journal", "currency") || {};
            for (let curr of Object.keys(MonksEnhancedJournal.currencies)) {
                if (currency[curr]) {
                    newcurr[curr] = parseInt(EnhancedJournalSheet.getValue(newcurr, curr) + (currency[curr] || 0));
                }
            }
            await entity.setFlag('monks-enhanced-journal', 'currency', newcurr);
        }

        ui.notifications.info(`Items added to ${entity.name}`);

        //set the currency to 0 and the remaining to 0 for all items
        for (let item of items) {
            if (item.data.remaining > 0) {
                item.data.remaining = 0;
                item.received = entity.name;
                item.assigned = true;
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
        const chatData = item.getChatData({ secrets: false });

        // Toggle summary
        if (li.hasClass("expanded")) {
            let summary = li.children(".item-summary");
            summary.slideUp(200, () => summary.remove());
        } else {
            let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
            let props = $('<div class="item-properties"></div>');
            chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
            div.append(props);
            li.append(div.hide());
            div.slideDown(200);
        }
        li.toggleClass("expanded");
    }

    async addRelationship(relationship, cascade = true) {
        let entity = game.journal.get(relationship.id);
        relationship.type = entity.type;
        if (this.allowedRelationships.includes(relationship.type)) {
            let relationships = duplicate(this.object.data.flags["monks-enhanced-journal"].relationships || []);

            //only add one item
            if (relationships.find(t => t.id == relationship.id) != undefined)
                return;

            relationships.push(relationship);
            this.object.setFlag("monks-enhanced-journal", "relationships", relationships);

            //add the reverse relationship
            if (cascade) {
                let original = game.journal.get(relationship.id);
                let sheet = original.sheet;
                sheet.addRelationship({ id: this.object.id, type: original.type, hidden: false }, false);
            }
        }
    }

    openRelationship(event) {
        let item = event.currentTarget.closest('.item');
        let journal = game.journal.find(s => s.id == item.dataset.id);
        this.open(journal);
    }

    static async createScrollFromSpell(itemData) {

        // Get spell data
        const {
            actionType, description, source, activation, duration, target, range, damage, formula, save, level
        } = itemData.data;

        // Get scroll data
        const scrollUuid = `Compendium.${CONFIG.DND5E.sourcePacks.ITEMS}.${CONFIG.DND5E.spellScrollIds[level]}`;
        const scrollItem = await fromUuid(scrollUuid);
        const scrollData = scrollItem.toObject();
        delete scrollData._id;

        // Split the scroll description into an intro paragraph and the remaining details
        const scrollDescription = scrollData.data.description.value;
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
            data: {
                description: { value: desc.trim() }, source, actionType, activation, duration, target, range, damage, formula,
                save, level
            }
        });
        return spellScrollData;
    }
}