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
  data-temperature-unit="c"
  data-wind-speed-unit="mph"
  data-badges-url="./assets/course-badges.json"
>
```

Supported attributes:

- `data-api-base-url`: DiscGolfAPI courses endpoint.
- `data-preset`: built-in area preset. Supported values are `gb`, `england`, `scotland`, `wales`, `global` and `us-state`.
- `data-country`: ISO 3166-1 alpha-2 country code for custom scopes, for example `US`, `GB`, `AU`, `CA`, `FI`, `SE`, `EE`.
- `data-region`: country-specific region, state or subdivision code. For US states, use values such as `OR`, `CA`, `TX`. For GB nation-level filters, use the built-in `england`, `scotland` or `wales` presets unless you are providing a custom `data-area-options` setup.
- `data-area-options`: JSON array of selectable areas. Each option needs `value`, `label` and `query`. It can also include `filterRegion` to client-filter the loaded API results by normalized region name, for example `Scotland` or `Wales`.
- `data-area-default`: initial selected area value.
- `data-default-query`: initial search query.
- `data-locality`: local place name to seed or restrict the finder.
- `data-locality-mode`: `nearby` allows user-location searches to show courses outside the locality; `restrict` always filters to the locality.
- `data-page-size`: number of courses per page. Use `0` or omit it to disable pagination.
- `data-forecast-days`: weather forecast length, from `0` to `7` days. Use `0` to hide Weather buttons.
- `data-temperature-unit`: weather temperature unit. Use `c` for Celsius or `f` for Fahrenheit.
- `data-wind-speed-unit`: weather wind unit. Use `mph` for miles per hour or `kph` for kilometres per hour.
- `data-badges-url`: JSON URL for site-owned course badges.
- `data-auto-nearby`: set to `true` to ask for browser location after courses load.
- `data-website-only`: set to `true` to show only courses with website links.
- `data-layout`: set to `compact` for tighter sidebar-style embeds.
- `data-theme-primary`, `data-theme-primary-strong`, `data-theme-accent`, `data-theme-surface`, `data-theme-surface-muted`, `data-theme-text`, `data-theme-heading`, `data-theme-border`: optional theme colours.

If both `data-area-options` and `data-preset` are present, `data-area-options` wins.

Remote `data-badges-url` files must be served with browser-readable CORS headers.

The weather layout automatically places forecast cards next to each other when space allows and wraps them onto new rows on narrower screens.

## Country And Region Codes

`data-country` uses two-letter ISO 3166-1 alpha-2 country codes. Common examples:

| Country | Code |
| --- | --- |
| Great Britain / United Kingdom | `GB` |
| United States | `US` |
| Canada | `CA` |
| Australia | `AU` |
| Finland | `FI` |
| Sweden | `SE` |
| Estonia | `EE` |

Reference: [ISO 3166 country codes](https://www.iso.org/iso-3166-country-codes.html).

`data-region` is country-specific. It usually represents a subdivision within the selected country, similar to ISO 3166-2 subdivision codes, but the exact values depend on what DiscGolfAPI currently stores for that country.

Useful examples:

| Country | Region Type | Examples |
| --- | --- | --- |
| `US` | State code | `OR`, `CA`, `TX`, `NC` |
| `GB` | Nation code | `ENG`, `WLS`, `SCT` |

Reference: [ISO 3166-2 subdivision codes](https://www.iso.org/standard/72483.html).

For most embeds, prefer the configurator or built-in presets rather than hand-writing region codes. Region codes are not globally interchangeable: `CA` means California when `data-country="US"`, but Canada when used as a country code. For GB, `england`, `scotland` and `wales` presets are safer than direct region queries because some GB records are inferred client-side from locality and coordinates.

For countries not listed above, start with a country-only embed:

```html
<section class="dgapi-course-finder" data-country="FI" data-page-size="20"></section>
```

Then add a region only after confirming the relevant DiscGolfAPI `region_code` values for that country.

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

Scotland finder:

```html
<section class="dgapi-course-finder" data-preset="scotland" data-page-size="15"></section>
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
