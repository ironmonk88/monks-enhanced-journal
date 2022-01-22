import { SlideConfig } from "../apps/slideconfig.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export class SlideshowSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.slideshow"),
            template: "modules/monks-enhanced-journal/templates/slideshow.html",
            dragDrop: [
                { dragSelector: ".slide", dropSelector: ".slide" },
                { dragSelector: ".slide", dropSelector: ".slideshow-body" }
            ]
        });
    }

    get type() {
        return 'slideshow';
    }

    static get defaultObject() {
        return { state: 'stopped', slides: [] };
    }

    getData() {
        let data = super.getData();
        let flags = (data.data.flags["monks-enhanced-journal"]);
        if (flags == undefined) {
            data.data.flags["monks-enhanced-journal"] = {};
            flags = (data.data.flags["monks-enhanced-journal"]);
        }
        data.showasOptions = { canvas: "Canvas", fullscreen: "Full Screen", window: "Window" };
        if (flags.state == undefined)
            flags.state = 'stopped';
        data.playing = (flags.state != 'stopped') || !this.object.isOwner;

        let idx = 0;
        if (flags.slides) {
            let changed = false;
            let slides = duplicate(flags.slides);
            for (let slide of slides) {
                if (slide.text != undefined && slide.texts == undefined) {
                    changed = true;
                    slide.texts = [];
                    if (slide.text.content != '') {
                        slide.texts.push({
                            id: makeid(),
                            width: 100,
                            top: (slide.text?.valign == 'top' ? 10 : (slide.text?.valign == 'middle' ? 40 : 80)),
                            left: 0,
                            align: slide.text?.align,
                            background: slide.text?.background,
                            fadein: 0,
                            fadeout: null,
                            color: slide.text?.color,
                            text: slide.text?.content
                        });
                    }
                }
            }
            if (changed) {
                this.object.setFlag("monks-enhanced-journal", "slides", slides);
                flags.slides = slides;
            }

            data.slides = flags.slides.map(s => {
                let slide = duplicate(s);
                if (slide.background?.color == '') {
                    slide.background = `background-image:url(\'${slide.img}\');`;
                }
                else
                    slide.background = `background-color:${slide.background.color}`;

                slide.texts = slide.texts.map(t => {
                    let text = duplicate(t);
                    let style = {
                        color: t.color,
                        'background-color': hexToRGBAString(colorStringToHex(t.background || '#000000'), (t.opacity != undefined ? t.opacity : 0.5)),
                        'text-align': (t.align == 'middle' ? 'center' : t.align),
                        top: (t.top || 0) + "%",
                        left: (t.left || 0) + "%",
                        right: (t.right || 0) + "%",
                        bottom: (t.bottom || 0) + "%",
                    };
                    text.style = Object.entries(style).filter(([k, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
                    return text;
                });

                return slide;
            });

            if (flags.slideAt && flags.slideAt < data.slides.length)
                data.slides[flags.slideAt].active = true;
        }

        if (flags.state !== 'stopped' && data.slides) {
            data.slideshowing = data.slides[flags.slideAt];

            if (data.slideshowing.transition?.duration > 0) {
                let time = data.slideshowing.transition.duration * 1000;
                let timeRemaining = time - ((new Date()).getTime() - data.slideshowing.transition.startTime);
                data.slideshowing.durprog = (timeRemaining / time) * 100;
            } else
                data.slideshowing.durlabel = i18n("MonksEnhancedJournal.ClickForNext");
        }

        return data;
    }

    _documentControls() {
        let ctrls = [
            { id: 'add', text: i18n("MonksEnhancedJournal.AddSlide"), icon: 'fa-plus', conditional: game.user.isGM || this.object.isOwner, callback: this.addSlide },
            { id: 'clear', text: i18n("MonksEnhancedJournal.ClearAll"), icon: 'fa-dumpster', conditional: game.user.isGM || this.object.isOwner, callback: this.deleteAll },
         ];
        ctrls = ctrls.concat(super._documentControls());
        return ctrls;
    }

    async refresh() {
        super.refresh();
        if ((this.object.data.flags['monks-enhanced-journal'].state != 'stopped') || !this.object.isOwner) {
            this.playSlide();
        }
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        const slideshowOptions = this._getSlideshowContextOptions();
        Hooks.call(`getMonksEnhancedJournalSlideshowContext`, html, slideshowOptions);
        if (slideshowOptions) new ContextMenu($(html), ".slideshow-body .slide-inner", slideshowOptions);

        let that = this;
        html.find('.slideshow-body .slide')
            .click(this.activateSlide.bind(this))
            .dblclick(function (event) {
                let id = event.currentTarget.dataset.slideId;
                that.editSlide(id);
            });
        html.find('.slide-showing').click(this.advanceSlide.bind(this, 1)).contextmenu(this.advanceSlide.bind(this, -1));

        new ResizeObserver(() => {
            //change font size to match height
            let size = $('.slide-showing .slide-textarea', html).outerHeight() / 20;
            $('.slide-showing .slide-textarea', html).css({ 'font-size': `${size}px`});
        }).observe(this.element[0]);

        $('.add-slide', html).click(this.addSlide.bind(this));
        $('.nav-button.play').click(this.playSlideshow.bind(this));
        $('.nav-button.pause').click(this.pauseSlideshow.bind(this));
        $('.nav-button.stop').click(this.stopSlideshow.bind(this));
    }

    _canDragDrop(selector) {
        return (game.user.isGM || this.object.isOwner);
    }

    _onDragStart(event) {
        const li = event.currentTarget;

        const dragData = { from: 'monks-enhanced-journal' };

        let id = li.dataset.slideId;
        dragData.slideId = id;
        dragData.type = "Slide";

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        MonksEnhancedJournal._dragItem = id;
    }

    _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (this.object.data.flags["monks-enhanced-journal"].state == 'playing')
            return;

        let slides = duplicate(this.object.data.flags['monks-enhanced-journal']?.slides || []);

        let from = slides.findIndex(a => a.id == data.slideId);
        let to = slides.length - 1;
        if (!$(event.target).hasClass('slideshow-body')) {
            const target = event.target.closest(".slide") || null;
            if (data.slideId === target.dataset.slideId) return; // Don't drop on yourself
            to = slides.findIndex(a => a.id == target.dataset.slideId);
        }
        if (from == to)
            return;

        slides.splice(to, 0, slides.splice(from, 1)[0]);

        this.object.data.flags['monks-enhanced-journal'].slides = slides;
        this.object.setFlag('monks-enhanced-journal', 'slides', slides);

        //$('.slideshow-body .slide[data-slide-id="' + data.slideId + '"]', this.element).insertBefore(target);

        log('drop data', from, to, event, data);

        event.stopPropagation();
    }

    addSlide(data = {}, options = { showdialog: true }) {
        if (this.object.data.flags["monks-enhanced-journal"].slides == undefined)
            this.object.data.flags["monks-enhanced-journal"].slides = [];

        let slide = mergeObject({
            sizing: 'contain',
            background: { color: '' },
            texts: [],//{ color: '#FFFFFF', background: '#000000', align: 'center', valign: 'middle' },
            transition: { duration: 5, effect: 'fade' }
        }, (data instanceof Event || data?.originalEvent instanceof Event ? {} : data));
        //slide.id = makeid();
        //this.object.data.flags["monks-enhanced-journal"].slides.push(slide);

        //MonksEnhancedJournal.createSlide(slide, $('.slideshow-body', this.element));

        if (options.showdialog)
            new SlideConfig(slide, this.object).render(true);
    }

    deleteAll() {
        if (this.object.data.flags["monks-enhanced-journal"].state == 'stopped') {
            this.object.setFlag("monks-enhanced-journal", 'slides', []);
            //$(`.slideshow-body`, this.element).empty();
            //MonksEnhancedJournal.journal.saveData();
        }
    }

    deleteSlide(id, html) {
        let slides = duplicate(this.object.data.flags["monks-enhanced-journal"].slides || []);
        slides.findSplice(s => s.id == id);
        this.object.setFlag("monks-enhanced-journal", 'slides', slides);
    }

    cloneSlide(id) {
        let slide = this.object.data.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        let data = duplicate(slide);
        this.addSlide(data, { showdialog: false });
    }

    editSlide(id, options) {
        let slide = this.object.data.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        if (slide != undefined)
            new SlideConfig(slide, this.object, options).render(true);
    }

    activateSlide(event) {
        if (this.object.data.flags["monks-enhanced-journal"].state != 'stopped') {
            let idx = $(event.currentTarget).index();
            this.object.data.flags["monks-enhanced-journal"].slideAt = idx;
            this.playSlide(idx);
        }
    }

    _onSelectFile(selection, filePicker) {
        this.object.setFlag("monks-enhanced-journal", "audiofile", selection);
    }

    updateButtons() {
        $('.nav-button.play', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state !== 'playing');
        $('.nav-button.pause', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state === 'playing');
        $('.nav-button.stop', this.element).toggle(this.object.data.flags["monks-enhanced-journal"].state !== 'stopped');
    }

    async playSlideshow(refresh = true) {
        let flags = this.object.data.flags["monks-enhanced-journal"];
        if (flags.slides.length == 0) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.CannotPlayNoSlides"));
            return;
        }

        if (flags.state == 'playing')
            return;

        if (flags.state == 'stopped') {
            if (this.object.isOwner)
                await this.object.setFlag("monks-enhanced-journal", "slideAt", 0);
            else
                this.object.data.flags['monks-enhanced-journal'].slideAt = 0;
            this.object.sound = undefined;

            if (flags.audiofile != undefined && flags.audiofile != '')
                AudioHelper.play({ src: flags.audiofile, loop: true }).then((sound) => {
                    this.object.sound = sound;
                    return sound;
                });
        } else {
            if (this.object.sound && this.object.sound.paused)
                this.object.sound.play();
        }

        let animate = (flags.state != 'paused');
        if(this.object.isOwner)
            await this.object.setFlag("monks-enhanced-journal", "state", "playing");
        else
            this.object.data.flags['monks-enhanced-journal'].state = "playing";
        $('.slide-showing .duration', this.element).show();
        ($(this.element).hasClass('slideshow-container') ? $(this.element) : $('.slideshow-container', this.element)).addClass('playing');
        this.updateButtons.call(this);

        //inform players
        if(game.user.isGM)
            MonksEnhancedJournal.emit('playSlideshow', { id: this.object.id, idx: flags.slideAt });

        if (refresh && flags.state == 'stopped')
            $('.slide-showing .slide', this.element).remove();
        this.playSlide(flags.slideAt, animate);
        //this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags["monks-enhanced-journal"] });
    }

    async pauseSlideshow() {
        let flags = this.object.data.flags["monks-enhanced-journal"];
        let slide = flags.slides[flags.slideAt];
        if (slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        $('.slide-showing .duration', this.element).hide().stop();

        if (this.object?._currentSlide?.transition?.timer)
            window.clearTimeout(this.object?._currentSlide?.transition?.timer);

        if(this.object.isOwner)
            await this.object.setFlag("monks-enhanced-journal", "state", "paused");
        else
            this.object.data.flags['monks-enhanced-journal'].state = "paused";
        this.updateButtons.call(this);

        //if (this.object.sound)
        //    this.object.sound.pause();

        //this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags["monks-enhanced-journal"] });
    }

    async stopSlideshow() {
        let flags = this.object.data.flags["monks-enhanced-journal"];
        let slide = flags.slides[flags.slideAt];
        if (slide && slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        if (this.object.isOwner) {
            await this.object.setFlag("monks-enhanced-journal", "state", "stopped");
            await this.object.setFlag("monks-enhanced-journal", "slideAt", 0);
        } else {
            this.object.data.flags['monks-enhanced-journal'].state = "stopped";
            this.object.data.flags['monks-enhanced-journal'].slideAt = 0;
        }

        $('.slide-showing .duration', this.element).hide().stop();
        if (this.object.isOwner) {
            $('.slide-showing .slide', this.element).remove();
            ($(this.element).hasClass('slideshow-container') ? $(this.element) : $('.slideshow-container', this.element)).removeClass('playing');
        }
        this.updateButtons.call(this);

        if (this.object.sound?.src != undefined) {
            if (game.user.isGM)
                game.socket.emit("stopAudio", { src: flags.audiofile });
            this.object.sound.stop();
            this.object.sound = undefined;
        }

        //inform players
        if(game.user.isGM)
            MonksEnhancedJournal.emit('stopSlideshow', {});

        //++++ why am I doing it this way and not using setFlag specifically?
        //this.object.update({ 'flags.monks-enhanced-journal': this.object.data.flags["monks-enhanced-journal"] });
    }

    showSlide() {
        let idx = this.object.data.flags["monks-enhanced-journal"].slideAt;
        let slide = this.object.data.flags["monks-enhanced-journal"].slides[idx];
        let newSlide = MonksEnhancedJournal.createSlide(slide);
        $('.slide-textarea', newSlide).css({'font-size':'25px'});
        $('.slide-showing', this.element).append(newSlide);
    }

    playSlide(idx, animate = true) {
        let that = this;
        if (idx == undefined)
            idx = this.object.data.flags["monks-enhanced-journal"].slideAt;
        else { //if (idx != this.object.data.flags["monks-enhanced-journal"].slideAt)
            if (this.object.isOwner)
                this.object.setFlag("monks-enhanced-journal", "slideAt", idx);
            else
                this.object.data.flags['monks-enhanced-journal'].slideAt = idx;
        }

        let slide = this.object.data.flags["monks-enhanced-journal"].slides[idx];

        //remove any that are still on the way out
        $('.slide-showing .slide.out', this.element).remove();

        if (animate) {
            //remove any old slides
            let oldSlide = $('.slide-showing .slide', this.element);
            oldSlide.addClass('out').animate({ opacity: 0 }, 1000, 'linear', function () { $(this).remove() });

            //bring in the new slide
            let newSlide = MonksEnhancedJournal.createSlide(slide);
            $('.slide-textarea', newSlide).css({ 'font-size': '25px' });
            $('.slide-showing', this.element).append(newSlide);
            newSlide.css({ opacity: 0 }).animate({ opacity: 1 }, 1000, 'linear');
        }

        $(`.slideshow-body .slide:eq(${idx})`, this.element).addClass('active').siblings().removeClass('active');
        $('.slideshow-body', this.element).scrollLeft((idx * 116));
        $('.slide-showing .duration', this.element).empty();

        if (this.object?._currentSlide?.transition?.timer)
            window.clearTimeout(this.object?._currentSlide?.transition?.timer);

        if (slide.transition?.duration > 0) {
            //set up the transition
            let time = slide.transition.duration * 1000;
            slide.transition.startTime = (new Date()).getTime();
            slide.transition.timer = window.setTimeout(function () {
                if (that.object.getFlag("monks-enhanced-journal", "state") == 'playing')
                    that.advanceSlide.call(that, 1);
            }, time);
            $('.slide-showing .duration', this.element).append($('<div>').addClass('duration-bar').css({ width: '0' }).show().animate({ width: '100%' }, time, 'linear'));
        } else {
            $('.slide-showing .duration', this.element).append($('<div>').addClass('duration-label').html(i18n("MonksEnhancedJournal.ClickForNext")));
        }

        for (let text of slide.texts) {
            if ($.isNumeric(text.fadein)) {
                window.setTimeout(() => {
                    if (that.object.getFlag("monks-enhanced-journal", "state") == 'playing')
                        $('.slide-showing .slide-text[data-id="' + text.id + '"]', this.element).animate({ opacity: 1 }, 500, 'linear');
                }, text.fadein * 1000);
            }
            if ($.isNumeric(text.fadeout)) {
                window.setTimeout(() => {
                    if (that.object.getFlag("monks-enhanced-journal", "state") == 'playing')
                        $('.slide-showing .slide-text[data-id="' + text.id + '"]', this.element).animate({ opacity: 0 }, 500, 'linear');
                }, text.fadeout * 1000);
            }
        }

        this.object._currentSlide = slide;

        if(game.user.isGM)
            MonksEnhancedJournal.emit('playSlide', { id: this.object.id, idx: idx });
    }

    advanceSlide(dir, event) {
        let data = this.object.data.flags["monks-enhanced-journal"];
        data.slideAt = Math.max(data.slideAt + dir, 0);

        if (data.slideAt < 0)
            data.slideAt = 0;
        else if (data.slideAt >= data.slides.length) {
            if (data.loop === true) {
                data.slideAt = 0;
                this.playSlide(0, true);
            }
            else
                this.stopSlideshow();
        }
        else
            this.playSlide(data.slideAt, dir > 0);
    }

    _getSlideshowContextOptions() {
        return [
            {
                name: "MonksEnhancedJournal.EditSlide",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.object.data.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    //const options = { top: li[0].offsetTop, left: window.innerWidth - SlideConfig.defaultOptions.width };
                    this.editSlide(id); //, options);
                }
            },
            {
                name: "SIDEBAR.Duplicate",
                icon: '<i class="far fa-copy"></i>',
                condition: () => game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.object.data.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    return this.cloneSlide(id);
                }
            },
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.object.data.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    Dialog.confirm({
                        title: `${game.i18n.localize("SIDEBAR.Delete")} slide`,
                        content: game.i18n.format("SIDEBAR.DeleteWarning", { type: 'slide' }),
                        yes: this.deleteSlide.bind(this, id),
                        options: {
                            top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                            left: window.innerWidth - 720
                        }
                    });
                }
            }
        ];
    }
}

Hooks.on("renderSlideshowSheet", (sheet, html, data) => {
    if (sheet.object.data.flags['monks-enhanced-journal'].state != 'stopped') {
        sheet.playSlide();
    } else if (!sheet.object.isOwner) {
        sheet.showSlide();
    }
});
