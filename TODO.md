This is an ordered list of features to implement along with a simple sub-bullet showing the implementation status of each. As an agent, you should plan and implement the first feature in this ordered list that has a status of "not done". Upon immplementation being complete, update the status to "done".

* I would like to differentiate between guests and users. Guests will not be individual users. They will always login using a party code to RSVP. Please change this so that adding a Guest does not make a new User with a username and password. Effectively, there are three types of "users" to the backend auth now. 1. "admin" that can view the admin dashboard and edit the site. 2. "viewer" that can view the site and not rsvp. 3. "party" that can RSVP for party members in their own party. Each Party code login is essentially a User with the party code as the user ID and password. There will have to be a new "Users" portion of the admin dashboard that shows all the users and manages them, separte from the current "Guests" portion of the admin dashboard.
  * status: done

* Now that the "Guests" are disambiguated from "Users", we can combine the "Guests" and "Parties" section of the admin dashboard. When creating a Guest, they MUST be added to a Party. There will be a party field that must be filled out. There will be a dropdown with a search function to select the party, as well as a "create new party" option that defaults to the guest's last name. This way Guests and Parties are linked much more closely. The guest list section (presenting the admin with the added Guests) should become more of a table-like view that can be ordered by guest name or ordered by party name. The guest list section should be searchable by name and searchable by party to make it easy to find people. The party field of each Guest should be editable using the same dropdown with a search function and "create new party" option, and if there are no Guests in a Party then the Party should be deleted.
  * status: done

* for every admin dashboard section with an "add a xyz" function and a list of the things that were added (e.g. the Guests section and the Lodging section), please put the "add a xyz" at the top and the list below. Also make the list collapsable and the "add a xyz" portion collapsable. This way with long lists, the information can be hidden or viewed more easily. Also make sure these pages use consistent styling (for example, right now the Parties section does additions differently than the others. there should be coherent design)
  * status: done

* On the RSVP page, the option to select the RSVP options should be to the right of each Guest's name in the party, not below. This is more tidy and clean, so the style is essentially split into two columns with the left being each Guest name and the right being their input options. Plus-one presence should be selected as a yes/no option that then unlocks the plus-one name entry. The input options in the right side column should be stacked horizontally.
  * status: done

* On the admin dashboard "RSVP" section I would like a more table-like view that shows all Guests and their RSVP status such that I can sort by RSVP status (yes, no, no response)
  * status: done

* On the home page I would like another row of text for showing a "T-XYZ" time countdown to the Wedding day, accurate to the Wedding Date and time (time needs to be added) input on the admin dashboard. Once the date has passed, the timer countdown should be replaced with a "T+XYZ" value showing how long we have been maried for
  * status: done

* Make sure there is NO dead code or dead API endpoints left in from the above changes (or any prior changes) just for the sake of "backwards compatibility". There is NO backwards compatibility. The code should be clean, precise, and not contain dead API endpoints or dead code!
  * status: done

* Please fix the countdown timer. I entered a date and time as admin and it still shows NaN values for all the times. Also, when accessing the site and logging in as a party, the first page they see (after login) should be the /home page!
  * status: done

* The party users showing up in the admin dashboard User section is confusing and the modification and deletion of these users seems to be poorly handled. Please investigate this and come up with some redesigns or fixes to how this works. Currently, if I try to change the password or username for one of the party users through this dashboard it does nothing (this should change their party code used to login). Also if I delete a party user from that menu currently none of the guests are affected that are part of that party. If a party is deleted (The Party or the Party User) then the Guests should be removed as well.
  * status: done

* In the admin dashboard, please add a section to view recent logins so I can see which user (party) is viewing the website lately! Also track total page views per user and keep a running total next to the latest login time. This could be presented in a table that is sortable by most/least views and most recent/oldest login. Please determine if this best belongs under the Users section of the admin dashboard or somewhere else (maybe under the recent RSVPs section).
  * status: done

* Please add a "copy to clipboard" button with a nice clipboard icon next to the party code on the parties section of the admin dashboard
  * status: done

* When building I get the following warning, please address it:
```
=> => # npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant na
 => => # tive addon; alternatives are available.
```
  * status: done

* Please investigate using Drizzle ORM for the database abstraction. Will this help with potential inconsistencies or anything? What benefits would it bring?
  * status: done

* Please make sure the media functionality in the admin dashboard will work with locally hosted files (in the data/media directory somewhere, mounted into the container). I particularly want to make sure the URL parsing doesn't invalidate local paths or something like this. Make sure documentation is very clear about supporting local media mounted this way in addition to URLs.
 * status: done

* I need you to make sure the background image and video media browsing and url selection in every admin dashboard section (media, dress code, site config, etc.) are all consistent. I at least found that the site config section does not allow for browsing or uploading, and the dress code section does not allow for uploading, both of which need to be fixed. Also, when I try to upload a file using the "upload" option (which uses the client's local filesystem to send a file to the host) it doesn't work and says the upload failed. please make sure the image is sent to the proper /app/data/media directory with the correct permissions, and that there are reasonable filesize limits and proper warnings about filesize if that is the issue I am facing. It says the upload failed, but then when I click the "local" button the image does show up. The problem is also that when I try to click one of the options presented in the local button, nothing works when I click one of the images.
  * status: done

* Now instead of viewing each full image (or piece of media) in the browse button on the media selection portions of the admin dashboard, the logical option is to present a file explorer just so I can select the proper file names. This way we save a lot of rendering cost of sending the client all of these images to view. It also should allow for proper sub-directory navigation (e.g. I will probably place images in things like /app/data/media/full and /app/data/media/thumbnails). Please include your own assessment of if this design decision makes sense and if it will drastically improve performance when the media directory may have hundreds of hi-res images and some videos.
  * status: done

* Now the media page and the admin dashboard functionality for the media page need to be updated. The media page should group photos by tabs, just like the Guide page uses tabs. Use the same styling. The catch is the tabs need to be configured from the admin dashboard, and then media can be added to each tab. tabs can be edited or removed, and provide a warning like the party removal warning that when removing a media tab, the media will be removed as well (not from the local storage or anything, just from the website). Each media item in the admin dashboard should also have the ability to have its title edited.
  * status: done

* There is another problem. The media items section on the media admin dashboard does not show empty tabs if present, and the "rename" button is inconsistent with the rest of the style. Please make sure to show all tabs even if empty. Also make the "rename" button an "edit" button and please make it next to the delete button. Also the delete button should just say "delete" not "delete tab". Another thing is to make sure the title is displayed on the image in the media gallery when the image is clicked on as well.
  * status: done

* Now media items are going to be very expensive to render in grid views and list views in the admin dashboard and the dress code mood board and the media page. The solution should be auto-generating thumbnails. Currently the media admin page has an option to upload a thumbnail, but I would instead like the backend to generate a thumbnail and store it under the media_dir in something like a thumbnails subdirectory. This should help a lot with loading pages.
  * status: done

* Now the lodging options image uploading is not consistent with all the other image uploading and browsing options! Please make this consistent with the others and use common code if possible. Also, make sure the loding options can be edited and reordered from the Lodging admin dashboard section
  * status: done

* Now I would like to be able to reorder the media items within each tab, and reorder the tabs. Please update the media admin dashboard section to allow for this
  * status: done

* The admin dashboard for the dress code mood board images needs the ability to reorder the images in the moodboard. Copy the exact implementation used by the media admin dashboard and the loding admin dashboard reordering styles. Also, I cannot view the images in the dress code mood board when I click on them. I want them to pop up and load just like they do in the media page. Make sure to reuse code here if possible and pragmatic. There is no reason why one media viewer is broken while another seems to be working very well.
  * status: done

* The horizontal spacing on the RSVP page flows off the page on mobile devices. Please fix this, if needed the user options can go vertical instead of horizontal.
  * status: done

* Please load the first frame from the home page video and use that as the background while the video loads. Alternatively, please lazily load the video and serve it in chunks. That will be the smoothest operation. The video is already 1080p. It could be turned into a GIF? would that help? I'm looking for options.
  * status: done

* Investigate if there is a max concurrent user load on the site. explain the reate limiting we have implemented before. Analyze any bottlenecks or issues with the website serving a moderate ~100 amount of concurrent users. I'm hosting the websit on my own home internet which has about 20 Mbps and I'm on the cloudflare free plan for the tunneling/routing. Also make sure to check the code itself to see if there are some issues with concurrent users.
  * status: done

* Please make the "admin" and "logout" links below the pill a bit more visible, maybe have a slighly transparent backround for contrast like a mini pill. This will help with visibility over the video.
  * status: done

* Make the parties section of the admin dashboard searchable. I want to easily be able to find codes!
  * status: not done

* In the admin dashboard I need a good way of tracking "plus ones" as part of the total guest count. I want to factor them into a total invited count as well as if the plus ones were declined or accepted. This wil help me get better visibility into the actual total number of invites and attendees.
  * status: not done
