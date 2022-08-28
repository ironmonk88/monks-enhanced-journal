import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";

export class JournalEntrySheet extends JournalSheet {
    constructor(data, options) {
        super(data, options);

        this.enhancedjournal = options.enhancedjournal;
        this.editing = false;
        this.pinned = game.user.getFlag("monks-enhanced-journal", "pinned-toc");
    }

    static get defaultOptions() {
        let defOptions = super.defaultOptions;
        let classes = defOptions.classes.concat(['monks-journal-sheet', 'monks-enhanced-journal', `${game.system.id}`]);
        return mergeObject(defOptions, {
            title: i18n("MonksEnhancedJournal.journalentry"),
            template: "modules/monks-enhanced-journal/templates/journalentry.html",
            classes: classes,
            scrollY: [".journal-pages"]
        });
    }

    async getData() {
        let data = await super.getData();

        //get all the journal entry pages and render them
        data.journalpages = [];
        await loadTemplates({
            journalEntryPageHeader: "templates/journal/parts/page-header.html",
            journalEntryPageFooter: "templates/journal/parts/page-footer.html"
        });
        for (let page of this.object.pages) {
            MonksEnhancedJournal.fixType(page);

            // checklist can't be shown
            // slideshow should render as a playable slideshow

            // Picture has the name as the caption
            // Anything else, add the name as a h2/h3 header and if there is a picture, float it in the top left
            // Click to open the Page by itself.

            // Pop out TOC that you can pin if you want it there

            // Add page at the bottom, along with next/prev Journal and next/prev page
            // Add button at bottom to go up to the Journal Entry from the page.
            // Editing the Journal Page will allow editing the name, deleting pages, adding pages

            // Journal with single page will open directly to that page

            // Play page sound so long as the page is still on the screen?

            if (page.type == "checklist" || page.type == "slideshow" || !page.testUserPermission(game.user, "OBSERVER"))
                continue;

            const cls = page._getSheetClass ? page._getSheetClass() : null;
            let sheet = null;
            if (!cls)
                sheet = new EnhancedJournalSheet(page);
            else
                sheet = new cls(page);

            const owner = page.isOwner;
            let html = await (game.system.id == "pf2e" ? game.pf2e.TextEditor : TextEditor).enrichHTML(page.text.content, { secrets: owner, documents: true, async: true });

            let icon = MonksEnhancedJournal.getIcon(page.type);

            let pageData = {
                id: page.id,
                name: page.name,
                type: page.type,
                icon: icon,
                isImage: page.type == "image",
                img: (page.type != "text" && page.type != "video" && page.type != "pdf" ? page.src : null),
                caption: page.image.caption,
                content: html
            };

            if (["loot", "shop", "encounter"].includes(page.type)) {
                pageData.hideitems = (['hidden', 'visible'].includes(page.flags['monks-enhanced-journal'].purchasing) && !page.isOwner);
                pageData.groups = sheet.getItemGroups(
                    getProperty(page, "flags.monks-enhanced-journal.items"),
                    getProperty(page, "flags.monks-enhanced-journal.type"),
                    getProperty(page, "flags.monks-enhanced-journal.purchasing"));
            }

            data.pinned = this.pinned;

            data.journalpages.push(pageData);
        }

        return data;
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'edit', text: "Edit Journal Entry", icon: 'fa-edit', conditional: game.user.isGM, callback: () => { this.object._editing = !this.object._editing; this.enhancedjournal.render(); } },
            { id: 'add', text: "Add a Page", icon: 'fa-file-plus', conditional: game.user.isGM, callback: this.enhancedjournal.addPage },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
        ];

        return ctrls;
    }

    get isEditable() {
        let editable = this.object._editing && this.document.isOwner;
        return editable;
    }

    async close(options) {
        this.object._editing = false;
        return super.close(options);
    }

    get mode() {
        return this.constructor.VIEW_MODES.MULTIPLE;
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html);

        // add the links to the pages
        $('.page-link', html).on("click", this.clickLink.bind(this));
        // add the toggalable TOC
        // add the delete buttons
        $('.page-delete', html).on("click", this.deletePage.bind(this));

        $(".toggle-toc", html).on("click", this.toggleTOC.bind(this));

        $(".pin-toc", html).on("click", this.togglePinTOC.bind(this));

        html.find(".journal-entry-page-link").click(this._onClickHeading.bind(this));
    }

    clickLink(event) {
        let id = event.currentTarget.closest("article").dataset.pageId;
        let page = this.object.pages.find(p => p.id == id);
        this.enhancedjournal.open(page);
    }

    async deletePage(event) {
        event.preventDefault();
        event.stopPropagation();
        let id = event.currentTarget.closest("article").dataset.pageId;
        let page = this.object.pages.find(p => p.id == id);
        await page.delete();
        this.enhancedjournal.render();
        ui.journal.render();
        MonksEnhancedJournal.emit("refreshDirectory", { name: "journal" });
    }

    toggleTOC() {
        $('.journal-menu', this.element).toggleClass("collapsed");
    }

    togglePinTOC() {
        this.pinned = !this.pinned;
        game.user.setFlag("monks-enhanced-journal", "pinned-toc", this.pinned);
        $('.journal-menu .pin-toc', this.element).toggleClass("active", this.pinned);
    }

    goToPage(pageId, anchor) {
        const page = this.element[0].querySelector(`.journal-entry-page[data-page-id="${pageId}"]`);
        if (anchor) {
            const element = this.getPageSheet(pageId)?.toc[anchor]?.element;
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
                return;
            }
        }
        page?.scrollIntoView({ behavior: "smooth" });
        if (!this.pinned)
            $('.journal-menu', this.element).addClass("collapsed");
    }

    _getPageData() {
        let data = super._getPageData();
        // Add the page type
        for (let page of data) {
            page.typeIcon = MonksEnhancedJournal.getIcon(getProperty(page, "flags.monks-enhanced-journal.type"));
        }
        return data;
    }

    _activatePagesInView() {
        // get percent scrolled, find the page in view that's closest to that mark
        if (this.pagesInView.length) {
            const pageId = this.pagesInView[0].dataset.pageId;
            $(`.directory-item[data-page-id="${pageId}"]`, this.element).addClass("active").siblings(".active").removeClass("active");
        } else
            $(`.directory-item.active`, this.element).removeClass("active");
    }
}
