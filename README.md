# DGAPI Course Finder

Standalone HTML, CSS and JavaScript course finder powered by DiscGolfAPI.

## Files

- `index.html` contains the required markup.
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

## Embed On Another Site

Copy the `section` from `index.html`, include the CSS, and load the JS:

```html
<link rel="stylesheet" href="./assets/course-finder.css">
<script src="./assets/course-finder.js"></script>
```

The API endpoint can be configured through a data attribute on `.dgapi-course-finder`:

```html
<section
  class="dgapi-course-finder"
  data-api-base-url="https://io.discgolfapi.com/v1/courses"
>
```

## Course Badges

Badges are matched by DiscGolfAPI course `id` or `slug`. Use whichever one is easier to maintain; each course can show multiple badges:

```json
{
  "id": "crs_quarry_park_disc_golf",
  "badges": [
    { "label": "Course Badge Partner" },
    { "label": "2026 Member Course", "url": "/membership/membership-course-card/" }
  ]
}
```

The `source_url` value in `assets/course-badges.json` must remain `https://discgolfapi.com/`.
