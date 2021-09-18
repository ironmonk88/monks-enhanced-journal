import { MonksEnhancedJournal, log, i18n, setting } from "../monks-enhanced-journal.js"

let BackgroundPlugin = {
    init : function(editor, url) {
        
        /* Add a button that opens a window */
        editor.ui.registry.addButton('background', {
            tooltip: "Edit Background",
            icon: "highlight-bg-color",
            onAction: function () {
                /* Open window */
                BackgroundPlugin.openDialog(editor);
            }
        });
        /* Adds a menu item, which can then be included in any menu via the menu/menubar configuration */
        editor.ui.registry.addMenuItem('background', {
            text: 'Edit Background',
            onAction: function () {
                /* Open window */
                BackgroundPlugin.openDialog(editor);
            }
        });
        /* Return the metadata for the help plugin */
        return {
            getMetadata: function () {
                return {
                    name: 'Background plugin',
                    url: ''
                };
            }
        };
    },

    openDialog: function (editor) {
        let olddata = editor.enhancedsheet.object.getFlag('monks-enhanced-journal', 'style') || {};
        return editor.windowManager.open({
            title: 'Edit Background',
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'colorinput',
                        name: 'color',
                        label: 'Color'
                    },
                    {
                        type: 'urlinput',
                        name: 'img',
                        label: 'Image'
                    },
                    {
                        type: 'selectbox',
                        name: 'sizing',
                        label: 'Sizing',
                        items: [
                            { value: 'repeat', text: 'Repeat' },
                            { value: 'stretch', text: 'Stretch' },
                            { value: 'contain', text: 'Contain' },
                            { value: 'cover', text: 'Cover' }
                        ]
                    }
                ]
            },
            buttons: [
                {
                    type: 'cancel',
                    text: 'Close'
                },
                {
                    type: 'submit',
                    text: 'Save',
                    primary: true
                }
            ],
            initialData: olddata,
            onSubmit: function (api) {
                var data = api.getData();
                //editor.insertContent('Title: ' + data.title);
                log(editor);
                editor.enhancedsheet.object.setFlag('monks-enhanced-journal', 'style', data);
                editor.enhancedsheet.updateStyle(data, $(editor.contentWindow.document));
                //MonksEnhancedJournal.journal.updateStyle(data);  //this one gets refreshed once the editor closes
                
                api.close();
            }
        });
    }
}

export let backgroundinit = BackgroundPlugin.init;