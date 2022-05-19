import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class SlideText extends FormApplication {
    constructor(object, config, options = {}) {
        super(object, options);
        this.config = config;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "slide-text",
            classes: ["form", "slide-sheet"],
            title: i18n("MonksEnhancedJournal.SlideText"),
            template: "modules/monks-enhanced-journal/templates/slidetext.html",
            width: 350,
            submitOnChange: true
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                alignOptions: { left: "MonksEnhancedJournal.Left", center: "MonksEnhancedJournal.Center", right: "MonksEnhancedJournal.Right" }
            }, { recursive: false }
        );
    }

    _onSubmit(ev) {
        const formData = expandObject(this._getSubmitData());

        if (Object.keys(formData).length == 0)
            return;

        mergeObject(this.object, formData);
        this.config.refreshText(this.object.id);
    }
}