import { i18n } from "./monks-enhanced-journal.js"

export const registerSettings = function () {
	// Register any custom module settings here
	let modulename = "monks-enhanced-journal";

	let rollingmodules = {
		'monks-tokenbar': "Monk's TokenBar"
	};

	game.settings.register(modulename, "allow-player", {
		name: i18n("MonksEnhancedJournal.allow-player.name"),
		hint: i18n("MonksEnhancedJournal.allow-player.hint"),
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
}