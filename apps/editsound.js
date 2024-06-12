import { MonksEnhancedJournal, log, error, i18n, setting, makeid, getVolume } from "../monks-enhanced-journal.js";

export class EditSound extends FormApplication {
    constructor(object, sound, options) {
        super(object, options);

        this.soundfile = sound;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "journal-editsound",
            title: i18n("MonksEnhancedJournal.EditSound"),
            classes: ["edit-sound"],
            template: "./modules/monks-enhanced-journal/templates/edit-sound.html",
            width: 500,
            height: "auto",
            closeOnSubmit: true,
            popOut: true,
        });
    }

    getData(options) {
        let sound = foundry.utils.mergeObject({volume: 1, loop: true, autoplay: true}, (this.object.getFlag("monks-enhanced-journal", "sound") || {}));
        return {
            sound: sound
        };
    }

    _updateObject(event, formData) {
        let data = foundry.utils.expandObject(formData);

        if (this.soundfile) {
            let oldData = this.object.getFlag('monks-enhanced-journal', 'sound');
            if (oldData.volume != data.sound.volume) {
                this.soundfile.effectiveVolume = data.sound.volume;
                this.soundfile.volume = data.sound.volume * getVolume();
            }
            if (oldData.loop != data.sound.loop)
                this.soundfile.loop = data.sound.loop;
            if (oldData.audiofile != data.sound.audiofile) {
                let isPlaying = this.soundfile.playing;
                if (this.soundfile?.playing)
                    this.soundfile.stop();
                if (data.sound.audiofile) {
                    this.soundfile = new foundry.audio.Sound(data.sound.audiofile);
                    //this.soundfile.src = data.sound.audiofile;
                    this.soundfile.load({ autoplay: isPlaying, autoplayOptions: { loop: data.sound.loop, volume: data.sound.volume } });
                } else
                    this.soundfile = null;
            }
        }

        this.object.setFlag('monks-enhanced-journal', 'sound', data.sound);
        this.submitting = true;
    }
}