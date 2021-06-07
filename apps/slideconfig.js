import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class SlideConfig extends FormApplication {
    constructor(object, options = {}) {
        super(object, options);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "slide-config",
            classes: ["form", "slide-sheet"],
            title: i18n("MonsEnhancedJournal.SlideConfiguration"),
            template: "modules/monks-enhanced-journal/templates/slideconfig.html",
            width: 680
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                sizingOptions: { contain: "MonksEnhancedJournal.Contain", cover: "MonksEnhancedJournal.Cover", fill: "MonksEnhancedJournal.Stretch" },
                alignOptions: { left: "MonksEnhancedJournal.Left", center: "MonksEnhancedJournal.Center", right: "MonksEnhancedJournal.Right" },
                vAlignOptions: { top: "MonksEnhancedJournal.Top", middle: "MonksEnhancedJournal.Middle", bottom: "MonksEnhancedJournal.Bottom" }
            }, { recursive: false }
        );
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        log('updating slide', event, formData, this.object);
        mergeObject(this.object, formData);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            MonksEnhancedJournal.journal.object.data.flags["monks-enhanced-journal"].slides.push(this.object);

            MonksEnhancedJournal.createSlide(this.object, $('.slideshow-body', MonksEnhancedJournal.journal.element));
        }

        MonksEnhancedJournal.journal.saveData().then(() => {
            MonksEnhancedJournal.journal.display(MonksEnhancedJournal.journal.object);
        });

        $(`.slide[data-slide-id="${this.object.id}"] img`, MonksEnhancedJournal.journal.element)
            .attr('src', this.object.img)
            .css({ 'object-fit': this.object.sizing });

        $(`.slide[data-slide-id="${this.object.id}"] .slide-background > div`, MonksEnhancedJournal.journal.element).css({ 'background-image': (this.object.background.color == '' ? `url('${this.object.img}')` : ''), 'background-color': (this.object.background.color != '' ? this.object.background.color : '') });

        let textBackground = hexToRGBAString(colorStringToHex(this.object.text?.background || '#000000'), 0.5);

        $(`.slide[data-slide-id="${this.object.id}"] .slide-text`, MonksEnhancedJournal.journal.element).css({ 'text-align': this.object.text?.align || 'center', 'color': this.object.text?.color || '#000000' });
        $(`.slide[data-slide-id="${this.object.id}"] .slide-text .text-upper div`, MonksEnhancedJournal.journal.element).css({ 'background-color': textBackground}).html(this.object.text?.valign == 'top' ? this.object.text?.content : '');
        $(`.slide[data-slide-id="${this.object.id}"] .slide-text .text-middle div`, MonksEnhancedJournal.journal.element).css({ 'background-color': textBackground }).html((this.object.text?.valign || 'middle') == 'middle' ? this.object.text?.content : '');
        $(`.slide[data-slide-id="${this.object.id}"] .slide-text .text-lower div`, MonksEnhancedJournal.journal.element).css({ 'background-color': textBackground }).html(this.object.text?.valign == 'bottom' ? this.object.text?.content : '');
    }

    activateListeners(html) {
        super.activateListeners(html);

        //$('[name="sizing"]', html).on('change', )
    }
}