import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class SlideText extends FormApplication {
    constructor(object, config, options = {}) {
        super(object, options);
        this.config = config;
        this.tempdata = foundry.utils.duplicate(object);
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
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
        let fontOptions = foundry.utils.mergeObject({ "": "" }, MonksEnhancedJournal.fonts);
        return foundry.utils.mergeObject(super.getData(options),
            {
                alignOptions: { left: "MonksEnhancedJournal.Left", center: "MonksEnhancedJournal.Center", right: "MonksEnhancedJournal.Right" },
                fontOptions,
                fontPlaceholder: foundry.utils.getProperty(this.config.journalentry, "flags.monks-enhanced-journal.font.size") || windowSize,
                colorPlaceholder: foundry.utils.getProperty(this.config.journalentry, "flags.monks-enhanced-journal.font.color") || "#FFFFFF"
            }, { recursive: false }
        );
    }

    activateListeners(html) {
        super.activateListeners(html);
        $('button[name="cancel"]', html).on('click', this.onCancel.bind(this));
    }

    async _onChangeInput(event) {
        const formData = foundry.utils.expandObject(this._getSubmitData());

        if (Object.keys(formData).length == 0)
            return;

        foundry.utils.mergeObject(this.tempdata, formData);
        this.config.refreshText(this.tempdata);
    }

    onCancel() {
        this.config.refreshText(this.object);
        this.close();
    }

    _updateObject(event, formData) {
        this.object = foundry.utils.mergeObject(this.object, formData);
    }
}