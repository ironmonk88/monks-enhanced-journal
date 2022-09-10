import { log, setting, i18n, MonksEnhancedJournal } from '../monks-enhanced-journal.js';

export class NoteHUD extends BasePlaceableHUD {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "terrain-hud",
            template: "modules/monks-enhanced-journal/templates/note-hud.html"
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        const data = super.getData();

        let type = this.page?.type;

        let document = this.page || this.entry;

        const visible = document.ownership.default >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;

        return mergeObject(data, {
            visibilityClass: visible ? "" : "active",
            type: type,
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('[data-action="show-players"]', html).click(this.showToPlayer.bind(this));
        $('[data-action="start-encounter"]', html).click(this.startEncounter.bind(this));
        $('[data-action="select-encounter"]', html).click(this.selectEncounter.bind(this));
        $('[data-action="assign-items"]', html).click(this.assignItems.bind(this));
    }

    get entry() {
        return this.object.document.entry;
    }

    get page() {
        let page = this.object.document.page;
        if (!page) {
            if (this.object.document.entry.pages.contents.length == 1)
                page = this.object.document.entry.pages.contents[0];
        }
        MonksEnhancedJournal.fixType(page);
        return page;
    }

    async _onToggleVisibility(event) {
        event.preventDefault();

        let document = this.object.document.page || this.entry;

        let ownership = {};
        Object.assign(ownership, document.ownership);
        let isHidden = ownership["default"] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
        ownership["default"] = (isHidden ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : (document.type == "loot" || document.type == "shop" || !setting("hud-limited") ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED));
        document.update({ ownership: ownership });

        event.currentTarget.classList.toggle("active", isHidden);
    }

    showToPlayer() {
    }

    startEncounter() {
        if (this.page) {
            const cls = (this.page._getSheetClass ? this.page._getSheetClass() : null);
            if (cls && cls.createEncounter) {
                cls.createEncounter.call(this.page, { x: this.object.x, y: this.object.y, distance: 20, t: "rect", center: true }, { combat: true });
            }
        }
    }

    selectEncounter() {
        if (this.page) {
            const cls = (this.page._getSheetClass ? this.page._getSheetClass() : null);
            if (cls && cls.selectEncounter) {
                cls.selectEncounter.call(this.page);
            }
        }
    }

    assignItems() {
        if (this.page) {
            const cls = (this.page._getSheetClass ? this.page._getSheetClass() : null);
            if (cls && cls.assignItems) {
                cls.assignItems.call(this.page);
            }
        }
    }

    setPosition() {
        $('#hud').append(this.element);
        let { x, y, width, height } = this.object.controlIcon.hitArea;
        const ratio = canvas.dimensions.size / 100;
        const c = 70;
        const p = 10;
        const position = {
            width: (width / ratio) + (c * 2),
            height: height,
            left: this.object.x - (c * ratio) - (width / 2),
            top: this.object.y - (height / 2)
        };
        if (ratio !== 1) position.transform = `scale(${ratio})`;
        this.element.css(position);
    }
}