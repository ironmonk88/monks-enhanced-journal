import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
import { SlideText } from "../apps/slidetext.js";

export class SlideConfig extends FormApplication {
    constructor(object, journalentry, options = {}) {
        super(object, options);
        this.journalentry = journalentry;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "slide-config",
            classes: ["form", "slide-sheet"],
            title: i18n("MonsEnhancedJournal.SlideConfiguration"),
            template: "modules/monks-enhanced-journal/templates/slideconfig.html",
            width: 500
        });
    }

    getData(options) {
        return mergeObject(super.getData(options),
            {
                sizingOptions: { contain: "MonksEnhancedJournal.Contain", cover: "MonksEnhancedJournal.Cover", fill: "MonksEnhancedJournal.Stretch" }
            }, { recursive: false }
        );
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        log('updating slide', event, formData, this.object);
        let slides = duplicate(this.journalentry.data.flags["monks-enhanced-journal"].slides || []);
        
        if (this.object.id == undefined) {
            this.object.id = makeid();
            mergeObject(this.object, formData);
            slides.push(this.object);
        } else {
            let slide = slides.find(s => s.id == this.object.id);
            mergeObject(slide, formData);
        }

        this.journalentry.setFlag('monks-enhanced-journal', 'slides', slides);
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.text-create', html).click(this.createText.bind(this));
        $('.text-edit', html).click(this.editText.bind(this));
        $('.text-delete', html).click(this.deleteText.bind(this));
    }

    createText() {
        let text = {
            id: makeid(),
            align: 'middle',
            left: 50,
            top: 50,
            color: '#FFFFFF'
        };
        this.object.texts.push(text);

        $('<li>').addClass('item flexrow').attr('data-id', text.id)
            .append($('<div>').addClass('item-name flexrow').append($('<h4>').html(text.text)))
            .append($('<div>').addClass('item-controls'))
            .append($('<div>').addClass('item-controls flexrow')
                .append($('<a>').addClass('item-control text-edit').attr('title', i18n("MonksEnhancedJournal.EditText")).append($('<i>').addClass('fas fa-edit')))
                .append($('<a>').addClass('item-control text-delete').attr('title', i18n("MonksEnhancedJournal.DeleteText")).append($('<i>').addClass('fas fa-trash')))
            )
            .appendTo($('.item-list', this.element));
        new SlideText(text, this).render(true);
    }

    editText(event) {
        let item = event.currentTarget.closest('.item');
        let text = this.object.texts.find(t => t.id == item.dataset.id);
        if (text != undefined)
            new SlideText(text, this).render(true);
    }

    deleteText(event) {
        let item = event.currentTarget.closest('.item');
        this.object.texts.findSplice(i => i.id == item.dataset.id);
        $(`li[data-id="${item.dataset.id}"]`, this.element).remove();
    }
}