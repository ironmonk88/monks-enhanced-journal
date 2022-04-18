import { MonksEnhancedJournal, i18n } from "./monks-enhanced-journal.js"
import { EditCurrency } from "./apps/editcurrency.js"

export const registerSettings = function () {
	// Register any custom module settings here
	let modulename = "monks-enhanced-journal";

	let rollingmodules = {
		'monks-tokenbar': "Monk's TokenBar"
	};

	let lootsheetoptions = MonksEnhancedJournal.getLootSheetOptions();
	let lootentity = {};
	let lootfolder = {};

	game.settings.registerMenu(modulename, 'editCurrency', {
		name: 'Edit Currency',
		label: 'Edit Currency',
		hint: 'Edit the currency that this worls will use',
		icon: 'fas fa-coins',
		restricted: true,
		type: EditCurrency
	});

	game.settings.register(modulename, "allow-player", {
		name: i18n("MonksEnhancedJournal.allow-player.name"),
		hint: i18n("MonksEnhancedJournal.allow-player.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "open-new-tab", {
		name: i18n("MonksEnhancedJournal.open-new-tab.name"),
		hint: i18n("MonksEnhancedJournal.open-new-tab.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "rolling-module", {
		name: i18n("MonksEnhancedJournal.rolling-module.name"),
		hint: i18n("MonksEnhancedJournal.rolling-module.hint"),
		scope: "world",
		default: null,
		type: String,
		choices: rollingmodules,
		config: true
	});

	game.settings.register(modulename, "use-objectives", {
		name: i18n("MonksEnhancedJournal.use-objectives.name"),
		hint: i18n("MonksEnhancedJournal.use-objectives.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "show-objectives", {
		name: i18n("MonksEnhancedJournal.show-objectives.name"),
		hint: i18n("MonksEnhancedJournal.show-objectives.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "use-runes", {
		name: i18n("MonksEnhancedJournal.use-runes.name"),
		hint: i18n("MonksEnhancedJournal.use-runes.hint"),
		scope: "world",
		config: game.modules.get("polyglot")?.active,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "show-permissions", {
		name: i18n("MonksEnhancedJournal.show-permissions.name"),
		hint: i18n("MonksEnhancedJournal.show-permissions.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "hud-limited", {
		name: i18n("MonksEnhancedJournal.hud-limited.name"),
		hint: i18n("MonksEnhancedJournal.hud-limited.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "start-collapsed", {
		name: i18n("MonksEnhancedJournal.start-collapsed.name"),
		hint: i18n("MonksEnhancedJournal.start-collapsed.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "open-outside", {
		name: i18n("MonksEnhancedJournal.open-outside.name"),
		hint: i18n("MonksEnhancedJournal.open-outside.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "show-folder-sort", {
		name: i18n("MonksEnhancedJournal.show-folder-sort.name"),
		hint: i18n("MonksEnhancedJournal.show-folder-sort.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "show-zero-quantity", {
		name: i18n("MonksEnhancedJournal.show-zero-quantity.name"),
		hint: i18n("MonksEnhancedJournal.show-zero-quantity.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "chat-message", {
		name: i18n("MonksEnhancedJournal.chat-message.name"),
		hint: i18n("MonksEnhancedJournal.chat-message.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "hide-inline", {
		name: i18n("MonksEnhancedJournal.hide-inline.name"),
		hint: i18n("MonksEnhancedJournal.hide-inline.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "hide-rolltables", {
		name: i18n("MonksEnhancedJournal.hide-rolltables.name"),
		hint: i18n("MonksEnhancedJournal.hide-rolltables.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "show-bookmarkbar", {
		name: i18n("MonksEnhancedJournal.show-bookmarkbar.name"),
		hint: i18n("MonksEnhancedJournal.show-bookmarkbar.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "show-menubar", {
		name: i18n("MonksEnhancedJournal.show-menubar.name"),
		hint: i18n("MonksEnhancedJournal.show-menubar.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "hide-rolltables", {
		name: i18n("MonksEnhancedJournal.hide-rolltables.name"),
		hint: i18n("MonksEnhancedJournal.hide-rolltables.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "distribute-conversion", {
		name: i18n("MonksEnhancedJournal.distribute-conversion.name"),
		hint: i18n("MonksEnhancedJournal.distribute-conversion.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "purchase-conversion", {
		name: i18n("MonksEnhancedJournal.purchase-conversion.name"),
		hint: i18n("MonksEnhancedJournal.purchase-conversion.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "loot-sheet", {
		name: game.i18n.localize("MonksEnhancedJournal.loot-sheet.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.loot-sheet.hint"),
		scope: "world",
		config: true,
		default: "monks-enhanced-journal",
		choices: lootsheetoptions,
		type: String,
	});
	game.settings.register(modulename, "loot-entity", {
		name: game.i18n.localize("MonksEnhancedJournal.loot-entity.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.loot-entity.hint"),
		scope: "world",
		config: true,
		default: "",
		choices: lootentity,
		type: String,
	});
	game.settings.register(modulename, "loot-folder", {
		name: game.i18n.localize("MonksEnhancedJournal.loot-folder.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.loot-folder.hint"),
		scope: "world",
		config: true,
		default: "",
		choices: lootfolder,
		type: String,
	});

	game.settings.register(modulename, "currency", {
		scope: "world",
		config: false,
		default: [],
		type: Array,
	});

	game.settings.register(modulename, "show-dialog", {
		scope: "client",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-relationships", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});
}