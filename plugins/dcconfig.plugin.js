import { MonksEnhancedJournal, log, i18n, setting } from "../monks-enhanced-journal.js"

let DCConfigPlugin = {
    init : function(editor, url) {
        
        /* Add a button that opens a window */
        editor.ui.registry.addButton('dcconfig', {
            tooltip: i18n("MonksEnhancedJournal.RequestRollConfig"),
            icon: "non-breaking",
            onAction: function () {
                /* Open window */
                DCConfigPlugin.openDialog(editor);
            }
        });
        /* Adds a menu item, which can then be included in any menu via the menu/menubar configuration */
        editor.ui.registry.addMenuItem('dcconfig', {
            text: i18n("MonksEnhancedJournal.RequestRollConfig"),
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
            title: i18n("MonksEnhancedJournal.RequestRollConfig"),
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'input',
                        name: 'request',
                        label: i18n("MonksEnhancedJournal.Request")
                    },
                    {
                        type: 'input',
                        name: 'dc',
                        inputMode: 'number',
                        label: i18n("MonksEnhancedJournal.DC")
                    },
                    {
                        type: 'checkbox',
                        name: 'silent',
                        label: i18n("MonksEnhancedJournal.Silent")
                    },
                    {
                        type: 'checkbox',
                        name: 'fastForward',
                        label: i18n("MonksEnhancedJournal.FastForward")
                    },
                    {
                        type: 'selectbox',
                        name: 'rollmode',
                        label: i18n("MonksEnhancedJournal.RollMode"),
                        items: [
                            { value: 'roll', text: i18n("MonksEnhancedJournal.PublicRoll") },
                            { value: 'gmroll', text: i18n("MonksEnhancedJournal.PublicHiddenRoll") },
                            { value: 'blindroll', text: i18n("MonksEnhancedJournal.PrivateHiddenRoll") },
                            { value: 'selfroll', text: i18n("MonksEnhancedJournal.GMOnlyRoll") }
                        ]
                    },
                    {
                        type: 'input',
                        name: 'flavor',
                        label: i18n("MonksEnhancedJournal.FlavorText")
                    }
                ]
            },
            buttons: [
                {
                    type: 'cancel',
                    text: i18n("MonksEnhancedJournal.Close")
                },
                {
                    type: 'submit',
                    text: i18n("MonksEnhancedJournal.Save"),
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