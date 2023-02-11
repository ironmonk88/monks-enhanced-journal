import { MonksEnhancedJournal, i18n } from "./monks-enhanced-journal.js"
import { EditCurrency } from "./apps/editcurrency.js"
import { EditPersonAttributes, EditPlaceAttributes } from "./apps/editattributes.js"

export const registerSettings = function () {
	// Register any custom module settings here
	let modulename = "monks-enhanced-journal";

	const debouncedReload = foundry.utils.debounce(function () { window.location.reload(); }, 500);

	let rollingmodules = {
		'monks-tokenbar': "Monk's TokenBar"
	};

	let permissions = {
		'true': "Sidebar and Enhanced Journal",
		'mej': "Just Enhanced Journal",
		'false': "Neither"
	};

	let lootsheetoptions = MonksEnhancedJournal.getLootSheetOptions();
	let lootfolder = {};

	game.settings.registerMenu(modulename, 'editCurrency', {
		label: i18n("MonksEnhancedJournal.editcurrency.name"),
		hint: i18n("MonksEnhancedJournal.editcurrency.hint"),
		icon: 'fas fa-coins',
		restricted: true,
		type: EditCurrency
	});

	game.settings.registerMenu(modulename, 'editPersonAttributes', {
		label: i18n("MonksEnhancedJournal.editpersonattribute.name"),
		hint: i18n("MonksEnhancedJournal.editpersonattribute.hint"),
		icon: 'fas fa-user',
		restricted: true,
		type: EditPersonAttributes
	});

	game.settings.registerMenu(modulename, 'editPlaceAttributes', {
		label: i18n("MonksEnhancedJournal.editplaceattribute.name"),
		hint: i18n("MonksEnhancedJournal.editplaceattribute.hint"),
		icon: 'fas fa-place-of-worship',
		restricted: true,
		type: EditPlaceAttributes
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
		default: true,
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

	game.settings.register(modulename, "objectives-always", {
		name: i18n("MonksEnhancedJournal.objectives-always.name"),
		hint: i18n("MonksEnhancedJournal.objectives-always.hint"),
		scope: "client",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "add-create-link", {
		name: i18n("MonksEnhancedJournal.add-create-link.name"),
		hint: i18n("MonksEnhancedJournal.add-create-link.hint"),
		scope: "world",
		default: false,
		type: Boolean,
		onChange: debouncedReload
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
		default: 'true',
		type: String,
		choices: permissions,
	});

	game.settings.register(modulename, "show-chatbubble", {
		name: i18n("MonksEnhancedJournal.show-chatbubble.name"),
		hint: i18n("MonksEnhancedJournal.show-chatbubble.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "inline-roll-styling", {
		name: i18n("MonksEnhancedJournal.inline-roll-styling.name"),
		hint: i18n("MonksEnhancedJournal.inline-roll-styling.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: (value) => {
			$('body').toggleClass("inline-roll-styling", value);
		},
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
		onChange: (value) => {
			ui.journal.render();
		},
	});

	game.settings.register(modulename, "show-zero-quantity", {
		name: i18n("MonksEnhancedJournal.show-zero-quantity.name"),
		hint: i18n("MonksEnhancedJournal.show-zero-quantity.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "loot-inactive-players", {
		name: i18n("MonksEnhancedJournal.loot-inactive-players.name"),
		hint: i18n("MonksEnhancedJournal.loot-inactive-players.hint"),
		scope: "world",
		config: true,
		default: true,
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

	game.settings.register(modulename, "use-system-tag", {
		name: i18n("MonksEnhancedJournal.use-system-tag.name"),
		hint: i18n("MonksEnhancedJournal.use-system-tag.hint"),
		scope: "world",
		config: true,
		default: game.system.id == "pf2e",
		type: Boolean,
	});

	game.settings.register(modulename, "extract-extra-classes", {
		name: i18n("MonksEnhancedJournal.extract-extra-classes.name"),
		hint: i18n("MonksEnhancedJournal.extract-extra-classes.hint"),
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
		type: String,
	});
	game.settings.register(modulename, "loot-folder", {
		name: game.i18n.localize("MonksEnhancedJournal.loot-folder.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.loot-folder.hint"),
		scope: "world",
		config: false,
		default: "",
		choices: lootfolder,
		type: String,
	});
	game.settings.register(modulename, "loot-name", {
		name: i18n("MonksEnhancedJournal.loot-name.name"),
		hint: i18n("MonksEnhancedJournal.loot-name.hint"),
		scope: "world",
		config: true,
		default: i18n("MonksEnhancedJournal.LootEntry"),
		type: String,
	});

	game.settings.register(modulename, "currency", {
		scope: "world",
		config: false,
		default: [],
		type: Array,
	});

	game.settings.register(modulename, "person-attributes", {
		scope: "world",
		config: false,
		default: [
			{ id: 'race', name: "MonksEnhancedJournal.Race", hidden: false, full: false },
			{ id: 'gender', name: "MonksEnhancedJournal.Gender", hidden: true, full: false },
			{ id: 'age', name: "MonksEnhancedJournal.Age", hidden: false, full: false },
			{ id: 'eyes', name: "MonksEnhancedJournal.Eyes", hidden: false, full: false },
			{ id: 'skin', name: "MonksEnhancedJournal.Skin", hidden: true, full: false },
			{ id: 'hair', name: "MonksEnhancedJournal.Hair", hidden: false, full: false },
			{ id: 'life', name: "MonksEnhancedJournal.LifeStatus", hidden: true, full: false },
			{ id: 'profession', name: "MonksEnhancedJournal.Profession", hidden: true, full: false },
			{ id: 'pronoun', name: "MonksEnhancedJournal.Pronoun", hidden: true, full: false },
			{ id: 'voice', name: "MonksEnhancedJournal.Voice", hidden: false, full: false },
			{ id: 'faction', name: "MonksEnhancedJournal.Faction", hidden: true, full: false },
			{ id: 'height', name: "MonksEnhancedJournal.Height", hidden: true, full: false },
			{ id: 'weight', name: "MonksEnhancedJournal.Weight", hidden: true, full: false },
			{ id: 'traits', name: "MonksEnhancedJournal.Traits", hidden: false, full: false },
			{ id: 'ideals', name: "MonksEnhancedJournal.Ideals", hidden: false, full: true },
			{ id: 'bonds', name: "MonksEnhancedJournal.Bonds", hidden: false, full: true },
			{ id: 'flaws', name: "MonksEnhancedJournal.Flaws", hidden: false, full: true },
			{ id: 'longterm', name: "MonksEnhancedJournal.LongTermGoal", hidden: true, full: true },
			{ id: 'shortterm', name: "MonksEnhancedJournal.ShortTermGoal", hidden: true, full: true },
			{ id: 'beliefs', name: "MonksEnhancedJournal.Beliefs", hidden: true, full: true },
			{ id: 'secret', name: "MonksEnhancedJournal.Secret", hidden: true, full: true }
		],
		type: Array,
	});

	game.settings.register(modulename, "place-attributes", {
		scope: "world",
		config: false,
		default: [
			{ id: 'age', name: "MonksEnhancedJournal.Age", hidden: false, full: false },
			{ id: 'size', name: "MonksEnhancedJournal.Size", hidden: false, full: false },
			{ id: 'government', name: "MonksEnhancedJournal.Government", hidden: false, full: false },
			{ id: 'alignment', name: "MonksEnhancedJournal.Alignment", hidden: true, full: false },
			{ id: 'faction', name: "MonksEnhancedJournal.Faction", hidden: true, full: false },
			{ id: 'inhabitants', name: "MonksEnhancedJournal.Inhabitants", hidden: false, full: true },
			{ id: 'districts', name: "MonksEnhancedJournal.Districts", hidden: true, full: true },
			{ id: 'agricultural', name: "MonksEnhancedJournal.Agricultural", hidden: true, full: true },
			{ id: 'cultural', name: "MonksEnhancedJournal.Cultural", hidden: true, full: true },
			{ id: 'educational', name: "MonksEnhancedJournal.Educational", hidden: true, full: true },
			{ id: 'indistrial', name: "MonksEnhancedJournal.Industrial", hidden: true, full: true },
			{ id: 'mercantile', name: "MonksEnhancedJournal.Mercantile", hidden: true, full: true },
			{ id: 'military', name: "MonksEnhancedJournal.Military", hidden: true, full: true }
		],
		type: Array,
	});

	game.settings.register(modulename, "show-dialog", {
		scope: "client",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "show-chat-bubbles", {
		name: game.i18n.localize("MonksEnhancedJournal.show-chat-bubbles.name"),
		hint: game.i18n.localize("MonksEnhancedJournal.show-chat-bubbles.hint"),
		scope: "client",
		default: false,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-relationships", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});

	game.settings.register(modulename, "fix-journals", {
		scope: "world",
		default: true,
		type: Boolean,
		config: false
	});
}