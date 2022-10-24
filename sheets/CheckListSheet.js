import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class CheckListSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        this.initialize();
    }

    get type() {
        return 'checklist';
    }

    static get defaultObject() {
        return { items: [], folders: [] };
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.checklist"),
            template: "modules/monks-enhanced-journal/templates/checklist.html",
            dragDrop: [
                { dragSelector: ".checklist-item", dropSelector: ".checklist-list" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            filters: [{ inputSelector: 'input[name="search"]', contentSelector: ".checklist-list" }],
            contextMenuSelector: ".document",
            scrollY: [".checklist-list"]
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

    _documentControls() {
        let ctrls = [
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
        for (let i = CONST.FOLDER_MAX_DEPTH - 1; i >= 0; i--) {
            depths[i] = depths[i].reduce((arr, f) => {
                //f.children = f.children.filter(c => c.displayed);
                //if (!f.displayed) return arr;
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

        // Partition folders into children and unassigned folders
        let [u, children] = folders.partition(f => allowChildren && (f.data?.parent === id || (f.data?.parent == undefined && id == null)));
        folder.children = children.sort((a, b) => a.name.localeCompare(b.name));
        folders = u;

        // Partition documents into contents and unassigned documents
        const [docs, content] = documents.partition(e => e.data?.folder === id || (e.data?.folder == undefined && id == null));
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
        for ( let el of html.querySelectorAll(".checklist-item") ) {

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

        const checklist = html.find(".checklist-list");
        const entries = checklist.find(".checklist-item");

        // Folder-level events
        html.find('.create-item').click(ev => this._onCreateItem(ev));
        html.find('.collapse-all').click(this.collapseAll.bind(this));
        html.find(".folder .folder .folder .create-folder").remove(); // Prevent excessive folder nesting
        if (game.user.isGM) html.find('.create-folder').click(ev => this._onCreateFolder(ev));

        // Entry-level events
        checklist.on("dblclick", ".document.item", this._onClickDocumentName.bind(this));
        checklist.on("click", ".folder-header", this._toggleFolder.bind(this));
        const dh = this._onDragHighlight.bind(this);
        html.find(".folder").on("dragenter", dh).on("dragleave", dh);

        entries.on("click", ".item-checked", this._onCheckItem.bind(this))

        this._searchFilters = this.options.filters.map(f => {
            f.callback = this._onSearchFilter.bind(this);
            return new SearchFilter(f);
        }).forEach(f => f.bind(html[0]));
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

    async createDialog(data = {}, options = {}) {
        let that = this;
        // Collect data
        const folders = this.folders;//.filter(f => f.displayed);
        const label = (data.id ? (options.type == 'folder' ? game.i18n.localize("FOLDER.Update") : i18n("MonksEnhancedJournal.UpdateEntry"))
            : (options.type == 'folder' ? game.i18n.localize("FOLDER.Create") : game.i18n.format("DOCUMENT.Create", { type: (options.type == 'folder' ? game.i18n.localize("DOCUMENT.Folder") : i18n("MonksEnhancedJournal.Entry")) })));
        const title = label + (data.id && options.type == 'folder' ? ' : ' + data.name : '');

        // Render the entity creation form
        const html = await renderTemplate(`modules/monks-enhanced-journal/templates/checklist${options.type}.html`, {
            data: data,
            name: data.name || game.i18n.format("DOCUMENT.New", { type: options.type }),
            folder: data.folder,
            folders: folders,
            hasFolders: folders.length > 0
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

        let li = event.currentTarget.closest(".checklist-item");
        if (li) {
            const isFolder = li.classList.contains("folder");
            const dragData = isFolder ?
                { type: "Folder", id: li.dataset.folderId } :
                { type: "Item", id: li.dataset.documentId };
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
            for (let t of li.closest(".checklist-list").querySelectorAll(".droptarget")) {
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
        const target = event.target.closest(".checklist-item") || null;

        // Call the drop handler
        switch (data.type) {
            case "Folder":
                return this._handleDroppedFolder(target, data);
            case "Item":
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
                callback: li => {
                    const item = that.items.find(i => i.id == li[0].dataset.documentId);
                    if (!item) return;
                    const options = { top: li.offsetTop, left: window.innerWidth - 310 - FolderConfig.defaultOptions.width, type: 'item' };
                    this.createDialog(item.data, options);
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
                        content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.format("SIDEBAR.DeleteWarning", { type: "Checklist Item" })}</p>`,
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
            }
        ];
    }
}
