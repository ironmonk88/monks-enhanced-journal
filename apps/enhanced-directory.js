export class OneJournalDirectory extends JournalDirectory {
    constructor(shell, options) {
        super(options);
        this.shell = shell;
        // Record the directory as an application of the collection
        OneJournalDirectory.collection.apps.push(this);
    }
    get element() {
        return super.element;
    }
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "OneJournalDirectory";
        options.template = "templates/sidebar/journal-directory.html";
        options.popOut = true;
        return options;
    }
    static get entity() {
        return "JournalEntry";
    }
    static get collection() {
        return game.journal;
    }
    render(force, options) {
        if (this.shell._state <= 0) {
            return;
        }
        return super.render(force, options);
    }
    close(force) {
        if (force) {
            return Application.prototype.close.call(this);
        }
        // Close the entire shell if someone tries to close directory
        return this.shell.close();
    }
    selected(uuid) {
        const [_, id] = uuid.split(".");
        this.element.find("li.selected").removeClass("selected");
        const selected = this.element.find(`li[data-entity-id="${id}"]`);
        selected.addClass("selected");
        if (getSetting(settings.SYNC_SIDEBAR) === false) {
            return;
        }
        this.expandFolderTree(selected);
        scrollElementIntoView(selected, this.element.find(".directory-list"));
    }
    deselected() {
        this.element.find("li.selected").removeClass("selected");
    }
    expandFolderTree(target) {
        target.parents(".folder").removeClass("collapsed");
    }
    expand(id, expanded) {
        const li = this.element.find(`li[data-folder-id="${id}"]`);
        if (expanded) {
            li.removeClass("collapsed");
        }
        else {
            li.addClass("collapsed");
            li.find(".folder").addClass("collapsed");
        }
        const expandedFolders = this.element.find(".directory-list > .folder:not(.collapsed)");
        if (expandedFolders.length === 0) {
            this.element.removeClass("has-expanded-journals");
        }
        else {
            this.element.addClass("has-expanded-journals");
        }
    }
    activateListeners(html) {
        super.activateListeners(html);
        this.shell.element.find(".shell-sidebar").append(this.element);
        if (this.shell.attachedId !== -1 && this.shell.attachedUid) {
            this.selected(this.shell.attachedUid);
        }
        let toggleSibling = this.element.find(".header-actions .create-folder");
        if (toggleSibling.length === 0) {
            toggleSibling = this.element.find(".header-search .collapse-all");
        }
        toggleSibling.after(`<div class="sidebar-toggle" title="${i18n("SidebarCollapse")}"><i class="far fa-window-maximize"></i></div>`);
        this.element.find(".sidebar-toggle").click(() => {
            this.shell.toggleSidebar();
        });
        if (getSetting(settings.SIDEBAR_FOLDER_COLOR) === true) {
            this.element.find("header.folder-header").each((i, el) => {
                if (el.style.backgroundColor) {
                    el.nextElementSibling.style.borderColor =
                        el.style.backgroundColor;
                }
            });
        }
        this.setSidebarCompact(getSetting(settings.SIDEBAR_COMPACT));
        this.element.find(".entity-name .fa-external-link-alt").remove();
        this.shell.detachedJournals.forEach(uuid => {
            const [_, id] = uuid.split(".");
            this.element
                .find(`[data-entity-id="${id}"]`)
                .addClass("journal-detached")
                .find(`h4`)
                .attr("title", i18n("JournalEntryDetached"))
                .append(`<i class="fas fa-external-link-alt"></i>`);
        });
    }
    setSidebarCompact(on) {
        if (on) {
            this.element.addClass("compact");
        }
        else {
            this.element.removeClass("compact");
        }
    }
    _getEntryContextOptions() {
        // @ts-ignore
        const options = super._getEntryContextOptions();
        return options.concat([
            {
                name: "SIDEBAR.JumpPin",
                icon: '<i class="fas fa-crosshairs"></i>',
                condition: li => {
                    const entry = game.journal.get(li.data("entity-id"));
                    return !!entry.sceneNote;
                },
                callback: li => {
                    const entry = game.journal.get(li.data("entity-id"));
                    entry.panToNote();
                },
            },
            {
                name: "ONEJOURNAL.OptionOpenDetached",
                icon: `<i class="fas fa-external-link-alt"></i>`,
                callback: li => {
                    const entry = game.journal.get(li.data("entity-id"));
                    this.shell.openDetached(entry.uuid);
                },
            },
        ]);
    }
}