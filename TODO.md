This is an ordered list of features to implement along with a simple sub-bullet showing the implementation status of each. As an agent, you should plan and implement the first feature in this ordered list that has a status of "not done". Upon immplementation being complete, update the status to "done". Be sure to be very careful and thorough in your implementation and create and update unit and e2e tests as needed. Keep code and UI style consistent and logically coherent. Use `npm run test` to check all tests pass.

* Please make the media addition actions in the dress code admin dashboard be able to handle multiple selections when uploading. This would streamline the process a lot. Since this is a common component, just add a flag for allowing multi-upload that is default to false (if possible). If you need a new component and that is cleaner then do that instead. There is freedom here, but the UI should look reasonably similar and still allow for uploading (multiple) files or using local files as well. Up to you if you think the local files can/should be multi-selectable as well. This works ONLY for the mood board because the mood board does not have titles and configuration for each photo, it is just the picture in a collage essentially.
  * status: done

* We have just made a ton of changes as part of a large audit of the project. The audit report and status is here: docs/tmp/2026-07-18-audit-report.md. Please run another thorough audit of these changes and identify any issues with consistency, style, logic correctness, and structure. Be careful and do not identify false issues, otherwise this audit-of-audit cycle continues forever.
  * status: done

* Please standardize how getConfig() is used and where and when database reads are done manually or through that function to get values set in the database through the admin dashboard settings and configuration tools. We added a lot of settings for security that I'm not sure are tracked in the site config properly. Same for many other things like rate limiting for example.
  * status: done

* Please thoroughly audit the media max filesize functionality added previously. I'm not very confident about it's style and logical consistency. Do a very heavy audit and let me know what you think of that feature and the code around it. Make sure the localstorage is set properly (and set at all...)
  * status: done

* Please standardize how `revalidatePath` is used in the codebase and make sure there is a proper principled approach to how cache is invalidated alongside our auth, rate limiting, etc. features that all use a [client, proxy, hot-server, cold-server] hierarchy. Assess the current state of cache assumptions in the code and docs makes sense or if it needs to be updated to be more principled and consistent. Be thorough! Use internet research for appropriate standards and principles if needed.
  * status: done

* Sometimes when I click on a page (/guide or maybe one of the tabs, or just at random) on mobile the scrolling is locked out and I have to refresh the page. Do you know what could cause that? Is it some kind of race condition or weird timing thing or known issue with nextjs? Is it actually a but in the application code? Please help figure this out! I think it most reliably happens when I'm logged in as an admin and on the admin dashboard pages and then go "back to site" and click the Guide and go to the dress code page or lodging page with enough items to need to scroll.
  * status: done

* Add rate limiting to media serving endpoints (`GET /api/media/[...path]` and `GET /api/media/list`). Must be configurable like existing rate limiting (see `src/lib/rate-limit.ts`, `src/lib/rate-limit-form/`). Follow the same patterns as login/RSVP rate limiting: in-memory limiter for enforcement, client cookies for UX cooldown display, `getRateLimitConfig()` for DB-stored settings. Add unit + E2E tests. Reference the existing rate limiting architecture in `docs/architecture/overview.md` and `docs/features/ip-banning.md`.
  * status: not done

* Please make adjusments to the "invited" state tracking for Guests. If a guest from a party has RSVP'd, that party should automatically be marked as "invited". This covers the case where the admin has forgot to manually mark a party as invited after they send the invite.
  * status: not done

* On the guests table of the guests page of the admin dashboard, please make the "+1" and "unexpected" columns both filterable and sortable. Reference the implementation of the RSVP table in the RSVP page of the admin dashboard for consistent styling and code reuse (if possible) as well as e2e and unit tests. Also, since it is a similar request and code change, make The parties table of the Parties page of the admin dashboard filterable by the invited column. Thank you!
  * status: not done

* When clearing an IP of its violations in the admin dashboard security page, I notice i I login again with that IP I get rate-limited and forbidden from logging in (for a window) even if logging in with a correct password. Is the IP clearing functionality of the admin dashboard secuirty page handling all that it needs to in order to clear violation history for an IP? It seems like it isn't. On the client I am clearing browsing history and cookies and localstorage. And I see the IP show up again with a violation count of "1" immediataely after I try to login (with a good party code).
  * status: not done
