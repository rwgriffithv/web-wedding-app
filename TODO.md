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
  * status: done

* In the admin dashboard I need a good way of tracking "plus ones" as part of the total guest count. I want to factor them into a total invited count as well as if the plus ones were declined or accepted. This wil help me get better visibility into the actual total number of invites and attendees.
  * status: done

* Please update the RSVP page of the website to add to the text instructions specifying that submissions may be changed up until <configurable-date>, and that RSVPs will be locked and not accepted after that date. The configurable date should be configurable in the RSVP section of the admin dashboard.
  * status: done

* Please re-examine latency and bottleneck concerns, focusing on serving the home page video and ffmpeg calls in general. If one user logs in and is waiting for the video to be served will other users be unable to login or view the website at all? Is this application single-threaded and unable to serve multiple users at once like that?
  * status: done

* The site config section of the admin dashboard has inconsistent sub-section styling. I like that you added subsections for the RSVP settings, and the rate limiting settings. You should improve coherence by making a home page subsection (grouping the relevant fields) and change the Rate limiting subsection to a Login subsection that includes the landing page configuration fields. The order should be Login, Home Page, and then RSVP.
  * status: done

* Please fix the display of the home page video poster on mobile. It looks perfect on desktop browsers but on my phone (chrome) the poster is zoomed in when displayed, leading to a jarring and bad transition to the video. Please fix this and explain how this happened.
  * status: done

* Please make the grouped media displays (the mood board on the dress code tab of the guide page as well as the media page) more grid-based instead of cards like you currently have it. It looks good on desktop browsers but on mobile the cards are too big and fill the whole horizontal width.
  * status: done

* Now please add a new feature to the Party section of the admin dashboard for admins to click a checkbox and mark each party as "invited" so admins can keep track of each person they have messaged or sent the website link and code to (manually). Please warn me if this causes a breaking change to the database. Provision for easy migration. It could be a new table in the databse if that works well. If possible, update the party view such that parties can be sorted and ordered by party name and "invited" status. This lets the admins manage parties much more easily. This mechanism hopefully is similar to the design of the Guests table.
  * status: done

* Please add an option in the Guests admin dashboard to make a guest as unexpected. The default is that each guest is NOT marked unexpected. Please make the databse migration easy, and manual with a dedicated script under ./scripts. Then please update the main admin dashboard counters to to show values in three rows (styled cleanly, however you see fit). Each row of counts should show [guests, plus ones, total]. "total" is the sum of the guest count and the plus one count. Then the three row titles sould be "invited, expected, confirmed". "invited" will be all guests and plus ones regardless of status. "expected" guests will be guests who are not marked as unexpected and who have NOT RSVP'd no. "expected" plus ones will be the plus ones provided to "expected" guests, unless the plus one is RSVP'd already as no. (a plus one is expected to have come if the "expected" guest has not RSVP'd yet and has a plus one, RSVP'd yes for themselves and their plus one both as yes). Make sure the migration script is idempotent (as well as the other migration scripts in the scripts directory).
  * status: done

* Now I would like to add a "Help/Questions" page. This should be in the lower right hand of the website as a question mark button with a "help" label. This will load a /help page with two tabs: [FAQ, My Party's Questions]. The FAQ section will list FAQ questions and answers (labeled with stylized "Q" and "A") that the admin enters as "FAQ items" in the new "Help" section of the admin dashboard. The "My Party's Quesions" tab will have a list of questions made by that party (logged in) and answered by the administrator using the same components as the FAQ "Q" and "A" elements (if possible), as well as a form (at the top of the page) for asking a new question. The questions will be ordered top to bottom, most recent first. The admin dashboarad "Help" section will need a way to search and sort and view the questions made by each Party and submit answers to their questions. A sortable and filter-able feature there should be the number of total questions and number of unanswered questions. The filter that is useful would be having any unanswered questions. A very important part of the text input here is sanitization! Do not let users inject arbitrary sql commands or any malicious text or data. The sanitization must be industry standard. profane words are allowed, just make sure the text is clean for the software to parse. Make sure the code is well structure, consistent, and coherent. It will be audited. Make sure it reuses and follows style with the rest of the codebase (especially the admin dashboard pieces) as well. The Help page should have similar stylling to the rest of the website (font, spacing, etc.). Please make database edits clean and if migration is needed provide an idempotent script in ./scripts. Make sure to updatae unit tests and e2e tests (fixes and additions) as necessary. If the user is not a "party" user, make sure there is text that renders under the "My Party's Questions" tab that shows it is only available if you login with a party code (just like the RSVP page shows).
  * status: done

* There seems to be some instability with the radio buttons when RSVP'ing. When a user clicks submit, the radio buttons revert to their previous state (before submitting). The request goes to the backend properly and the radio buttons display properly after refreshing, but this is confusing. Please fix this. Also, I fear some changes have made the page unusable for IOS users again. Please thoroughly assess this and fix it if needed. IOS and safari continues to be an issue. Make sure there is no weird redirection or errors there, as well as proper formatting and radio button behavior (without degrading chrome, android, and desktop functionality). There will a be thorough audit of this feature, please make sure you follow best practices and are consistent and coherent with other code, style, and device compaibility.
  * status: done

* Please fix the ordering of sections in the admin dashboard sidebar. "Schedule" should come after "Parties" and "Lodging" should come after "dress code". Also please add a new tab to the Guide page at the end called "Gifts". Give it a configurable text field just like the other tabs. There should be a gifts admin dashboard page after the other guide-related admin dashboard sections (Lodging should be before it). Make sure it uses the same configurable text area component.
  * status: done

* Please add a new section/row to the admin dashboard main section below the invited/expected/etc counts called "help questions". There is a number for "answered" and then "unanswered". The styling should be similar to that of the invited/expected/etc section but distinct. The unanswered count background should be a warning color to grab attention if it is more than 0.
  * status: done

* Please fix this persistent issue that has plagued some users. I cannot figure out why they have issues, but they log in successfully with a party code, click the RSVP page from the pill, and then are booted back out to the login page. I can't figure it out, I desperately need your help, this subset of users cannot RSVP! Here are the console logs from one of these users:
```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 close listeners added. Use emitter.setMaxListeners() to increase limit
n	@	contentscript.js:14083
contentscript.js:14083 MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 end listeners added. Use emitter.setMaxListeners() to increase limit
n	@	contentscript.js:14083
2
contentscript.js:14083 ObjectMultiplex - orphaned data for stream "app-init-liveness"
warn	@	contentscript.js:14083
2
contentscript.js:14083 ObjectMultiplex - orphaned data for stream "background-liveness"
warn	@	contentscript.js:14083
login:1 Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/v4513226…' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked.
content-script.js:22 Document already loaded, running initialization immediately
content-script.js:4 Attempting to initialize AdUnit
content-script.js:6 AdUnit initialized successfully
favicon.ico:1 
 Failed to load resource: the server responded with a status of 404 ()
feature_collector.js:23 using deprecated parameters for the initialization function; pass a single object instead
N	@	feature_collector.js:23
```
Please help!
  * status: done

* Now add a new field to the site config of the admin dashboard for an optional banner text that displays overlayed ontop of the home page (it could be every page other than login and admin if you prefer that). The banner will have a transparent background, and if the text is too long for the width of the screen (to fit on one line) it will slowly scroll the text horizontally as an automatic animation. The banner background should be a slightly attention grabbing color, though transparent. orange may work or something like it. Put an exclamation point at each edge of the banner that doesn't scroll as well.
  * status: done

* The admin dashboard does not seem to render very well on mobile. Some things are misaligned, it is no longer long enough to show all the items, the flow is too wide on the page and result in scrolling, and the hamburger menu dropdown results in a weird vertical scrolling that is more like a collapsible element than a real hamburger menu. Please review the design of the mobile rendering of the admin dashboard and see if there are alternative implementations of the hamburger menu as well as making horizontal scrolling of the tables more coherent and better looking.
  * status: done

* Is there a way to add IP banning as an option to the admin dashboard with detection for multiple login failures where it tracks how many times an IP has tried to login and failed by getting rate limitted? I would like some trackign like that in a "Security" section of the admin dashboard and then on the main dashboard section add a warning status with a counter for the number of suspicious IPs detected and not banned. I would also want a counter for the total number of IPs banned. It would be similar counter and warning system to the questionsi answered and questions unanswered system.
  * status: done

* Ok so the suspicous IPs portion of the admin dashboard doesn't quite work as intended, since it currently is redundant or meaningless with the autoban functionality (which is great). please compute suspicious IPs instead as IPs that have hit rate limit violations a certain number of times, regardless of window (and are not banned). That value should be configurable in the Security page. Also swap the order of banned ips and suspicoius IPs in the admin main dashboard. Then, in the security tab keep a table of suspicious IPs that can be sorted by total violations or time of last violation. Add a "clear" button or "ban" button to those suspicious IPs in the table.
  * status: done

* We have just done a massive massive ton of auth work in the last few commits. One primary thing you will notice is highly improved hot vs cold path handling. I want you to investigate the hot vs cold path handling for rate limiting in the web app now. I want you to generate a report about how localstorage is used at the client, how the new nextjs proxy (src/proxy.ts) could be used, and the current server hot (if it exists) and server cold (DB access) paths work. Please generate a report/audit and a plan to make improvements to bring it up to the quality of the auth system arhitecture.
  * status: done

* The auth work we did recently was fantastic! Something we overlooked though was the redundancy of requireAdminSessionOrNull(). That function should just be requireSession({type = "admin"}) or something like requireSession("admin"). The requireSession function should have an optional argument for a session/user type that it checks if passed. This will clean up a lot of code smell. Be very careful to update unit and e2e tests as needed, code comments and actual documentation thoroughly.
  * status: done

* The Users list in the admin dashboard Users page needs to be searchable by User name and type. Please implement this. The System Accounts list on that page should also be searchable but just by user. The user activity table should also be searchable by party name.
  * status: not done

* Now the Rate Limit Violations table and the Suspicous IPs and the Banned IPs tables in the Security portion of the admin dashboard need work. These should be combined (!) into one table. It will rows with the following columns (in order): IP, an editable "yes/no" "Banned" field, a "yes/no" "Suspicious" field, a total rate limit violations field, and a last violation timestamp field. The final column will be the standard edit and delete action buttons under the actions column. See how the Guests and Parties table do this in the admin dashboard. The table should be sortable by every column except for the IP address and the actions column. The only editable field is "banned" which is how the admin can unban someone. This combined table will be the ONLY table in the admin security page, and it will be below the Ban IP section.
  * status: not done
