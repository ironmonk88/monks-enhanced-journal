import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class SlideshowWindow extends FormApplication {
    constructor(object, options = {}) {
        super(object, options);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "slideshow-display",
            classes: ["sheet"],
            title: ".",
            template: "modules/monks-enhanced-journal/templates/slideshow-display.html",
            width: ($('body').width() * 0.75),
            height: ($('body').height() * 0.75),
            left: ($('body').width() * 0.125),
            top: ($('body').height() * 0.125),
            resizable: true,
            minimizable: false,
            editable: false,
            closeOnSubmit: false,
            submitOnChange: false,
            submitOnClose: false,
        });
    }

    get title() {
        return this.object.name;
    }
}