import { MonksEnhancedJournal, log, error, i18n, setting, makeid } from "../monks-enhanced-journal.js";

export class EditSound extends FormApplication {
    constructor(object, sound, options) {
        super(object, options);

        this.soundfile = sound;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
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
        let sound = mergeObject({volume: 1, loop: true, autoplay: true}, (this.object.getFlag("monks-enhanced-journal", "sound") || {}));
        return {
            sound: sound
        };
    }

    _updateObject(event, formData) {
        let data = expandObject(formData);

        if (this.soundfile) {
            let oldData = this.object.getFlag('monks-enhanced-journal', 'sound');
            if (oldData.volume != data.sound.volume) {
                this.soundfile._mejvolume = data.sound.volume;
                this.soundfile.volume = data.sound.volume * game.settings.get("core", "globalInterfaceVolume");
            }
            if (oldData.loop != data.sound.loop)
                this.soundfile.loop = data.sound.loop;
            if (oldData.audiofile != data.sound.audiofile) {
                let isPlaying = this.soundfile.playing;
                if (this.soundfile?.container?.playing)
                    this.soundfile.container.stop();
                if (data.sound.audiofile) {
                    this.soundfile.container = new AudioContainer(data.sound.audiofile);
                    this.soundfile.src = data.sound.audiofile;
                    this.soundfile.load({ autoplay: isPlaying, autoplayOptions: { loop: data.sound.loop, volume: data.sound.volume } });
                } else
                    this.soundfile = null;
            }
        }

        this.object.setFlag('monks-enhanced-journal', 'sound', data.sound);
        this.submitting = true;
    }
}