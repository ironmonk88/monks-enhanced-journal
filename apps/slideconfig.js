import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
import { SlideText } from "../apps/slidetext.js";
import { createSlideThumbnail } from "../sheets/SlideshowSheet.js";

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
            title: i18n("MonksEnhancedJournal.SlideConfiguration"),
            template: "modules/monks-enhanced-journal/templates/slideconfig.html",
            width: 620
        });
    }

    get slideid() {
        return this.object.id || 'new';
    }

    getData(options) {
        let data = mergeObject(super.getData(options),
            {
                sizingOptions: {
                    contain: "MonksEnhancedJournal.Contain",
                    cover: "MonksEnhancedJournal.Cover",
                    fill: "MonksEnhancedJournal.Stretch"
                },
                effectOptions: Object.assign({ '': i18n("MonksEnhancedJournal.InheritFromSlideshow")}, MonksEnhancedJournal.effectTypes)
            }, { recursive: false }
        );

        data.texts = this.object.texts.map(t => {
            let text = duplicate(t);
            let x = (((t.left || 0) / 100) * 600).toFixed(2);
            let y = (((t.top || 0) / 100) * 400).toFixed(2);
            let x2 = (((t.right || 0) / 100) * 600).toFixed(2);
            let y2 = (((t.bottom || 0) / 100) * 400).toFixed(2);
            let color = Color.from(t.background || '#000000');
            let style = {
                color: t.color,
                'background-color': color.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
                'text-align': (t.align == 'middle' ? 'center' : t.align),
                top: y + "px",
                left: x + "px",
                width: (600 - x2 - x) + "px",
                height: (400 - y2 - y) + "px",
            };
            text.style = Object.entries(style).filter(([k, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
            return text;
        });

        data.volume = this.object.volume ?? 1;

        data.thumbnail = (this.journalentry._thumbnails && this.object.id && this.journalentry._thumbnails[this.object.id]) || this.object.img;

        if (this.object.background?.color == '') {
            if (data.thumbnail)
                data.background = `background-image:url(\'${data.thumbnail}\');`;
            else
                data.background = `background-color:rgba(255, 255, 255, 0.5)`;
        }
        else
            data.background = `background-color:${this.object.color}`;

        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    _getSubmitData() {
        let data = expandObject(super._getSubmitData());

        let texts = this.object.texts;

        $('.slide-text', this.element).each(function () {
            let text = texts.find(t => t.id == this.dataset.id);
            let pos = $(this).position();
            text.left = (pos.left / 600) * 100;
            text.top = (pos.top / 400) * 100;
            text.right = ((600 - (pos.left + $(this).outerWidth())) / 600) * 100;
            text.bottom = ((400 - (pos.top + $(this).outerHeight())) / 400) * 100;
            text.text = $(this).val();
        });

        data.texts = texts;

        return flattenObject(data);
    }

    async _updateObject(event, formData) {
        log('updating slide', event, formData, this.object);
        let slides = duplicate(this.journalentry.flags["monks-enhanced-journal"].slides || []);

        if (this.object.id == undefined) {
            this.object.id = makeid();
            mergeObject(this.object, formData);
            slides.push(this.object);
            this.journalentry._thumbnails[this.slideid] = this.journalentry._thumbnails.new;
            delete this.journalentry._thumbnails.new;
        } else {
            let slide = slides.find(s => s.id == this.object.id);
            mergeObject(slide, formData);
        }

        this.journalentry.setFlag('monks-enhanced-journal', 'slides', slides);
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.text-delete', html).click(this.deleteText.bind(this));

        $('.slide-text', html)
            .on('mousedown', (ev) => { console.log('text mouse down'); ev.stopPropagation(); $(ev.currentTarget).focus(); })
            .on('dblclick', this.editText.bind(this))
            .on('focus', this.selectText.bind(this))
            .on('blur', (ev) => {
                if ($(ev.currentTarget).val() == '')
                    this.deleteText($(ev.currentTarget));
            });

        $('.slide-textarea', html)
            .on('mousedown', (ev) => {
                if ($('.slide-text.selected', html).length == 0) {
                    let pos = $('.slide-textarea', html).offset();
                    this.orig = { x: ev.clientX - pos.left, y: ev.clientY - pos.top };
                    $('.slide-textarea', html).append($('<div>').addClass('text-create').css({ left: this.orig.x, top: this.orig.y }));
                } else {
                    this.clearText.call(this, ev);
                }
            })
            .on('mousemove', (ev) => {
                let pos = $('.slide-textarea', html).offset();
                let pt = { x: ev.clientX - pos.left, y: ev.clientY - pos.top};
                let mover = $('.mover.moving', html);
                let creator = $('.text-create', html);
                if (mover.length) {
                    mover.parent().css({ left: pt.x, top: pt.y });
                    $('.slide-text.selected', html).css({ left: pt.x, top: pt.y });
                } else if (creator.length) {
                    //creating a new text
                    creator.css({ left: Math.min(pt.x, this.orig.x), top: Math.min(pt.y, this.orig.y), width: Math.abs(pt.x - this.orig.x), height: Math.abs(pt.y - this.orig.y) });
                }
            })
            .on('mouseup', (ev) => {
                let mover = $('.mover.moving', html);
                let creator = $('.text-create', html);
                if (mover.length) {
                    mover.removeClass('moving');
                    $('.slide-text.selected', html).focus();
                } else if (creator.length) {
                    //create text
                    if (creator.outerWidth() > 50 && creator.outerHeight() > 20) {
                        let pos = creator.position();
                        let data = {
                            left: (pos.left / 600) * 100,
                            top: (pos.top / 400) * 100,
                            right: ((600 - (pos.left + creator.outerWidth())) / 600) * 100,
                            bottom: ((400 - (pos.top + creator.outerHeight())) / 400) * 100
                        }
                        this.createText(data);
                    }
                    $('.text-create', html).remove();
                }
            });

        $('.mover', html).on('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            let mover = $(ev.currentTarget);
            mover.addClass('moving');
        });

        var that = this;
        $('input[name="img"]', html).on('change', this.updateImage.bind(this));
        $('select[name="sizing"]', html).on('change', this.updateImage.bind(this));
        $('input[name="background.color"]', html).on('change', this.updateImage.bind(this));
        $('input[data-edit="background.color"]', html).on('change', function () {
            window.setTimeout(function () { that.updateImage.call(that) }, 200);
        });
    }

    async updateImage() {
        let src = $('input[name="img"]').val()
        this.journalentry._thumbnails[this.slideid] = await createSlideThumbnail(src);
        let thumbnail = this.journalentry._thumbnails[this.slideid] || src;
        if ($('input[name="background.color"]').val() == '')
            $('.slide-background div', this.element).css({ 'background-image': `url(${thumbnail})`, 'background-color':'' });
        else
            $('.slide-background div', this.element).css({ 'background-image': '', 'background-color': $('input[name="background.color"]').val() });

        $('.slide-image', this.element).attr('src', thumbnail).css({ 'object-fit': $('select[name="sizing"]').val()});
    }

    selectText(ev) {
        let element = $(ev.currentTarget);
        element.addClass('selected').siblings().removeClass('selected');
        $('.slide-hud', this.element).css({ left: element.position().left, top: element.position().top, width: element.width(), height: element.height() }).show();
    }

    editText(ev) {
        ev.preventDefault();
        ev = ev || window.event;
        let isRightMB = false;
        if ("which" in ev) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
            isRightMB = ev.which == 3;
        } else if ("button" in ev) { // IE, Opera 
            isRightMB = ev.button == 2;
        }

        if (!isRightMB) {
            let text = this.object.texts.find(t => t.id == ev.currentTarget.dataset.id);
            new SlideText(text, this).render(true);
        }
    }

    clearText(ev) {
        $('.slide-textarea .slide-text.selected').removeClass('selected');
        $('.slide-hud', this.element).hide();
    }

    createText(data) {
        let text = {
            id: makeid(),
            align: 'left',
            left: data.left,
            top: data.top,
            right: data.right,
            bottom: data.bottom,
            color: '#FFFFFF',
            background: '#000000',
            opacity: 0.5
        };
        this.object.texts.push(text);

        let x = (((text.left || 0) / 100) * 600).toFixed(2);
        let y = (((text.top || 0) / 100) * 400).toFixed(2);
        let x2 = (((text.right || 0) / 100) * 600).toFixed(2);
        let y2 = (((text.bottom || 0) / 100) * 400).toFixed(2);
        let color = Color.from(text.background || '#000000');
        let style = {
            color: text.color,
            'background-color': color.toRGBA(text.opacity != undefined ? text.opacity : 0.5),
            'text-align': (text.align == 'middle' ? 'center' : text.align),
            top: y + "px",
            left: x + "px",
            width: (600 - x2 - x) + "px",
            height: (400 - y2 - y) + "px",
        };

        let textarea = $('<textarea>')
            .addClass('slide-text')
            .attr({ 'data-id': text.id })
            .css(style)
            .on('mousedown', (ev) => { ev.stopPropagation(); $(ev.currentTarget).focus(); })
            .on('dblclick', this.editText.bind(this))
            .on('focus', this.selectText.bind(this))
            .on('blur', (ev) => {
                if ($(ev.currentTarget).val() == '')
                    this.deleteText($(ev.currentTarget));
            });
        $('.slide-textarea', this.element).append(textarea);
        textarea.focus();
    }

    refreshText(id) {
        let t = this.object.texts.find(x => x.id == id);
        if (t) {
            let x = (((t.left || 0) / 100) * 600);
            let y = (((t.top || 0) / 100) * 400);
            let x2 = (((t.right || 0) / 100) * 600);
            let y2 = (((t.bottom || 0) / 100) * 400);
            let color = Color.from(t.background || '#000000');
            let style = {
                color: t.color,
                'background-color': color.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
                'text-align': (t.align == 'middle' ? 'center' : t.align),
                top: y + "px",
                left: x + "px",
                width: (600 - x2 - x) + "px",
                height: (400 - y2 - y) + "px",
            };
            $(`.slide-text[data-id="${id}"]`, this.element).css(style);
        }
    }

    deleteText(element) {
        if (element.length && element.hasClass('slide-text')) {
            let id = element[0].dataset.id;
            this.object.texts.findSplice(i => i.id == id);
            element.remove();
            $('.slide-hud', this.element).hide();
        }
    }
}