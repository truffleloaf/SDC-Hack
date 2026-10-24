# Résumé import

On **Start**, select **Choose résumé**, then review the proposed reference role, tasks and skills. You can change the role, choose different tasks, remove skill suggestions, inspect the extracted text, or discard everything. Applying suggestions is the first point at which profile state changes.

## What it does

- Reads PDF or DOCX files locally in the browser. No API key or Supabase connection is needed.
- Matches phrases and common aliases against Pivott's existing six roles, 31 tasks and 15 skills. Suggestions include source excerpts for review. This is local text matching, not an LLM assessment or an ATS score.
- Uses template time shares, rebalanced to the selected tasks. It does not infer working hours, skill proficiency or exposure from résumé wording.
- Adds confirmed skill IDs to the relevant-skills assessment. Newly suggested skills remain unrated; existing ratings, including explicit zero, are kept.
- Requires confirmation before replacing an existing reference role/task selection or resetting its active plan. Custom task records, saved routes, ratings and career preferences remain available. The isolated example profile cannot be imported into.
- Keeps the original manual setup available.

## Privacy and persistence

The file, filename, extracted text and evidence excerpts are not uploaded or persisted by this feature. The app discards extracted text when the review closes or the component unmounts. Parsing libraries and the PDF worker load as same-origin static assets when needed.

Only confirmed role/task IDs, the optional title entered by the user, and confirmed skill IDs enter the existing profile store. `resumeSkillIds` contains catalogue IDs only and defaults to an empty array for older profiles. With configured Supabase, these profile fields can be included in a later explicit **Save to account**; the résumé file and extracted text are never part of that upload. No database migration is required for this additional JSON profile field.

## Limits

Files must be 10 MB or smaller; PDFs may have at most 30 pages. Extracted text is limited to 100,000 characters, and DOCX main-document XML to 2 MiB. Old `.doc`, password-protected PDFs, unreadable/corrupt documents and files without sufficient text produce a retry/manual-setup message. The DOCX reader extracts main-body paragraphs, including table cells; headers, footers and images are not used.

Image scans need OCR before import. Multi-column layouts, unusual fonts, past roles and wording outside the small catalogue can produce incomplete or unsuitable matches. Users must review suggestions. There is no claim to verify employment history or proficiency, and no résumé content changes the scoring engine.

## Validation

`pnpm test` includes résumé matching, negation/word boundaries, unknown roles, file/archive limits, legacy account/device state and the confirmed-profile boundary. `pnpm build` checks the production bundle and TypeScript.

The optional `scripts/browser/resume-import.cjs` creates synthetic PDF/DOCX fixtures in memory and checks actual production-browser extraction, review/discard, confirmed suggestions, unrated skills, refresh, replacement cancellation, encrypted/empty/oversized/long files, mobile review and keyboard dismissal. It also checks that no external requests, résumé uploads or extracted-text persistence occurred. It uses the existing external Playwright helper, `PLAYWRIGHT_MODULE`, optional `CHROMIUM_MODULE`/`PIVOTT_CHROMIUM_EXECUTABLE`, and `PIVOTT_TEST_ORIGIN` (default `http://127.0.0.1:3007`). These are local headless checks, not exhaustive layout or physical-device testing.
