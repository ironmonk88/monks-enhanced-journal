import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { ListEdit } from "../apps/listedit.js";

export class ListSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        this.initialize();
    }

    get type() {
        return 'list';
    }

    get sheetTemplates() {
        delete _templateCache["modules/monks-enhanced-journal/templates/sheets/list-template.html"];
        return {
            listItemTemplate: "modules/monks-enhanced-journal/templates/sheets/list-template.html"
        };
    }

    get hasNumbers() {
        return false;
    }

    static get defaultObject() {
        return { items: [], folders: [] };
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.list"),
            template: "modules/monks-enhanced-journal/templates/sheets/list.html",
            dragDrop: [
                { dragSelector: ".list-item", dropSelector: ".list-list" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            filters: [{ inputSelector: 'input[name="search"]', contentSelector: ".list-list" }],
            contextMenuSelector: ".document",
            scrollY: [".list-list"]
        });
    }

    initialize() {
        let idx = 0;
        this.folders = (this.object?.flags['monks-enhanced-journal']?.folders || []).map(f => { if (f.parent == '') f.parent = null; return { id: f.id, name: f.name, data: f, sort: idx++ }; });
        idx = 0;
        this.items = (this.object?.flags['monks-enhanced-journal']?.items || []).map(i => { return { id: i.id, data: i, sort: idx++ }; });
        // Build Tree
        this.tree = this.constructor.setupFolders(this.folders, this.items);
    }

    async getData(options) {
        let data = await super.getData();

        data.tree = this.tree;
        data.canCreate = this.object.isOwner;

        return data;
    }

    async _render(force = false, options = {}) {
        if (options.reload)
            this.initialize();
        super._render(force, options);
    }

    async _renderInner(...args) {
        await loadTemplates(this.sheetTemplates);
        return super._renderInner(...args);
    }

    _documentControls() {
        let ctrls = [
            { id: 'sheet-config', text: i18n("MonksEnhancedJournal.ChangeSheetType"), icon: 'fa-cog', conditional: game.user.isGM, callback: (ev) => { this._onConfigureSheet(ev) } },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    get canPlaySound() {
        return false;
    }

    static setupFolders(folders, documents) {
        //documents = documents.filter(d => d.visible);
        const depths = [];
        const handled = new Set();

        // Iterate parent levels
        const root = { id: null };
        let batch = [root];
        for (let i = 0; i < CONST.FOLDER_MAX_DEPTH; i++) {
            depths[i] = [];
            for (let folder of batch) {
                if (handled.has(folder.id)) continue;

                // Classify content for this folder
                try {
                    [folders, documents] = this._populate(folder, folders, documents);

                } catch (err) {
                    console.error(err);
                    continue;
                }

                // Add child folders to the correct depth level
                depths[i] = depths[i].concat(folder.children);
                folder.depth = i;
                handled.add(folder.id);
            }
            batch = depths[i];
        }

        // Populate content to any remaining folders and assign them to the root level
        const remaining = depths[CONST.FOLDER_MAX_DEPTH - 1].concat(folders);
        for (let f of remaining) {
            [folders, documents] = this._populate(f, folders, documents, { allowChildren: false });
        }
        depths[0] = depths[0].concat(folders);

        // Filter folder visibility
        let ownershipLevels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
        for (let i = CONST.FOLDER_MAX_DEPTH - 1; i >= 0; i--) {
            depths[i] = depths[i].reduce((arr, f) => {
                f.children = f.children.filter(c => {
                    let ownership = c.ownership || { default: ownershipLevels.OBSERVER };
                    return game.user.isGM || ownership?.default >= ownershipLevels.LIMITED || ownership[game.user.id] >= ownershipLevels.LIMITED;
                });
                //let ownership = f.ownership || {};
                //if (!(game.user.isGM || f.ownership?.default >= ownershipLevels.LIMITED || f.ownership[game.user.id] >= ownershipLevels.LIMITED)) return arr;
                f.depth = i + 1;
                arr.push(f);
                return arr;
            }, []);
        }

        // Return the root level contents of folders and documents
        return {
            root: true,
            content: root.content.concat(documents),
            children: depths[0]
        };
    }

    static _populate(folder, folders, documents, { allowChildren = true } = {}) {
        const id = folder.id;

        // Define sorting function for this folder
        const s = (a, b) => a.sort - b.sort;

        let ownershipLevels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
        // Partition folders into children and unassigned folders
        let [u, children] = folders
            /*.filter((f) => {
                let ownership = c.data.ownership || { default: ownershipLevels.OBSERVER };
                return game.user.isGM || ownership?.default >= ownershipLevels.LIMITED || ownership[game.user.id] >= ownershipLevels.LIMITED;
            })*/
            .partition((f) => allowChildren && (f.data?.parent === id || (f.data?.parent == undefined && id == null)));
        folder.children = children.sort((a, b) => a.name.localeCompare(b.name));
        folders = u;

        // Partition documents into contents and unassigned documents
        const [docs, content] = documents
            .filter((e) => {
                let ownership = e.data.ownership || { default: ownershipLevels.OBSERVER };
                return game.user.isGM || ownership?.default >= ownershipLevels.LIMITED || ownership[game.user.id] >= ownershipLevels.LIMITED;
            })
            .partition((e) => e.data?.folder === id || (e.data?.folder == undefined && id == null));
        folder.content = content.sort((a, b) => a.sort - b.sort);
        documents = docs;

        // Return the remainder
        return [folders, documents];
    }

     _onSearchFilter(event, query, rgx, html) {
        const isSearch = !!query;
        let documentIds = new Set();
        let folderIds = new Set();

        // Match documents and folders
        if ( isSearch ) {

            // Match document names
            for ( let d of this.items ) {
                if ( rgx.test(SearchFilter.cleanQuery(d.data.text)) ) {
                    documentIds.add(d.id);
                    if ( d.data.folder ) folderIds.add(d.data.folder);
                }
            }

            // Match folder tree
            const includeFolders = fids => {
                const folders = this.folders.filter(f => fids.has(f.id));
                const pids = new Set(folders.filter(f => f.data.parent).map(f => f.data.parent));
                if ( pids.size ) {
                    pids.forEach(p => folderIds.add(p));
                    includeFolders(pids);
                }
            };
            includeFolders(folderIds);
        }

        // Toggle each directory item
        for ( let el of html.querySelectorAll(".list-item") ) {

            // Entities
            if (el.classList.contains("document")) {
                el.style.display = (!isSearch || documentIds.has(el.dataset.documentId)) ? "flex" : "none";
            }

            // Folders
            if (el.classList.contains("folder")) {
                let match = isSearch && folderIds.has(el.dataset.folderId);
                el.style.display = (!isSearch || match) ? "flex" : "none";
                if (isSearch && match) el.classList.remove("collapsed");
                else el.classList.toggle("collapsed", !this.folders.find(f => f.id == el.dataset.folderId).data.expanded);
            }
        }
     }

    collapseAll() {
        $(this.element).find('li.folder').addClass("collapsed");
        let folders = duplicate(this.object.flags['monks-enhanced-journal'].folders || []);
        for (let f of folders) {
            f.expanded = false;
        }

        this.object.setFlag('monks-enhanced-journal', 'folders', folders);
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        const list = html.find(".list-list");
        const entries = list.find(".list-item");

        // Folder-level events
        html.find('.create-item').click((ev) => { new ListEdit({ data: {}}, this).render(true) });
        html.find('.collapse-all').click(this.collapseAll.bind(this));
        html.find(".folder .folder .folder .create-folder").remove(); // Prevent excessive folder nesting
        if (game.user.isGM) html.find('.create-folder').click(ev => this._onCreateFolder(ev));

        // Entry-level events
        list.on("dblclick", ".document.item", (event) => {
            let id = event.currentTarget.closest("li.document").dataset.documentId;
            const item = this.items.find(i => i.id == id);
            if (!item) return;

            new ListEdit(item, this).render(true);
        });
        list.on("click", ".folder-header", this._toggleFolder.bind(this));
        const dh = this._onDragHighlight.bind(this);
        html.find(".folder").on("dragenter", dh).on("dragleave", dh);

        this._searchFilters = this.options.filters.map(f => {
            f.callback = this._onSearchFilter.bind(this);
            return new SearchFilter(f);
        }).forEach(f => f.bind(html[0]));

        $('.document', html).on("contextmenu", (event) => {
            var r = document.querySelector(':root');
            r.style.setProperty('--mej-context-x', event.originalEvent.offsetX + "px");
            r.style.setProperty('--mej-context-y', event.originalEvent.offsetY + "px");
        });
    }

    _onClickDocumentName(event) {
        event.preventDefault();
        const element = event.currentTarget;
        let li = $(element).closest('li')[0];
        let item = this.items.find(i => i.id === li.dataset.documentId);

        //edit the item
        const options = { width: 520, left: window.innerWidth - 630, top: li.offsetTop, type: 'item' };
        this.createDialog(item.data, options);
    }

    async _onCreateItem(event) {
        event.preventDefault();
        event.stopPropagation();
        const button = event.currentTarget;
        const data = { folder: button.dataset.folder };
        const options = { width: 520, left: window.innerWidth - 630, top: button.offsetTop, type: 'item' };
        this.createDialog(data, options);
    }

    _onCreateFolder(event) {
        event.preventDefault();
        event.stopPropagation();
        const button = event.currentTarget;
        const parent = button.dataset.parentFolder;
        const data = { parent: parent ? parent : null };
        const options = { top: button.offsetTop, left: window.innerWidth - 310 - FolderConfig.defaultOptions.width, type: 'folder' };
        this.createDialog(data, options);
    }

    updateData(data) {
    }

    async createDialog(data = {}, options = {}) {
        let that = this;
        // Collect data
        const folders = this.folders;//.filter(f => f.displayed);
        const label = (data.id ? (options.type == 'folder' ? game.i18n.localize("FOLDER.Update") : i18n("MonksEnhancedJournal.UpdateEntry"))
            : (options.type == 'folder' ? game.i18n.localize("FOLDER.Create") : game.i18n.format("DOCUMENT.Create", { type: (options.type == 'folder' ? game.i18n.localize("DOCUMENT.Folder") : i18n("MonksEnhancedJournal.Entry")) })));
        const title = label + (data.id && options.type == 'folder' ? ' : ' + data.name : '');

        // Render the entity creation form
        const html = await renderTemplate(`modules/monks-enhanced-journal/templates/sheets/list${options.type}.html`, {
            data: data,
            name: data.name || game.i18n.format("DOCUMENT.New", { type: options.type }),
            folder: data.folder,
            folders: folders,
            hasFolders: folders.length > 0,
            hasNumber: this.hasNumbers
        });

        // Render the confirmation dialog window
        return Dialog.prompt({
            title: title,
            content: html,
            label: label,
            callback: html => {
                const form = html[0].querySelector("form");
                const fd = new FormDataExtended(form);
                data = foundry.utils.mergeObject(data, fd.object);
                if (!data.folder) delete data["folder"];

                this.updateData(data);

                let collection = duplicate((options.type == 'folder' ? that.object.flags['monks-enhanced-journal']?.folders : that.object.flags['monks-enhanced-journal']?.items) || []);
                if (data.id == undefined) {
                    data.id = makeid();
                    collection.push(data);
                } else {
                    let document = collection.find(i => i.id == data.id);
                    document = mergeObject(document, data);
                }

                that.object.setFlag('monks-enhanced-journal', (options.type == 'folder' ? 'folders' : 'items'), collection);
            },
            rejectClose: false,
            options: options
        });
    }

    async _toggleFolder(event) {
        let elem = $(event.currentTarget.parentElement);
        let collapsed = elem.hasClass("collapsed");
        let folders = duplicate(this.object.flags['monks-enhanced-journal']?.folders || []);
        let id = elem.attr("data-folder-id");
        let folder = folders.find(f => f.id == id);
        if (folder) folder.expanded = collapsed;

        if (collapsed)
            elem.removeClass("collapsed");
        else {
            elem.addClass("collapsed");
            const subs = elem.find('.folder').addClass("collapsed");
            subs.each((i, f) => {
                let folder = folders.find(f => f.id == id);
                if (folder) folder.expanded = false;
            });
        }

        await this.object.setFlag('monks-enhanced-journal', 'folders', folders);
    }

    _onDragStart(event) {
        if ($(event.currentTarget).hasClass("sheet-icon"))
            return super._onDragStart(event);

        let li = event.currentTarget.closest(".list-item");
        if (li) {
            const isFolder = li.classList.contains("folder");
            const dragData = isFolder ?
                { type: "Folder", id: li.dataset.folderId } :
                { type: "ListItem", id: li.dataset.documentId, uuid: `${this.object.uuid}.Item.${li.dataset.documentId}` };
            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
            this._dragType = dragData.type;
        }
    }

    _canDragStart(selector) {
        if (selector == ".sheet-icon") return game.user.isGM;
        return this.object.isOwner;
    }

    _onDragHighlight(event) {
        const li = event.currentTarget;
        if (!li.classList.contains("folder")) return;
        event.stopPropagation();  // Don't bubble to parent folders

        // Remove existing drop targets
        if (event.type === "dragenter") {
            for (let t of li.closest(".list-list").querySelectorAll(".droptarget")) {
                t.classList.remove("droptarget");
            }
        }

        // Remove current drop target
        if (event.type === "dragleave") {
            const el = document.elementFromPoint(event.clientX, event.clientY);
            const parent = el.closest(".folder");
            if (parent === li) return;
        }

        // Add new drop target
        li.classList.toggle("droptarget", event.type === "dragenter");
    }

    _onDrop(event) {
        // Try to extract the data
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        // Identify the drop target
        const selector = this._dragDrop[0].dropSelector;
        const target = event.target.closest(".list-item") || null;

        // Call the drop handler
        switch (data.type) {
            case "Folder":
                return this._handleDroppedFolder(target, data);
            case "ListItem":
                return this._handleDroppedDocument(target, data);
        }
    }

    async _handleDroppedDocument(target, data) {
        let items = duplicate(this.object.flags['monks-enhanced-journal'].items || []);
        // Determine the closest folder ID
        const closestFolder = target ? target.closest(".folder") : null;
        if (closestFolder) closestFolder.classList.remove("droptarget");
        const closestFolderId = closestFolder ? closestFolder.dataset.folderId : null;

        // Obtain the dropped document
        const item = items.find(i => i.id == data.id);
        if (!item) return;

        let from = items.findIndex(a => a.id == data.id);
        let to = items.length - 1; //if there's no target then add to the end of the root

        if (target == undefined)
            delete item.folder;
        else {
            if (data.id === target.dataset.documentId) return; // Don't drop on yourself

            if ($(target).hasClass('folder')) {
                //if this is dropping on a folder then add to the end of a folder
                let folderItems = items.filter(i => i.folder == target.dataset.folderId);
                if(folderItems.length)
                    to = items.findIndex(a => a.id == folderItems[folderItems.length - 1]);
                item.folder = target.dataset.folderId;
            } else {
                //if this is dropping on an item...
                if (item.folder != closestFolderId)
                    item.folder = closestFolderId;
                to = items.findIndex(a => a.id == target.dataset.documentId);
            }
        }

        if (from != to)
            items.splice(to, 0, items.splice(from, 1)[0]);
        await this.object.setFlag('monks-enhanced-journal', 'items', items);
    }

    async _handleDroppedFolder(target, data) {
        let folders = duplicate(this.object.flags['monks-enhanced-journal'].folders || []);

        // Determine the closest folder ID
        const closestFolder = target ? target.closest(".folder") : null;
        if (closestFolder) closestFolder.classList.remove("droptarget");
        const closestFolderId = closestFolder ? closestFolder.dataset.folderId : null;

        // Obtain the dropped document
        const folder = folders.find(i => i.id == data.id);
        if (!folder) return;

        let from = folders.findIndex(a => a.id == data.id);
        let to = folders.length - 1; //if there's no target then add to the end of the root

        if (target == undefined)
            delete folder.parent;
        else {
            if (data.id === target.dataset.folderId) return; // Don't drop on yourself

            folder.parent = closestFolderId;
            /*
            //if the target shares the same parent
            if (folder.parent == closestFolderId) {
                if ($(target).hasClass('folder')) {
                    to = folders.findIndex(a => a.id == target.dataset.folderId);
                }
            } else {
                //else change parent and add to the bottom of the new folder
                folder.parent = closestFolderId;
            }*/
        }

        if (from != to)
            folders.splice(to, 0, folders.splice(from, 1)[0]);

        await this.object.setFlag('monks-enhanced-journal', 'folders', folders);
    }

    async _deleteFolder(folder, options, userId) {
        let folders = duplicate(this.object.flags['monks-enhanced-journal']?.folders || []);
        let items = duplicate(this.object.flags['monks-enhanced-journal']?.items || []);
        const parentId = folder.data.parent || null;
        const { deleteSubfolders, deleteContents } = options;

        let getSubfolders = function(id, recursive = false) {
            let subfolders = folders.filter(f => f.parent === id);
            if (recursive && subfolders.length) {
                for (let f of subfolders) {
                    const children = getSubfolders(f.id, true);
                    subfolders = subfolders.concat(children);
                }
            }
            return subfolders;
        }

        // Delete or move sub-Folders
        const deleteFolderIds = [folder.id];
        for (let f of getSubfolders(folder.id)) {
            if (deleteSubfolders) deleteFolderIds.push(f.id);
            else f.parent = parentId;
        }
        for (let f of deleteFolderIds)
            folders.findSplice(i => i.id === f);

        // Delete or move contained Documents
        const deleteDocumentIds = [];
        for (let d of items) {
            if (!deleteFolderIds.includes(d.folder)) continue;
            if (deleteContents) deleteDocumentIds.push(d.id);
            else d.folder = parentId;
        }
        for (let d of deleteDocumentIds)
            items.findSplice(i => i.id === d);

        await this.object.setFlag('monks-enhanced-journal', 'folders', folders);
        await this.object.setFlag('monks-enhanced-journal', 'items', items);
    }

    _contextMenu(html) {

        // Folder Context
        const folderOptions = this._getFolderContextOptions();

        // Entity Context
        const entryOptions = this._getEntryContextOptions();

        // Create ContextMenus
        if (folderOptions) new ContextMenu(html, ".folder .folder-header", folderOptions);
        if (entryOptions) new ContextMenu(html, this.options.contextMenuSelector, entryOptions);
    }

    _getFolderContextOptions() {
        let that = this;
        return [
            {
                name: "FOLDER.Edit",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM || this.object.isOwner,
                callback: header => {
                    const li = header.parent()[0];
                    const folder = this.folders.find(f => f.id == li.dataset.folderId);
                    const options = { top: li.offsetTop, left: window.innerWidth - 310 - FolderConfig.defaultOptions.width, type: 'folder' };
                    this.createDialog(folder.data, options);
                }
            },
            {
                name: "FOLDER.Remove",
                icon: '<i class="fas fa-trash"></i>',
                condition: game.user.isGM || this.object.isOwner,
                callback: header => {
                    const li = header.parent();
                    const folder = that.folders.find(f => f.id == li.data("folderId"));
                    return Dialog.confirm({
                        title: `${game.i18n.localize("FOLDER.Remove")} ${folder?.data?.name}`,
                        content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.localize("FOLDER.RemoveWarning")}</p>`,
                        yes: () => that._deleteFolder(folder, { deleteSubfolders: false, deleteContents: false }),
                        options: {
                            top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720,
                            width: 400
                        }
                    });
                }
            },
            {
                name: "FOLDER.Delete",
                icon: '<i class="fas fa-dumpster"></i>',
                condition: game.user.isGM || this.object.isOwner,
                callback: header => {
                    const li = header.parent();
                    const folder = that.folders.find(f => f.id == li.data("folderId"));
                    return Dialog.confirm({
                        title: `${game.i18n.localize("FOLDER.Delete")} ${folder?.data?.name}`,
                        content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.localize("FOLDER.DeleteWarning")}</p>`,
                        yes: () => that._deleteFolder(folder, { deleteSubfolders: true, deleteContents: true }),
                        options: {
                            top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720,
                            width: 400
                        }
                    });
                }
            }
        ];
    }

    _getEntryContextOptions() {
        let that = this;
        return [
            {
                name: i18n("MonksEnhancedJournal.EditItem"),
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM || this.object.isOwner,
                callback: async (li) => {
                    const item = that.items.find(i => i.id == li[0].dataset.documentId);
                    if (!item) return;

                    new ListEdit(item, that).render(true);
                }
            },
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM || this.object.isOwner,
                callback: li => {
                    const item = that.items.find(i => i.id == li[0].dataset.documentId);
                    if (!item) return;
                    return Dialog.confirm({
                        title: i18n("MonksEnhancedJournal.DeleteItem"),
                        content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.format("SIDEBAR.DeleteWarning", { type: "List Item" })}</p>`,
                        yes: () => {
                            let items = (that.object.flags['monks-enhanced-journal'].items || []);
                            items.findSplice(i => i.id === item.id);
                            that.object.setFlag('monks-enhanced-journal', 'items', items);
                        },
                        options: {
                            top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720,
                            width: 400
                        }
                    });
                }
            },
            {
                name: "SIDEBAR.Duplicate",
                icon: '<i class="far fa-copy"></i>',
                condition: () => game.user.isGM || this.object.isOwner,
                callback: li => {
                    let items = (that.object.flags['monks-enhanced-journal'].items || []);
                    const original = items.find(i => i.id == li.data("documentId"));
                    let newItem = duplicate(original);
                    items.push(newItem);
                    that.object.setFlag('monks-enhanced-journal', 'items', items);
                }
            },
            {
                name: "OWNERSHIP.Configure",
                icon: '<i class="fas fa-lock"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    let items = (that.object.flags['monks-enhanced-journal'].items || []);
                    const document = items.find(i => i.id == li.data("documentId"));
                    document.ownership = document.ownership || { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER };
                    document.apps = [];
                    document.uuid = document.id;
                    document.isOwner = game.user.isGM;
                    let docOwnership = new DocumentOwnershipConfig(document, {
                        top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                        left: window.innerWidth - 720
                    })

                    docOwnership._updateObject = async function (event, formData) {
                        event.preventDefault();
                        if (!game.user.isGM) throw new Error("You do not have the ability to configure permissions.");
                        // Collect new ownership levels from the form data
                        const ownershipLevels = {};
                        for (let [user, level] of Object.entries(formData)) {
                            ownershipLevels[user] = level;
                        }

                        // Update a single Document
                        document.ownership = ownershipLevels;
                        delete document.apps;
                        delete document.uuid;
                        delete document.isOwner;
                        that.object.setFlag('monks-enhanced-journal', 'items', items);
                    }

                    docOwnership._canUserView = function(user) {
                        return user.isGM;
                    }

                    docOwnership.render(true, { editable: true });
                }
            }
        ];
    }
}

export class CheckListSheet extends ListSheet {
    get sheetTemplates() {
        delete _templateCache["modules/monks-enhanced-journal/templates/sheets/list-template-checklist.html"];
        return {
            listItemTemplate: "modules/monks-enhanced-journal/templates/sheets/list-template-checklist.html"
        };
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        const list = html.find(".list-list");
        const entries = list.find(".list-item");
        entries.on("click", ".item-checked", this._onCheckItem.bind(this));
    }

    _onCheckItem(event) {
        event.preventDefault();
        const element = event.currentTarget;
        let li = $(element).closest('li')[0];

        let items = duplicate(this.object.flags['monks-enhanced-journal']?.items || []);
        let item = items.find(i => i.id == li.dataset.documentId);

        if (item) {
            item.checked = $(element).prop('checked');
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        }
    }
}

export class PollListSheet extends ListSheet {
    constructor(data, options) {
        super(data, options);

        this._expand = {};
    }

    get hasNumbers() {
        return "count";
    }

    get sheetTemplates() {
        delete _templateCache["modules/monks-enhanced-journal/templates/sheets/list-template-poll.html"];
        return {
            listItemTemplate: "modules/monks-enhanced-journal/templates/sheets/list-template-poll.html"
        };
    }

    async getData(options) {
        let data = await super.getData();

        let calcPercent = function (folder) {
            let max = game.users.size;
            //+++ setting for max percentage based on total players or max votes.
            if (false) {
                for (let item of folder.content) {
                    let count = parseInt(item.data.count || 0);
                    if (Number.isInteger(count))
                        max = Math.max(max, count);
                }
            }

            for (let item of folder.content) {
                let count = parseInt(item.data.count || 0);
                item.percent = count == 0 ? 0 : Math.clamped(count / max, 0, 1) * 100;

                item.voted = (item.data.players || []).includes(game.user.id);

                item.players = (item.data.players || []).map(p => {
                    let user = game.users.get(p);
                    if (!user) return null;
                    return {
                        color: user?.color,
                        letter: user?.name[0],
                        username: user?.name
                    };
                }).filter(p => !!p);
            }

            for (let child of folder.children) {
                calcPercent(child);
            }
        }

        let tree = this.tree;
        calcPercent(tree);

        return data;
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        $('.vote-button', html).click(this.vote.bind(this));
        $('.poll-toggle', html).click(this._onToggleBar.bind(this));
    }

    _disableFields(form) {
        super._disableFields(form);
        let hasGM = (game.users.find(u => u.isGM && u.active) != undefined);
        if (hasGM)
            $(`.vote-button`, form).removeAttr('disabled').removeAttr('readonly');
    }

    _onToggleBar(event) {
        event.preventDefault();
        let li = event.currentTarget.closest('li.list-item');
        let id = li.dataset.documentId;
        if (this._expand[id]) return this.collapse(li);
        else return this.expand(li);
    }

    async collapse(li) {
        let id = li.dataset.documentId;
        if (!this._expand[id]) return true;
        const toggle = $(li).find(".poll-toggle");
        const icon = toggle.children("i");
        const bar = $(li).find(".poll-description");
        return new Promise(resolve => {
            bar.slideUp(200, () => {
                bar.addClass("collapsed");
                icon.removeClass("fa-caret-down").addClass("fa-caret-up");
                this._expand[id] = false;
                resolve(true);
            });
        });
    }

    async expand(li) {
        let id = li.dataset.documentId;
        if (this._expand[id]) return true;
        const toggle = $(li).find(".poll-toggle");
        const icon = toggle.children("i");
        const bar = $(li).find(".poll-description");
        return new Promise(resolve => {
            bar.slideDown(200, () => {
                bar.css("display", "");
                bar.removeClass("collapsed");
                icon.removeClass("fa-caret-up").addClass("fa-caret-down");
                this._expand[id] = true;
                resolve(true);
            });
        });
    }

    async vote(ev) {
        let li = ev.currentTarget.closest(".list-item");
        let id = li.dataset.documentId;

        let items = duplicate(getProperty(this.object, "flags.monks-enhanced-journal.items"));
        let item = items.find(i => i.id == id);

        let ownershipLevels = CONST.DOCUMENT_OWNERSHIP_LEVELS;
        let ownership = item.ownership || { default: ownershipLevels.OBSERVER };
        let canVote = game.user.isGM || ownership?.default >= ownershipLevels.OBSERVER || ownership[game.user.id] >= ownershipLevels.OBSERVER;

        if (!canVote)
            return;

        if (game.user.isGM) {
            if (item) {
                if ((item.players || []).includes(game.user.id)) {
                    item.players = item.players.filter(p => p != game.user.id);
                    if (item.count > 0)
                        item.count--;
                } else {
                    item.players = (item.players || []);
                    item.players.push(game.user.id);
                    item.count = (item.count || 0) + 1;
                    //+++ check to see if you're allowed multiple votes, otherwise remove any other votes by this user in the group it's in.
                }

                await this.object.update({ "flags.monks-enhanced-journal.items": items });
            }
        } else {
            MonksEnhancedJournal.emit("vote", { userId: game.user.id, listId: this.object.uuid, itemId: id })
        }
    }

    updateData(data) {
        if (data.count != "" && data.count != undefined) {
            data.count = parseInt(data.count);
        }
    }
}

export class ProgressListSheet extends ListSheet {
    get hasNumbers() {
        return "full";
    }

    get sheetTemplates() {
        delete _templateCache["modules/monks-enhanced-journal/templates/sheets/list-template-progress.html"];
        return {
            listItemTemplate: "modules/monks-enhanced-journal/templates/sheets/list-template-progress.html"
        };
    }

    async getData(options) {
        let data = await super.getData();

        let calcPercent = function (folder) {
            for (let item of folder.content) {
                let count = parseInt(item.data.count || 0);
                let max = parseInt(item.data.max);
                if (!Number.isInteger(max)) {
                    item.noprogress = true;
                } else {
                    item.noprogress = false;
                    item.percent = (count / max) * 100;
                }
            }

            for (let child of folder.children) {
                calcPercent(child);
            }
        }

        let tree = this.tree;
        calcPercent(tree);

        return data;
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        $('.progress-button', html).click(this.updateProgress.bind(this));
        $('.progress-expand', html).on("click", (ev) => {
            $(ev.currentTarget).prev().toggleClass("expand");
            $(ev.currentTarget).html($(ev.currentTarget).prev().hasClass("expand") ? "Show less..." : "Show more...");
        });
    }

    async updateProgress(ev) {
        let value = $(ev.currentTarget).hasClass("decrease") ? -1 : 1;
        let li = ev.currentTarget.closest(".list-item");
        let id = li.dataset.documentId;

        let items = duplicate(getProperty(this.object, "flags.monks-enhanced-journal.items"));
        let item = items.find(i => i.id == id);

        if (item) {
            item.count = Math.clamped((item.count || 0) + value, 0, item.max);
            await this.object.update({ "flags.monks-enhanced-journal.items": items });
        }
    }

    updateData(data) {
        if (data.max != "" && data.max != undefined) {
            data.max = parseInt(data.max);
        }
        if (data.count != "" && data.count != undefined) {
            data.count = parseInt(data.count);
            if (data.max != "" && data.max != undefined)
                data.count = Math.clamped(data.count, 0, data.max);
        }
    }
}
