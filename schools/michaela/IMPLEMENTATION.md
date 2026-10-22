# Michaela audit integration

Release 2.27.0 / research edition 3.0.0 connects all 17 audit items. See implementation-status.json for the component map. The inactive controller is removed; the existing card link opens the integrated pages. Original staff records and all root historical school data are retained.

Local fixture checks rendered 13 pages at desktop, tablet and mobile widths with no script errors or page-level overflow. Staff search is within the first screen; actual network navigation is blocked in the development container. These fixture checks are NOT a substitute for CI navigation. The release runs unit tests, shared safeguards and 60 dedicated page/task checks; dedicated checks repeat on the live deployment.

Only the exact release's final Actions run establishes publication success. Unavailable timetable, subgroup outcomes, future policy and historical employment details remain explicit research gaps, not software placeholders.
