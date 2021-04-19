export class EnhancedDirectory extends JournalDirectory {
    constructor(journal, options) {
        super(options);

        this.journal = journal;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "journal-directory";
        return options;
    }

    get id() {
        return "journal-directory";
    }
}