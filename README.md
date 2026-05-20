# DGAPI Course Finder

Standalone HTML, CSS and JavaScript course finder powered by DiscGolfAPI.

The finder loads live course data from DiscGolfAPI, supports configurable areas, GB and US-state presets, locality modes, pagination, optional course badges, weather forecasts, compact layouts, simple theming and visible DiscGolfAPI attribution.

## Quick Start

1. Serve this folder locally:

```sh
python3 -m http.server 8080
```

2. Open the demo:

```text
http://localhost:8080/
```

3. Open the configurator and choose the scope, locality, forecast length and visual options:

```text
http://localhost:8080/configurator.html
```

4. Copy the generated embed HTML into the target website.

5. Upload these files with the page, keeping the relative paths used by the embed:

```text
assets/course-finder.css
assets/course-finder.js
assets/course-badges.json
```

6. Keep the visible DiscGolfAPI attribution and linked logo in the footer.

For a manual embed, copy the full `.dgapi-course-finder` section from `index.html`, then include the CSS in the page `<head>` and the script before the closing `</body>` tag:

```html
<link rel="stylesheet" href="./assets/course-finder.css">
<script src="./assets/course-finder.js"></script>
```

## Files

- `index.html` contains the required markup.
- `configurator.html` generates copy/paste embed snippets.
- `assets/course-finder.css` contains the UI styling.
- `assets/course-finder.js` fetches and renders course data.
- `assets/course-badges.json` contains optional course badge data.

## Run Locally

Serve the folder over HTTP so browser `fetch()` can load the local JSON file:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

The configurator is available at:

```text
http://localhost:8080/configurator.html
```

Do not open `index.html` directly from the filesystem if you need course badges. Browsers commonly block `fetch()` calls to local JSON files from `file://` pages.

## Embed On Another Site

Copy the `section` from `index.html`, include the CSS, and load the JS:

```html
<link rel="stylesheet" href="./assets/course-finder.css">
<script src="./assets/course-finder.js"></script>
```

The API endpoint and UI behaviour can be configured through data attributes on `.dgapi-course-finder`:

```html
<section
  class="dgapi-course-finder"
  data-api-base-url="https://io.discgolfapi.com/v1/courses"
  data-preset="gb"
  data-area-default="england"
  data-page-size="15"
  data-forecast-days="7"
  data-badges-url="./assets/course-badges.json"
>
```

Supported attributes:

- `data-api-base-url`: DiscGolfAPI courses endpoint.
- `data-preset`: built-in area preset. Supported values are `gb`, `global`, `us-state` and `england`.
- `data-country`: ISO country code for custom scopes, for example `US`, `GB`, `AU`.
- `data-region`: region/state code for custom scopes. For US states, use values such as `OR`, `CA`, `TX`.
- `data-area-options`: JSON array of selectable areas. Each option needs `value`, `label` and `query`.
- `data-area-default`: initial selected area value.
- `data-default-query`: initial search query.
- `data-locality`: local place name to seed or restrict the finder.
- `data-locality-mode`: `nearby` allows user-location searches to show courses outside the locality; `restrict` always filters to the locality.
- `data-page-size`: number of courses per page. Use `0` or omit it to disable pagination.
- `data-forecast-days`: weather forecast length, from `0` to `7` days. Use `0` to hide Weather buttons.
- `data-badges-url`: JSON URL for site-owned course badges.
- `data-auto-nearby`: set to `true` to ask for browser location after courses load.
- `data-website-only`: set to `true` to show only courses with website links.
- `data-layout`: set to `compact` for tighter sidebar-style embeds.
- `data-theme-primary`, `data-theme-primary-strong`, `data-theme-accent`, `data-theme-surface`, `data-theme-surface-muted`, `data-theme-text`, `data-theme-heading`, `data-theme-border`: optional theme colours.

If both `data-area-options` and `data-preset` are present, `data-area-options` wins.

Remote `data-badges-url` files must be served with browser-readable CORS headers.

The weather layout automatically places forecast cards next to each other when space allows and wraps them onto new rows on narrower screens.

## Deployment Checklist

- Serve the page over `https://` if using browser location; geolocation requires a secure context on most browsers.
- Host `assets/course-finder.css`, `assets/course-finder.js` and any local badge JSON where the embed paths can reach them.
- If `data-badges-url` points at another domain, configure CORS on that JSON response.
- Keep the DiscGolfAPI footer attribution visible.
- Test the configured locality, preset and one weather panel before publishing.

## Embed Examples

GB finder:

```html
<section class="dgapi-course-finder" data-preset="gb" data-area-default="england" data-page-size="15"></section>
```

Global finder:

```html
<section class="dgapi-course-finder" data-preset="global" data-page-size="25"></section>
```

US state finder:

```html
<section class="dgapi-course-finder" data-preset="us-state" data-country="US" data-region="OR"></section>
```

Locality-first finder that can show nearby courses outside the locality after a location lookup:

```html
<section class="dgapi-course-finder" data-preset="gb" data-locality="Bristol" data-locality-mode="nearby"></section>
```

Locality-restricted finder:

```html
<section class="dgapi-course-finder" data-preset="gb" data-locality="Bristol" data-locality-mode="restrict"></section>
```

Compact themed finder:

```html
<section
  class="dgapi-course-finder"
  data-preset="us-state"
  data-country="US"
  data-region="OR"
  data-layout="compact"
  data-theme-primary="#0f766e"
></section>
```

The snippets above show only the `<section>` attributes. The full embed still needs the controls, result containers, footer, stylesheet and script shown in `index.html`. Use `configurator.html` to generate a complete snippet.

## Course Badges

Badges are matched by DiscGolfAPI course `id` or `slug`. Use whichever one is easier to maintain; each course can show multiple badges:

```json
{
  "id": "crs_box_end_park_disc_golf",
  "badges": [
    { "label": "Course Badge Partner" },
    { "label": "2026 Member Course", "url": "/membership/membership-course-card/" }
  ]
}
```

If an individual badge omits `url`, the top-level `badge_url` is used. If an entry omits `badges`, the top-level `badge_label` and `badge_url` are used.

`assets/course-finder.js` also contains a fallback copy of the badge data. This means matching badges still appear if the embedded page cannot fetch `assets/course-badges.json`. Keep the fallback in sync when changing the bundled badge list, or use `data-badges-url` to point the embed at a site-owned JSON file.

## Attribution

The visible DiscGolfAPI attribution must remain in the footer. The footer includes a linked DiscGolfAPI logo:

```html
<a class="cf-footer-brand" href="https://discgolfapi.com/" target="_blank" rel="noopener">
  <img src="https://public.discgolfapi.com/images/dgapiLogo.png" alt="DiscGolfAPI logo">
  <span>Course data supplied by DiscGolfAPI.</span>
</a>
```

The `source_url` value in `assets/course-badges.json` must remain `https://discgolfapi.com/`.

## Verification

Useful checks before publishing:

```sh
node --check assets/course-finder.js
python3 -m http.server 8080
```

Then open `http://localhost:8080/`, search for “Box End Park Disc Golf”, and confirm it shows two badges.
