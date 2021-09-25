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
