import { log, setting, i18n } from '../monks-enhanced-journal.js';

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

        let type = this.entry.getFlag('monks-enhanced-journal', 'type');

        const visible = this.entry.data.permission.default >= CONST.ENTITY_PERMISSIONS.LIMITED;

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

    async _onToggleVisibility(event) {
        event.preventDefault();

        let permissions = {};
        Object.assign(permissions, this.entry.data.permission);
        let isHidden = permissions["default"] >= CONST.ENTITY_PERMISSIONS.LIMITED;
        permissions["default"] = (isHidden ? CONST.ENTITY_PERMISSIONS.NONE : (this.entry.type == "loot" || this.entry.type == "shop" ? CONST.ENTITY_PERMISSIONS.OBSERVER : CONST.ENTITY_PERMISSIONS.LIMITED));
        this.entry.update({ permission: permissions });

        event.currentTarget.classList.toggle("active", !isHidden);
    }

    showToPlayer() {
    }

    startEncounter() {
        const cls = (this.entry._getSheetClass ? this.entry._getSheetClass() : null);
        if (cls && cls.createEncounter) {
            cls.createEncounter.call(this.entry, this.object.data.x, this.object.data.y, true);
        }
    }

    selectEncounter() {
        const cls = (this.entry._getSheetClass ? this.entry._getSheetClass() : null);
        if (cls && cls.selectEncounter) {
            cls.selectEncounter.call(this.entry);
        }
    }

    assignItems() {
        const cls = (this.entry._getSheetClass ? this.entry._getSheetClass() : null);
        if (cls && cls.assignItems) {
            cls.assignItems.call(this.entry);
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
            left: this.object.data.x - (c * ratio) - (width / 2),
            top: this.object.data.y - (height / 2)
        };
        if (ratio !== 1) position.transform = `scale(${ratio})`;
        this.element.css(position);
    }
}