import { MonksEnhancedJournal, log, i18n, setting } from "../monks-enhanced-journal.js"

let DCConfigPlugin = {
    init : function(editor, url) {
        
        /* Add a button that opens a window */
        editor.ui.registry.addButton('dcconfig', {
            tooltip: "Request Roll Config",
            icon: "non-breaking",
            onAction: function () {
                /* Open window */
                DCConfigPlugin.openDialog(editor);
            }
        });
        /* Adds a menu item, which can then be included in any menu via the menu/menubar configuration */
        editor.ui.registry.addMenuItem('dcconfig', {
            text: 'Request Roll Config',
            onAction: function () {
                /* Open window */
                DCConfigPlugin.openDialog(editor);
            }
        });
        /* Return the metadata for the help plugin */
        return {
            getMetadata: function () {
                return {
                    name: 'DC Config plugin',
                    url: ''
                };
            }
        };
    },

    openDialog: function (editor) {
        return editor.windowManager.open({
            title: 'DC Config',
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'input',
                        name: 'request',
                        label: 'Request'
                    },
                    {
                        type: 'input',
                        name: 'dc',
                        inputMode: 'number',
                        label: 'DC'
                    },
                    {
                        type: 'checkbox',
                        name: 'silent',
                        label: 'Silent'
                    },
                    {
                        type: 'checkbox',
                        name: 'fastForward',
                        label: 'Fast Forward'
                    },
                    {
                        type: 'selectbox',
                        name: 'rollmode',
                        label: 'Roll Mode',
                        items: [
                            { value: 'roll', text: 'Public Roll' },
                            { value: 'gmroll', text: 'Public, Hidden Roll' },
                            { value: 'blindroll', text: 'Private, Hidden Roll' },
                            { value: 'selfroll', text: 'GM Only Roll' }
                        ]
                    },
                    {
                        type: 'input',
                        name: 'flavor',
                        label: 'Flavor Text'
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
            onSubmit: function (api) {
                var data = api.getData();
                editor.insertContent(`@Request[${data.request}${data.dc ? " dc:" + data.dc : ""}${data.silent ? " silent" : ""}${data.fastForward ? " fastForward" : ""} rollmode:${data.rollmode}]${data.flavor ? "{" + data.flavor + "}" : ""}`);
                
                api.close();
            }
        });
    }
}

export let dcconfiginit = DCConfigPlugin.init;