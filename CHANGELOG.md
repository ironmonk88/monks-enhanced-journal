# Version 1.0.45

Fixed issue where the items list in a Shop would scroll back to the top when items are edited.

Fixed issue with text colouring in Warhammer

Changed the Note HUD so for Shop and Loot notes, making it visible for players will give them Observer permissions rather than just Limited.

Added the option for players to cancel a shop transaction.

Changed the default icon applied to Shop, Loot, Encounter, and Place notes dragged to the canvas.

Fixed issues with the latest version of Polyglot

Added the option to set the quantity of monsters in an Encounter to allow for formulas, so you can have the Encounter roll for monsters.

Fixed issues with filling Loot and Shop from Rolltable.

Fixed issue with Place sheet showing relationships that player doesn't have permissions to see.

Added support for SWADE currency

# Version 1.0.44

Fixed an issue where the submit button of the old journal sheet was causing the entire page to submit.

Added an error message to the dialog that sends journal entries to players if there are no players selected and Show All isn't pressed.

Fixed an issue where newly created journal entries weren't getting the type set properly.

Fixed an issue where players gold wasn't being subtracted when they could purchase the item themselves.

Fixed issue with the way some systems handle currencies.

Fixed issue when the default sheet class was changed, the journal sheet wasn't updating.

Fixed issue with updating monster quantities in Encounters

Added the option to create an encounter with some tokens hidden.

Fixed issue with showing to players when the sheet is not within the enhanced browser

Updated the Loot sheet to select the current party if no characters are added.

Added a button to grant items to players that request them in the loot sheet.

Added a button to add the current party to loot sheet.

Fixed issues with quantity if it's an object rather than a number

Fixed issue with Person sheet not able to remove relationships

Fixed issue with short term goals not being shown on the Person sheet

# Version 1.0.43

Fixed an issue where opening tabs automatically wasn't checking to see if the tab was already open.

Fixed an issue where scroll bars were no longer showing with the tab sheets

Added increased width to the currency fields

Added price to the description of the Loot and Shop item.

Set the default currency to system specific currency rather than just using gp.

And added Item summaries for Quest and Encounter sheets

# Version 1.0.42

Fixed an issue importing items from Shopkeeper

Fixed an issue with getting the Item document.

# Version 1.0.41

Fixed some styling issues with the Fallout system

Fixed tabs not working in the AGE system

Fixed an issue where warning that Lib: Document Sheet Registrar was conflicted was preventing the module from loading.

Added the option to add monsters to Encounter via a Roll Table.

Added the from column for the Loot Entry, so you can see what token contributed what item

Fixed an issue where Person relationship could be seen by players even if they didn't have permissions to know about it.

Removed the Actor associated with a Person sheet for players.

Allowed Person sheet to have relationships with Shop, Point of Interest, and Quest.

Fixed an issue when adding an Actor to a Place.

Fixed messages displayed when no items have been added so that it says one thing for the player and a different thing for the GM.

Fixed an issue where the players associated with the Loot sheet would show to the players.

# Version 1.0.40

Added the Loot sheet.  Using this sheet you can drag players to the entry, if they aren't already there.  And split the money associated witht he Loot evenly between the characters.  You can also drag items from Loot onto the character icons to add the items to the characters inventory.  Like the Shop sheet, you can set it so that only the GM can control item distribution, players are allowed to take their own items, or they can make a request for the item.

Along with that you can now, in the settings, tell Enhanced Journals what you want to do with Quest or Encounter treasure.  You can have it create a new Loot Sheet or add the items to an old Loot sheet.  And there's integration with both Lootsheet and Merchant sheet to create actors and add the items to them.

The Shop sheet has also been updated, it will now try and deduct the money from the characters currency.  You can save the item using what currency it should be associated with.  So if something is worth 5 silver peices you can save the item price as `5 sp`.

Using the Shop, there is now a link for players to click on to buy the item, rather than relyign on them dragging and dropping to their character.

You can also now fill a Shop and a Loot sheet using a Rollable Table.

There's also now a Text only Journal Sheet.

I've added the option to open Journal Entries in a new tab automatically.

Fixed an issue where opening Journal Entries wasn't properly checking if the user had permissions to view it.

Added Inline Rolls to the text description form Journal Entries. `@Request[perception dc:15 silent fastForward rollmode:selfroll]{flavor text}` and also added the option for Contested rolls `@Contested[strength strength silent fastForward rollmode:selfroll]{flavor text}`

Fixed an issue with the way items were being added to the Journal Entries.  I was adding them by just their ID, but discovered that if the item came from a compendium and the compendium was deleted, or if the item itself was deleted then the item would disappear from the Journal Entry.  I've changed it so that Journal Entries will keep a copy of the item data.  Now if the Journal Entry is added to a compendium, it can be transfered to a new world without data loss.  Because of these changes, be aware that Shopkeeper items will no longer automatically show up.  You need to right click on the image to import the items from the Actor.

Fixed an issue with saving user notes.

Fixed some text issues when creating a new Checklist

Added the option to Clear all content from a folder

Fixed an issue with Slideshow buttons not workign when using Popout!

Fixed an issue with Checkbox search box sizing.

Added currency to Encounter Loot, and also expanded the tabs so that Monsters, Loot, and DCs are on separate tabs.

# Version 1.0.39

Removed adding the system to the subdocument.  I know this is going to mess up the styling for PF2E, but the change was really messing up the stylings of all the other modules.

I think I found a way to work around the issues with Lib: Document Sheet Registrar.

Fixed an issue where players could see what Journal Entry was linked to a token for token dialog.

Fixed an issue defaulting the price of shop items.

Fixed an issue with Encounter sheet and Shop sheet not saving.

# Version 1.0.38

Added option to open a Journal Entry by clicking on an Objective link.

Added the option for a counter on objectives.  In case they require doing multiple of the same thing.

Added the option to display Objectives using a toggle button on the toolbar.

Fixed an issue with saving lists on a Journal Entry.  Core changed some things and I think introduced an error.

# Version 1.0.37

Fixed issues with drag and drop

Changed the slide show config to allow you to visually create text.

Fixed some issue with slideshows not stopping properly.  And with the text not showing properly.

Added option to change the background colour for slide show texts, and set the transparency of the text.

# Version 1.0.36 

Updating the code to make it v9 compliant.

# Version 1.0.35

Fixed issue with Person sheet.  Rolle value wasn't saving due to a spelling mistake in the code.

Fixed the positioning of the Note HUD.

Cleaned up the Note drop down to select a journal.

Fixed an error when trying to open the Note HUD and there wasn't a valid Journal Entry attached

# Version 1.0.34

Added a function to re-convert quest rewards.  There was some conversion problems with a previous version, the old data is still saved, but if the new data is created in error then it won't check the old data again.  The new function should correct the issues.

Changed the images to divs so that Journal Scaler will function properly.

Fixed issue with journal sheets being displayed in Monk's COmmon Display

# Version 1.0.33

Fixing issue with Pathfinder drop down

Generalized the default object created by Enhanced Journal

Fixed some issues with converting between old reward and new rewards

# Version 1.0.32

Added styling fixes for Rippers UI

Fixed keyup issue with the search input

Added some error trapping when trying to find the entity for the Journal Sheet

Removed the option to open a new tab if you are currently editing one.  It just ended up causing too many issues.

Moved item drops to their respective sheets so they are independant of the Enhanced Journal and can function on their own.

Added a HUD to the Notes layer, so you can now right click to hide/show a note to players, begin an encounter, and assign loot to a loot character.

Fixed an issue with TinyMCE styling if the system doesn't set it as an array

Fixed an issue where clicking on an entry in the sidebar wasn't opening the entry.

Added checks for Monk's Common Display so that the entries aren't opened in the Enhanced Journal

Fixed issue when checking for Quick Encounters

Added Hook so other modules can determine if a journal entry should be handled by Enhanced Journal.

Added option to show if folders are sorted alphabetically or manually.

Showing the players actual permission levels in the tooltip on the sidebar.

Added remaining quantity for items.  So you can set what it's supposed to be and keep track of how many have been removed.

Also added a button to refill the quantity.

Added option to assign an Actor as the one to receive items.  So you can have a loot character.

Fixed an issue that data toolbox was creating

Fixed issue with Checkbox List context menu

Added create encounter, create combat and select combatants draggables and buttons to encounter sheet

Fixed issue with entry that has limited permissions and how it opens for the player

Fixed issue with the Sheet configuration button showing for players

Added pronouns to the Person Sheet

Added statuses back to the Quest sheet.  I tried to work around it, but it just doesn't make sense without them.

Added multiple rewards in case you need to have a different set of things depending on how the players perform.

Added option to show or hide shop items from the player if the quantity is zero.

Fixed issue where purchasing from the shop wasn't decreasing the quantity available.

Fixed an issue where hidden items in the shop where still showing as an empty category to the players.

# Version 1.0.31

Added styling fixed for Warhammer

Fixed an issue where Scene Notes wouldn't open in Enhanced Journals

Fixed issue where the correct quest colours weren't being shown.

Added tooltip to show what kind of permissions everyone has in the Journal Directory.

Added relationships to the Person entry

# Version 1.0.30

Fixed an issue with some modules having a rendering issue.  I wasn't creating the subsheets element properly.  At least not in the way they would be expecting.

Fixed an issue where blank tabs were callign the render Hook.  Which made no sense to any modules that tried to capture that.

Moved the creation of control buttons to the Enhanced Journal rather than the pages themselves.  And updated the Hook appropriately.  This will allow other modules to add buttons as needed.

Ignoring the creation of Quick Encounters journal entries.

Fixed an issue, I think, where the confirm box was preventing the Journal Entry from being edited again on the stand alone app.

# Version 1.0.29

Fixed issue with Quest currencies when the system doesn't have any.

# Version 1.0.28

Fixed an issue where newly created Journal Entries were being opened for players that were allowed to use the Enhanced Journal browser.

Added Spanish translations, thank you lozalojo!

Added French translations, thank you remiverdel!

# Version 1.0.27

Fixed issue with chatbubbles

# Version 1.0.26

Fixed issue when Enhanced Journal opens on a brand new world and no tabs have ever been opened.

Fixed rendering issue, it wasn't waiting for the parent to finish rendering first before trying to render the subsheet.

Fixed issue where it was trying to save scroll positions even if a subsheet didn't exist.

Updating the tooltip text of the edit/save button so it displays the correct text.

Clearing out the journal value when the journal closes.

Changing the recently opened to use uuid instead of just id in case Compendium entities are opened.

Correcting styling issues with various systems (DnD3.5, SFRPG, SW5e)

Added option to open chat links outside of Enhanced Journal by holding the Alt key while clicking.

Added option to double click on a Note or Token and display the text of a Journal Entry as a chat bubble instead of opening up the Journal Entry.  If the Journal Entry contains just a unordered list then one of the entries will ranbdomly be used.  If an ordered list is used, then it will select each item in sequence.  With no list, it will use the text in the Journal Entry.  Turn on this feature by selecting the "Show as Chat Bubble" setting.

# Version 1.0.25

Enhanced Journals will now save the last scroll position of the entry that you're on.  So if you change tabs and then come back you don't have to scroll to find where you were.

If Active Tiles is trying to select a journal entry, then Enhanced Journals will bypass opening the entry.

Fixed issue when creating a Journal Entry.

Fixed an issue when a slideshow is closed while a slide text is set to fade out.

Fixed an issue with Quest objectives.

# Version 1.0.24

Fixing a filename issue.  SlideshowSheet vs SlideShowSheet

# Version 1.0.23

Fixed an issue with players getting an errors when loading a journal entry.

After a journal type is changed, refreshing the main sidebar.

Fixed issue where opening a journal entry as a player was opening up the full version even if it's supposed to be disabled for players.

Fixed an issue where items that no longer exist would crash a Shop.

Added drag and drop instrustions to the Place entry if there are no items.

# Version 1.0.22

Oh where to begin with this update.
The whole module has been rebuilt so instead of overwriting a Journal Entry, the browser part is it's own application and each Journal Type is it's own sheet now.  This gives greater flexibility for improvements int he future as well as inter-module communications.

I am expecting it to break somewhere as the changes are massive.

Things to note... that I'm sure doesn't cover everything, since I fixed things as I went.

Added the option to open the browser with the file menu collapsed.

Changed the Quests from having a status to having the option to "Show the quest to Players", "Show the Quest in the Notifications window", and "compete the quest".  I think this trims down the options nicely.

Added the option of players requesting a purchase, or dragging the item itself if the GM allows it.

Cleaned up the Journal Entries so that when shown to a player, they only reveal what they should reveal.

Changed slideshow text to allow for multiple texts to be added.

Added animations to the texts so they can fade in and out.

Encounters will let you drag and drop the group of monsters onto the scene.

You can create a Journal Link that opens up just the picture.  Instead of using @JournalEntry[9WdmdaZAzXSN1nih]{Test Picture} change it to @Picture[9WdmdaZAzXSN1nih]{Test Picture} and when you click on it, it will open just the image.

A new Journal Type has been added, Checklist.  This will let you create a list of items that you can check off.

And players can now purchase things from a shop.  Either by dragging it to their character themselves or requesting it from the GM.

# Version 1.0.21

Fixed issue with toggling the folder navigation.  Showing an Actor, then going back to a Journal Entry would displace the lines.

Added Point of Interest

Fixed issue where old Place entries weren't loading due to the new features added not being initialised.

Added Type field to Place, so you can show what type of settle ment it is, Village, Town, City, Metropolis, etc.

Changed City back to Place

# Version 1.0.20

Fixing issues with removing Forien's Quest Folder

Fixing issue with editing the person and city fields.

Fixing issues with importing from compendium

# Version 1.0.19

Added the option to edit the fields that are seen on the person and city sheets

Fixed issue where the Description tab was always starting as active

Addes Shops!

Prevent a Forien's Quest Log from being loaded into Enhanced Journal

Added links to navigate through enties in a folder

Changed the magnify image buton to a right click instead so the interface was cleaner.

Changed polyglot rendering so that you have to click to translate.  I liked the hover over but it cause way too many issues with formating.

Added inline request roll, so you can add a link to request a roll.  Currently the syntax is %[perception 15]% to request a perception roll with a DC of 15

Fixed conflict between Enhanced Journal and Kanka

Fixed issue when copying journal sheets to and from a compendium.

Preloading polyglot fonts to speed up loading of Journal Page

Added Notes to Encounter sheet

# Version 1.0.18

Added option to reorder slides by dragging and dropping.

Fixing an issue with GM Screen, it preloads a dummy version of a Journal Page, and I need to check that first and load a new page if it's active.

Changing the edit pencil icon to a save icon when editing.

Checking for changes appropriately instead of just checking if the editor is open.

Fixing issues with Slideshow

Fixing issue with Polyglot, the module added an API and required a small change with Enhanced Journal.

Updated the Person sheet to show more information.

Added option to delete an attached actor from a Person Sheet using right-click.

Fixing styling issue with Pathfinder

Fixing issue with adding polyglot css when polyglot isn't an active module.

# Version 1.0.17

Fixed the issue with rendering again.  Hopefully this is the last time, but I'm not holding my breath.
This time to fix issues with Trigger Happy.

Altered the editor with journals so you can have a lot more control over the content.  Adding in the menu bar gives you access to text colour, formatting, font, font sizes, etc.

Added the option of changing the background of a Journal Entry.  You can set it to a colour, or an image and control how that image is displayed.

Fixed an issue where opening an Actor in Enhanced Journal, then going back to a previous entry would stop the tabs from responding.

Changed the way Journal Entries are shared to players.  Now if the Journal Entry you're sharing has only text content or an image content, the tabs won't display.  If they're not needed, then they'll just get in the way.

Changed the way embedded Scenes are opened from a Journal Entry.  Before it would open up the Scene config dialog, now they'll actually activate that scene.

Added three more fonts.

Added the drop cap style.  Yes these are borrowed from the "Custom Journal" module that doesn't seem to work any more.

I swear this change is going to break something, and I apologize in advance for that happening.

# Version 1.0.16

Fixed issue with rendering of the journal.

Added check to see if the journal entry is being edited before allowing the tab to change.

When removing tab that isn't the active one, don't switch to a new tab.

Fixed issue when players that are allowed to use the full journal open an entry they can view.

Allow Journal Entry to share to players as just a picture.

Fixed an issue with a command change in Foundry. _onClickEntityLink to _onClickContentLink.

Increased the width of the quest status bar.

Fixed issue with spelling mistake when getting a setting.

Fixed issue with secret comments not being displayed properly.

# Version 1.0.15

Fixed conflict with Collapsible Journal Sections that prevented notes from being opened.

# Version 1.0.14

Added support for Collapsible Journal Sections.

# Version 1.0.12

Fixed issue with Scene Linked entry not opening properly.

Fixed compatibility with quick insert

Added collapsable right menu

Added option to add tab without activating it.

Fixed issue where opening an item from a locked compendium pack would thorw an error

Added option to extract text from a journal entry into a new journal entry.  Kinda like what Furnace did with splitting a journal, but you have to select the text in Enhanced Journal.

Added option to loop a slideshow

Updated the colours for the journal directory so that custom directory colours have better readable text

Updated the journal entry dropdown for notes dropped on the canvas.  Before it was just a random jumble, now it's a list that works similar to the sidebar directory list.

Changed the "open in new tab" from shift click, to ctrl click, as shift click was highlighting text

# Version 1.0.11
Added option to see the player permissions on the directory

Added currency option to quest

Fixed up polyglot not updating properly

Fixed issues with entity links reverting after saving the entry.

# Version 1.0.10
Fixed issue when deleted entries are loaded.

Fixed issue when entries are created.

Fixed issue with folder sizing in PF1

Added option to assign XP with button

# Version 1.0.9
Fixed issue with player viewing encounter log while GM creates a new entry, that entry would appear in the players enhanced journal.

Fixed issue with Polyglot integration

Added option to set permissions when showing to players.

Added option to show picture when viewing an Actor

Added option to open Actor sheet from Actor tab

Fixed issue where selecting an old journal entry that was just a picture and then changing to an enhanced journal, wouldn't display anything.

Added option to see both text and picture for journal entries regardless of if they're old or new.

Fixed an issue with slideshow sound not saving.

Fixed a really strange issue where if there's only one text control on a window, pressing enter in it will cause the webpage to submit.

Added option to shift click and open an entry in a new tab.

Fixed issue with adding Compendium items, was missing the pack id

Fixed issue when creating a new Entry, it wouldn't load the new entry properly.

Hiding Forien's Quest folder if that module is running and the folder is not to be shown.

# Version 1.0.8
Added button to exapand an image to the full size of the window.

Fixed an issue with drag and dropping directory items.

Fixed an issue with dragging and dropping items onto actors.

Fix tab styling when a tab gets really small.

Added option to convert to different journal types.

Fixed issue with cancelling sent images.

Added support for Forien's Quest log items.  It's not quite correct, the text isn't uploading properly, but the rest of the details are uploaded properly.

Added Organizations

Fixed issue where deleting items wasn't refreshing

Recording where the items were dropped

Fixing issue where dropping the same item on Rewards or Items would duplicate the item.  Instead it just increases the Quantity.

Fixed issues with playing the slideshow.  The sound will now quit playing when the slideshow has stopped.

Fixed issue with the tab titles not updating.

Fixed issue when trying to load a Journal Page from a Compendium... I honestly didn't even know those existed.

Fixed an issue opening journal entries links from descriptions

Fixed and issue when showing players if no players are picked

Fixed an issue with creating a new slide, but not actually saving it, still leaves the old slide

Fixed an issue with editing when you should be allowed to edit.

# Version 1.0.7

Fixed an issue where you could bookmark a blank tab

Fixed an issue where a blank tab would lose the "New Tab" title on reload.

Fixed an issue with the Directory reseting the scroll top when rendered.

Fixed issue where players could right-click the journal directory tab and it would pop up the last viewed entry.

Fixed an issue with players saving to a journal entry

Fixing an issue where the styling of the editor got dropped.

Adding Recently Viewed to blank tab

Changed Quest merged Seen/Completed into one status. 

Adding color highlights to show what state a quest is in.

Added Objectives display when Notes tool is selected

Updated the styling to support Pathfinder

Fixed an issue with localization of attribute in the Encounter entry.

Embedded item links no longer open a blank page.

Added Maximize button.

# Version 1.0.6

Fixed an issue when creating a new slideshow, it was trying to access the currently active slide and since there wasn't one, it was causing an error.

Deleting a journal entry wasn't refreshing the page if it was open in the current tab.

If a DC was attempted to be added, but wasn't saved properly, the old DC was still there but causing errors.  I changed the code so that DCs aren't created the first time until the save button is pushed.

Dragging items onto the Quest entry wasn't working.

Journal Notes weren't cross linking to other notes.  Looks like the way the TextEditor was sending the information wasn't compatible with the Enhanced Journal.

Directory Searchign is fixed.

Also thank you to Riccisi for some amazing debug work.
