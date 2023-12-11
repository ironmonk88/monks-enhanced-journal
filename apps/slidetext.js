import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class SlideText extends FormApplication {
    constructor(object, config, options = {}) {
        super(object, options);
        this.config = config;
        this.tempdata = duplicate(object);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "slide-text",
            classes: ["form", "slide-sheet"],
            title: i18n("MonksEnhancedJournal.SlideText"),
            template: "modules/monks-enhanced-journal/templates/sheets/slidetext.html",
            width: 350,
            submitOnChange: false
        });
    }

    getData(options) {
        let windowSize = 25;
        let fontOptions = mergeObject({ "": "" }, MonksEnhancedJournal.fonts);
        return mergeObject(super.getData(options),
            {
                alignOptions: { left: "MonksEnhancedJournal.Left", center: "MonksEnhancedJournal.Center", right: "MonksEnhancedJournal.Right" },
                fontOptions,
                fontPlaceholder: getProperty(this.config.journalentry, "flags.monks-enhanced-journal.font.size") || windowSize,
                colorPlaceholder: getProperty(this.config.journalentry, "flags.monks-enhanced-journal.font.color") || "#FFFFFF"
            }, { recursive: false }
        );
    }

    activateListeners(html) {
        super.activateListeners(html);
        $('button[name="cancel"]', html).on('click', this.onCancel.bind(this));
    }

    async _onChangeInput(event) {
        const formData = expandObject(this._getSubmitData());

        if (Object.keys(formData).length == 0)
            return;

        mergeObject(this.tempdata, formData);
        this.config.refreshText(this.tempdata);
    }

    onCancel() {
        this.config.refreshText(this.object);
        this.close();
    }

    _updateObject(event, formData) {
        this.object = mergeObject(this.object, formData);
    }
}