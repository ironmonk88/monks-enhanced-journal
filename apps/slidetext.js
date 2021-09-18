import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class SlideText extends FormApplication {
    constructor(object, slide, options = {}) {
        super(object, options);
        this.slide = slide;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "slide-text",
            classes: ["form", "slide-sheet"],
            title: "Slide Text",
            template: "modules/monks-enhanced-journal/templates/slidetext.html",
            width: 680,
            submitOnChange: true
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                alignOptions: { left: "MonksEnhancedJournal.Left", middle: "MonksEnhancedJournal.Middle", right: "MonksEnhancedJournal.Right" }
            }, { recursive: false }
        );
    }

    _onSubmit(ev) {
        const formData = expandObject(this._getSubmitData());

        if (Object.keys(formData).length == 0)
            return;

        mergeObject(this.object, formData);
        $('.item[data-id="' + this.object.id + '"] .item-name h4', this.slide.element).html(this.object.text);
    }
}