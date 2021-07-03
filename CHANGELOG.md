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
