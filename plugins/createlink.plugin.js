import { MonksEnhancedJournal, log, i18n, setting } from "../monks-enhanced-journal.js"

let CreateLinkPlugin = {
    init : function(editor, text) {
        
        editor.ui.registry.addMenuItem('createlink', {
            icon: 'document-properties',
            text: 'Find Document',
            type: 'menuitem',
            onAction: () => {
                let docName = editor.selection.getContent({ format: 'text' });
                if (docName) {
                    docName = docName.toLowerCase();
                    let docs = [];
                    docs.push(...game.journal.filter(j => j.name.toLowerCase() == docName));
                    docs.push(...game.actors.filter(a => a.name.toLowerCase() == docName));

                    if (docs.length) {
                        let doc = docs[0];
                        let docLink = `@UUID[${doc.uuid}]{ ${doc.name} }`;
                        editor.selection.setContent(docLink);
                    }
                } else {
                    ui.notifications.warn("No text selected to use to find a document name");
                }
            },
            onSetup: (api) => {
                let docName = editor.selection.getContent({ format: 'text' });
                api.setEnabled(docName);
            }
        });
    },
}

export let createlinkinit = CreateLinkPlugin.init;