(function () {
  const SCRIPT_URL = document.currentScript && document.currentScript.src;

  function initDgapiCourseFinder() {
    const finderEl = document.querySelector(".dgapi-course-finder");
    const API_BASE_URL = (finderEl && finderEl.dataset.apiBaseUrl) || "https://io.discgolfapi.com/v1/courses";
    const COURSE_BADGES_URL = (finderEl && tidyDataset(finderEl.dataset.badgesUrl)) || (SCRIPT_URL
      ? new URL("course-badges.json", SCRIPT_URL).href
      : "./assets/course-badges.json");
    const DGAPI_SOURCE_URL = "https://discgolfapi.com/";
    const FALLBACK_COURSE_BADGES = {
      source_url: DGAPI_SOURCE_URL,
      badge_label: "Course Badge Partner",
      badge_url: "/membership/membership-course-card/",
      courses: [
        {
          id: "crs_box_end_park_disc_golf",
          badges: [
            { label: "Course Badge Partner" },
            { label: "2026 Member Course", url: "/membership/membership-course-card/" }
          ]
        },
        { id: "crs_cotswold_view", badges: [{ label: "Course Badge Partner" }] },
        { id: "crs_cricklade_house_hotel", badges: [{ label: "Course Badge Partner" }] },
        { id: "crs_gilly_s", badges: [{ label: "Course Badge Partner" }] },
        { slug: "hindleap-warren-disc-golf", badges: [{ label: "Course Badge Partner" }] },
        { slug: "mendip-activity-centre-disc-golf", badges: [{ label: "Course Badge Partner" }] },
        { id: "crs_quarry_park_disc_golf", badges: [{ label: "Course Badge Partner" }] },
        { slug: "the-national-disc-golf-course", badges: [{ label: "Course Badge Partner" }] }
      ]
    };

    function parseIntInRange(value, min, max, defaultValue) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < min || number > max) {
        return defaultValue;
      }
      return Math.round(number);
    }

    function parseAreaOptions(value) {
      if (!value) {
        return null;
      }

      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(option => ({
            value: String(option.value || "").trim(),
            label: String(option.label || option.value || "").trim(),
            query: String(option.query || "").trim()
          })).filter(option => option.value && option.label);
        }
      } catch (error) {
        return value.split("|").map(pair => {
          const [valuePart, labelPart] = String(pair || "").split(":");
          return {
            value: String(valuePart || "").trim(),
            label: String(labelPart || valuePart || "").trim(),
            query: ""
          };
        }).filter(option => option.value && option.label);
      }

      return null;
    }

    function tidyDataset(value) {
      return String(value || "").trim();
    }

    function isEnabled(value) {
      return /^(1|true|yes|on)$/i.test(tidyDataset(value));
    }

    function buildQuery(params) {
      return Object.entries(params)
        .filter(([, value]) => tidyDataset(value))
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(tidyDataset(value))}`)
        .join("&");
    }

    function buildAreaOptions() {
      const configured = parseAreaOptions(finderEl && finderEl.dataset.areaOptions);
      if (configured) {
        return configured;
      }

      const preset = tidyDataset(finderEl && finderEl.dataset.preset).toLowerCase();
      const country = tidyDataset(finderEl && finderEl.dataset.country).toUpperCase();
      const region = tidyDataset((finderEl && (finderEl.dataset.region || finderEl.dataset.state)) || "").toUpperCase();
      const limit = parseIntInRange(finderEl && finderEl.dataset.limit, 1, 1000, 500);

      if (preset === "global" || country === "GLOBAL") {
        return [{ value: "global", label: "Global", query: buildQuery({ limit }) }];
      }

      if (preset === "england") {
        return [{ value: "england", label: "England", query: "country=GB&region=ENG&limit=200" }];
      }

      if (preset === "gb" || country === "GB") {
        return [
          { value: "england", label: "England", query: "country=GB&region=ENG&limit=200" },
          { value: "gb", label: "England, Wales & Scotland", query: "country=GB&limit=500" }
        ];
      }

      if (preset === "us-state" || (country === "US" && region)) {
        return [{ value: `us-${region.toLowerCase()}`, label: `US ${region}`, query: buildQuery({ country: "US", region, limit }) }];
      }

      if (country) {
        return [{ value: country.toLowerCase(), label: region ? `${country} ${region}` : country, query: buildQuery({ country, region, limit }) }];
      }

      return [
        { value: "england", label: "England", query: "country=GB&region=ENG&limit=200" },
        { value: "gb", label: "England, Wales & Scotland", query: "country=GB&limit=500" }
      ];
    }

    function applyThemeOptions() {
      if (!finderEl) {
        return;
      }

      const themeValues = {
        "--primary": finderEl.dataset.themePrimary,
        "--primary-strong": finderEl.dataset.themePrimaryStrong,
        "--accent": finderEl.dataset.themeAccent,
        "--surface": finderEl.dataset.themeSurface,
        "--surface-muted": finderEl.dataset.themeSurfaceMuted,
        "--text": finderEl.dataset.themeText,
        "--heading": finderEl.dataset.themeHeading,
        "--border": finderEl.dataset.themeBorder
      };

      Object.entries(themeValues).forEach(([property, value]) => {
        const clean = tidyDataset(value);
        if (clean) {
          finderEl.style.setProperty(property, clean);
        }
      });
    }

    function toIdentifiers(value) {
      if (Array.isArray(value)) {
        return value;
      }
      if (value == null) {
        return [];
      }
      return String(value).split(",").map(item => item.trim()).filter(Boolean);
    }

    function itemIdentifiers(item) {
      return []
        .concat(toIdentifiers(item.id))
        .concat(toIdentifiers(item.ids))
        .concat(toIdentifiers(item.slug))
        .concat(toIdentifiers(item.slugs))
        .map(normaliseIdentifier)
        .filter(Boolean);
    }

    function findAreaOption(value) {
      return areaOptions.find(option => option.value === value) || areaOptions[0];
    }

    let courses = [];
    let courseBadges = FALLBACK_COURSE_BADGES;
    let query = "";
    let sort = "name";
    let areaMode = "england";
    let userLocation = null;
    let locationSearchKey = "";
    let postcodeTimer = null;
    let lastPostcodeLookup = "";
    let lastPlaceLookup = "";
    let openWeatherCourseId = "";
    let currentPage = 1;

    const areaOptions = buildAreaOptions();
    const defaultAreaMode = (finderEl && String(finderEl.dataset.areaDefault || "").trim()) || areaOptions[0].value;
    areaMode = defaultAreaMode;
    const pageSize = parseIntInRange(finderEl && finderEl.dataset.pageSize, 1, 100, 0);
    const forecastDays = parseIntInRange(finderEl && finderEl.dataset.forecastDays, 0, 7, 2);
    const temperatureUnit = tidyDataset(finderEl && finderEl.dataset.temperatureUnit).toLowerCase() === "f" ? "fahrenheit" : "celsius";
    const temperatureLabel = temperatureUnit === "fahrenheit" ? "degrees Fahrenheit" : "degrees Celsius";
    const temperatureSymbol = temperatureUnit === "fahrenheit" ? "°F" : "°C";
    const windSpeedUnit = tidyDataset(finderEl && finderEl.dataset.windSpeedUnit).toLowerCase() === "kph" ? "kmh" : "mph";
    const windSpeedLabel = windSpeedUnit === "kmh" ? "kilometres per hour" : "miles per hour";
    const windSpeedSymbol = windSpeedUnit === "kmh" ? "km/h" : "mph";
    const defaultQuery = tidyDataset(finderEl && finderEl.dataset.defaultQuery);
    const locality = tidyDataset(finderEl && finderEl.dataset.locality);
    const localityMode = tidyDataset(finderEl && finderEl.dataset.localityMode).toLowerCase();
    const restrictToLocality = locality && localityMode === "restrict";
    const websiteOnly = isEnabled(finderEl && finderEl.dataset.websiteOnly);
    const autoNearby = isEnabled(finderEl && finderEl.dataset.autoNearby);
    const compactLayout = isEnabled(finderEl && finderEl.dataset.compact) || tidyDataset(finderEl && finderEl.dataset.layout).toLowerCase() === "compact";

    const searchEl = document.getElementById("dgapi-cf-search");
    const areaEl = document.getElementById("dgapi-cf-area");
    const sortEl = document.getElementById("dgapi-cf-sort");
    const countEl = document.getElementById("dgapi-cf-count");
    const statusEl = document.getElementById("dgapi-cf-status");
    const listWrapEl = document.getElementById("dgapi-cf-list-wrap");
    const pageControlsEl = document.getElementById("dgapi-cf-pagination");
    const nearMeEl = document.getElementById("dgapi-cf-near-me");
    const schemaId = "dgapi-course-finder-schema";

    if (!finderEl || !searchEl || !areaEl || !sortEl || !countEl || !statusEl || !listWrapEl || !nearMeEl) {
      return;
    }

    applyThemeOptions();
    finderEl.classList.toggle("cf-compact", compactLayout);

    areaEl.innerHTML = areaOptions.map(option =>
      `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
    ).join("");
    areaMode = findAreaOption(areaMode).value;
    areaEl.value = areaMode;
    query = defaultQuery || locality;
    searchEl.value = query;

    function tidy(value) {
      return String(value || "").trim();
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function slugify(value) {
      return tidy(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "course";
    }

    function splitLocality(locality) {
      if (!locality) {
        return { town: "", county: "" };
      }

      const pieces = locality.split(",").map(part => part.trim()).filter(Boolean);
      const useful = pieces.filter(part => !/^[A-Z]{1,2}\d/i.test(part));

      if (useful.length >= 2) {
        return { town: useful[0], county: useful[useful.length - 1] };
      }

      return { town: useful[0] || locality, county: "" };
    }

    function inferTown(name) {
      return name.replace(/\s+(Disc Golf Club|Disc Golf Course|Disc Golf|DGC)$/i, "").trim() || "Course";
    }

    function countryLabel(countryCode) {
      const labels = {
        AU: "Australia",
        CA: "Canada",
        EE: "Estonia",
        FI: "Finland",
        GB: "Great Britain",
        SE: "Sweden",
        US: "United States"
      };

      return labels[tidy(countryCode).toUpperCase()] || tidy(countryCode).toUpperCase() || "Disc golf";
    }

    function regionLabel(regionCode, countryCode) {
      const cleanRegionCode = tidy(regionCode).toUpperCase();
      const cleanCountryCode = tidy(countryCode).toUpperCase();
      const labels = {
        GB: {
          ENG: "England",
          WLS: "Wales",
          SCT: "Scotland"
        },
        US: {
          AL: "Alabama",
          AK: "Alaska",
          AZ: "Arizona",
          AR: "Arkansas",
          CA: "California",
          CO: "Colorado",
          CT: "Connecticut",
          DE: "Delaware",
          FL: "Florida",
          GA: "Georgia",
          HI: "Hawaii",
          ID: "Idaho",
          IL: "Illinois",
          IN: "Indiana",
          IA: "Iowa",
          KS: "Kansas",
          KY: "Kentucky",
          LA: "Louisiana",
          ME: "Maine",
          MD: "Maryland",
          MA: "Massachusetts",
          MI: "Michigan",
          MN: "Minnesota",
          MS: "Mississippi",
          MO: "Missouri",
          MT: "Montana",
          NE: "Nebraska",
          NV: "Nevada",
          NH: "New Hampshire",
          NJ: "New Jersey",
          NM: "New Mexico",
          NY: "New York",
          NC: "North Carolina",
          ND: "North Dakota",
          OH: "Ohio",
          OK: "Oklahoma",
          OR: "Oregon",
          PA: "Pennsylvania",
          RI: "Rhode Island",
          SC: "South Carolina",
          SD: "South Dakota",
          TN: "Tennessee",
          TX: "Texas",
          UT: "Utah",
          VT: "Vermont",
          VA: "Virginia",
          WA: "Washington",
          WV: "West Virginia",
          WI: "Wisconsin",
          WY: "Wyoming"
        }
      };

      return (labels[cleanCountryCode] && labels[cleanCountryCode][cleanRegionCode]) || cleanRegionCode || countryLabel(cleanCountryCode);
    }

    function inferredRegionName(course) {
      const countryCode = tidy(course.country_code).toUpperCase();
      const regionCode = tidy(course.region_code).toUpperCase();
      if (regionCode) {
        return regionLabel(regionCode, countryCode);
      }

      if (countryCode && countryCode !== "GB") {
        return countryLabel(countryCode);
      }

      const id = tidy(course.id).toLowerCase();
      const name = tidy(course.name).toLowerCase();
      const locality = tidy(course.locality).toLowerCase();
      const lat = Number(course.lat);
      const lon = Number(course.lon);

      if (id.includes("felin_geri") || name.includes("felin geri") || locality.includes("newcastle emlyn")) {
        return "Wales";
      }

      if (id.includes("castle_heather") || name.includes("castle heather") || locality.includes("inverness")) {
        return "Scotland";
      }

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        if (lat >= 55) {
          return "Scotland";
        }

        if (lon <= -3 && lat >= 51 && lat <= 53.6) {
          return "Wales";
        }
      }

      return countryLabel(countryCode || "GB");
    }

    function normalizeCourse(course) {
      const name = tidy(course.name);
      const locality = tidy(course.locality);
      const parts = splitLocality(locality);
      const regionCode = tidy(course.region_code).toUpperCase();
      const countryCode = tidy(course.country_code).toUpperCase();
      const regionName = inferredRegionName(course);

      return {
        id: tidy(course.id) || name,
        slug: tidy(course.slug) || slugify(course.name || course.id),
        name,
        town: parts.town || locality || inferTown(name),
        county: parts.county || regionName,
        countryCode,
        regionCode,
        regionName,
        website: tidy(course.website),
        lat: Number(course.lat),
        lon: Number(course.lon)
      };
    }

    function normaliseIdentifier(value) {
      return tidy(value).toLowerCase();
    }

    function matchedCourseBadges(course) {
      const courseIds = [course.id, course.slug]
        .map(normaliseIdentifier)
        .filter(Boolean);
      const matches = (courseBadges.courses || []).filter(item => {
        const identifiers = itemIdentifiers(item);
        return identifiers.some(identifier => courseIds.includes(identifier));
      });

      return matches.flatMap(item => {
        const badges = Array.isArray(item.badges) && item.badges.length
          ? item.badges
          : [{ label: item.badge_label || item.label || courseBadges.badge_label, url: item.badge_url || item.url || courseBadges.badge_url }];

        return badges.map(badge => {
          const badgeConfig = badge && typeof badge === "object" ? badge : { label: badge };
          return {
            label: tidy(badgeConfig.label) || courseBadges.badge_label || "Course Badge Partner",
            url: tidy(badgeConfig.url) || courseBadges.badge_url || "/membership/membership-course-card/"
          };
        });
      });
    }

    function applyCourseBadges() {
      courses = courses.map(course => {
        return Object.assign({}, course, {
          badges: matchedCourseBadges(course)
        });
      });
    }

    function mapsUrl(course) {
      const hasCoordinates = Number.isFinite(course.lat) && Number.isFinite(course.lon);
      const queryText = hasCoordinates ? `${course.lat},${course.lon}` : `${course.name}, ${course.town}, ${course.regionName || "England"}`;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
    }

    function directionsUrls(course) {
      const destination = Number.isFinite(course.lat) && Number.isFinite(course.lon)
        ? `${course.lat},${course.lon}`
        : `${course.name}, ${course.town}, ${course.regionName || "England"}`;

      return {
        google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
        apple: `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`,
        waze: Number.isFinite(course.lat) && Number.isFinite(course.lon)
          ? `https://waze.com/ul?ll=${encodeURIComponent(`${course.lat},${course.lon}`)}&navigate=yes`
          : `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`
      };
    }

    function apiUrlForArea() {
      const option = findAreaOption(areaMode);
      const query = option.query || (areaMode === "gb" ? "country=GB&limit=500" : "country=GB&region=ENG&limit=200");
      if (!query) {
        return API_BASE_URL;
      }

      if (/^https?:\/\//i.test(query)) {
        return query;
      }

      const separator = API_BASE_URL.includes("?") ? "&" : "?";
      return query.startsWith("?") || query.startsWith("&")
        ? `${API_BASE_URL}${query}`
        : `${API_BASE_URL}${separator}${query}`;
    }

    function toRadians(degrees) {
      return degrees * Math.PI / 180;
    }

    function distanceMiles(course) {
      if (!userLocation || !Number.isFinite(course.lat) || !Number.isFinite(course.lon)) {
        return null;
      }

      const earthRadiusMiles = 3958.8;
      const fromLat = toRadians(userLocation.lat);
      const toLat = toRadians(course.lat);
      const deltaLat = toRadians(course.lat - userLocation.lat);
      const deltaLon = toRadians(course.lon - userLocation.lon);
      const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;

      return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatMiles(miles) {
      if (miles === null) {
        return "";
      }

      return miles < 10 ? `${miles.toFixed(1)} miles` : `${Math.round(miles)} miles`;
    }

    function weatherUrl(course) {
      const daily = [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "sunrise",
        "sunset",
        "precipitation_sum",
        "precipitation_probability_max",
        "uv_index_max",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "wind_direction_10m_dominant"
      ].join(",");

      return "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${encodeURIComponent(course.lat)}` +
        `&longitude=${encodeURIComponent(course.lon)}` +
        `&daily=${daily}` +
        `&timezone=Europe%2FLondon&forecast_days=${forecastDays}` +
        `&temperature_unit=${encodeURIComponent(temperatureUnit)}` +
        `&wind_speed_unit=${encodeURIComponent(windSpeedUnit)}`;
    }

    function weatherSummary(code) {
      const summaries = {
        0: "Sunny",
        1: "Mostly sunny",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Fog",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Heavy drizzle",
        56: "Freezing drizzle",
        57: "Freezing drizzle",
        61: "Light rain",
        63: "Rain",
        65: "Heavy rain",
        66: "Freezing rain",
        67: "Freezing rain",
        71: "Light snow",
        73: "Snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Rain showers",
        81: "Rain showers",
        82: "Heavy showers",
        85: "Snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm",
        99: "Thunderstorm"
      };

      return summaries[Number(code)] || "Mixed conditions";
    }

    function weatherIconSvg(code) {
      const weatherCode = Number(code);
      if (weatherCode === 0) {
        return `<svg class="cf-weather-icon" viewBox="0 0 52 52" fill="none" aria-hidden="true"><circle cx="26" cy="26" r="13" fill="#f2b84b"/><g stroke="#f2b84b" stroke-width="2.5" stroke-linecap="round"><line x1="26" y1="5" x2="26" y2="10"/><line x1="26" y1="42" x2="26" y2="47"/><line x1="5" y1="26" x2="10" y2="26"/><line x1="42" y1="26" x2="47" y2="26"/><line x1="11.7" y1="11.7" x2="15.2" y2="15.2"/><line x1="36.8" y1="36.8" x2="40.3" y2="40.3"/><line x1="40.3" y1="11.7" x2="36.8" y2="15.2"/><line x1="15.2" y1="36.8" x2="11.7" y2="40.3"/></g></svg>`;
      }

      if (weatherCode <= 2) {
        return `<svg class="cf-weather-icon" viewBox="0 0 52 52" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="9" fill="#f2b84b"/><rect x="7" y="25" width="30" height="14" rx="7" fill="#c7d3d8"/><rect x="13" y="20" width="24" height="12" rx="6" fill="#dce5e8"/></svg>`;
      }

      if (weatherCode === 3) {
        return `<svg class="cf-weather-icon" viewBox="0 0 52 52" fill="none" aria-hidden="true"><rect x="7" y="22" width="38" height="16" rx="8" fill="#aab9bf"/><rect x="13" y="16" width="28" height="14" rx="7" fill="#cbd6da"/></svg>`;
      }

      if (weatherCode <= 49) {
        return `<svg class="cf-weather-icon" viewBox="0 0 52 52" fill="none" aria-hidden="true"><rect x="7" y="20" width="38" height="16" rx="8" fill="#c7d3d8" opacity=".78"/><rect x="13" y="14" width="28" height="14" rx="7" fill="#dce5e8" opacity=".68"/><g stroke="#8d9aa0" stroke-width="1.7" stroke-linecap="round"><line x1="14" y1="41" x2="23" y2="41"/><line x1="28" y1="41" x2="42" y2="41"/><line x1="10" y1="46" x2="34" y2="46"/></g></svg>`;
      }

      if (weatherCode <= 67 || (weatherCode >= 80 && weatherCode <= 82)) {
        return `<svg class="cf-weather-icon" viewBox="0 0 52 52" fill="none" aria-hidden="true"><rect x="7" y="17" width="38" height="16" rx="8" fill="#8fa3ad"/><rect x="13" y="11" width="28" height="14" rx="7" fill="#b2c0c6"/><g stroke="#3f79d3" stroke-width="2.3" stroke-linecap="round"><line x1="15" y1="37" x2="13" y2="45"/><line x1="24" y1="37" x2="22" y2="45"/><line x1="33" y1="37" x2="31" y2="45"/><line x1="42" y1="37" x2="40" y2="45"/></g></svg>`;
      }

      if (weatherCode <= 77 || weatherCode >= 85) {
        return `<svg class="cf-weather-icon" viewBox="0 0 52 52" fill="none" aria-hidden="true"><rect x="7" y="18" width="38" height="16" rx="8" fill="#8fa3ad"/><rect x="13" y="12" width="28" height="14" rx="7" fill="#b2c0c6"/><g fill="#a8d8ea"><circle cx="15" cy="42" r="3"/><circle cx="26" cy="44" r="3"/><circle cx="37" cy="42" r="3"/></g></svg>`;
      }

      return `<svg class="cf-weather-icon" viewBox="0 0 52 52" fill="none" aria-hidden="true"><rect x="7" y="15" width="38" height="16" rx="8" fill="#758992"/><g stroke="#3f79d3" stroke-width="2.2" stroke-linecap="round"><line x1="15" y1="35" x2="13" y2="43"/><line x1="37" y1="35" x2="35" y2="43"/></g><polygon points="21,31 27,19 31,28 37,28 29,42 30,31" fill="#f2b84b"/></svg>`;
    }

    function statIconSvg(type) {
      const colours = {
        wind: "#2a3d45",
        gust: "#c0392b",
        rain: "#4e7fca",
        uv: "#e98942",
        sunrise: "#e98942",
        sunset: "#60747d"
      };
      const colour = colours[type] || "#2a3d45";

      if (type === "rain") {
        return `<svg class="cf-weather-stat-icon" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`;
      }

      if (type === "uv") {
        return `<svg class="cf-weather-stat-icon" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/></svg>`;
      }

      if (type === "sunrise" || type === "sunset") {
        const points = type === "sunrise" ? "8 6 12 2 16 6" : "16 5 12 9 8 5";
        return `<svg class="cf-weather-stat-icon" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="${type === "sunrise" ? "2" : "9"}" x2="12" y2="${type === "sunrise" ? "9" : "2"}"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="${points}"/></svg>`;
      }

      return `<svg class="cf-weather-stat-icon" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`;
    }

    function compassDirection(degrees) {
      if (!Number.isFinite(Number(degrees))) {
        return "";
      }

      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return directions[Math.round(Number(degrees) / 45) % 8];
    }

    function windDirectionClass(degrees) {
      if (!Number.isFinite(Number(degrees))) {
        return "";
      }
      const direction = Math.round(Number(degrees) / 45) % 8;
      return `cf-wind-direction-${direction}`;
    }

    function formatForecastDate(date, index) {
      const parsed = new Date(`${date}T12:00:00`);
      const formatted = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short"
      }).format(parsed);
      const label = index === 0 ? "Today" : index === 1 ? "Tomorrow" : "";

      return label ? `${label} · ${formatted}` : formatted;
    }

    function formatTime(value) {
      if (!value) {
        return "n/a";
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return "n/a";
      }

      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(parsed);
    }

    function formatUv(value) {
      if (!Number.isFinite(Number(value))) {
        return "n/a";
      }

      return Number(value).toFixed(1);
    }

    function uvLabel(value) {
      if (!Number.isFinite(Number(value))) {
        return "n/a";
      }

      const uv = Number(value);
      if (uv < 3) {
        return `${uv.toFixed(1)} Low`;
      }

      if (uv < 6) {
        return `${uv.toFixed(1)} Mod`;
      }

      if (uv < 8) {
        return `${uv.toFixed(1)} High`;
      }

      return `${uv.toFixed(1)} V.High`;
    }

    function discGolfTip(day) {
      const pools = [];

      if (day.code >= 95) {
        pools.push(
          "Storm risk — avoid playing if lightning is nearby.",
          "Thunderstorms possible — be ready to pause the round.",
          "Stormy conditions — shelter beats squeezing in one more hole."
        );
      }

      if (day.rain >= 3) {
        pools.push(
          "Very wet round — bring extra towels and waterproof shoes.",
          "Rainy conditions — bag a spare towel and expect slick discs.",
          "Wet fairways — slow down your run-up and protect your grip."
        );
      } else if (day.rain >= 0.5) {
        pools.push(
          "Showers possible — bring a towel and grippy footwear.",
          "A little rain about — keep a towel handy for drives and putts.",
          "Damp conditions — check your footing before full-power throws."
        );
      }

      if (day.gusts >= 28 || day.wind >= 22) {
        pools.push(
          "Very windy — pack overstable discs and keep throws low.",
          "Strong wind — favour controlled lines over max distance.",
          "Gusty round — club up on stability and commit to flatter releases."
        );
      } else if (day.gusts >= 20 || day.wind >= 16) {
        pools.push(
          "Breezy round — consider overstable discs and controlled lines.",
          "Wind in play — watch nose angle and avoid floaty putts.",
          "Expect movement in the air — lower lines should be more reliable."
        );
      }

      if (day.uv >= 6) {
        pools.push(
          "High UV — use sunscreen, sunglasses and a cap.",
          "Bright day — sunscreen and water are worth packing.",
          "Strong sun — cover up and take shade where you can."
        );
      } else if (day.uv >= 3) {
        pools.push(
          "Moderate UV — sunscreen is a good idea.",
          "Some UV exposure — sunglasses and a cap may help.",
          "A bit of sun about — protect your skin on longer rounds."
        );
      }

      if (day.maxTemp >= 25) {
        pools.push(
          "Hot round — bring extra water and stay hydrated.",
          "Warm conditions — pace yourself and drink before you feel thirsty.",
          "Heat in play — carry water and avoid rushing between holes."
        );
      } else if (day.maxTemp >= 21) {
        pools.push(
          "Warm round — bring water and keep discs out of direct sun.",
          "Pleasant but warm — hydrate and enjoy the slower fairway walks.",
          "Good warmth for throwing — pack a drink and stay comfortable."
        );
      }

      if (day.minTemp <= 3) {
        pools.push(
          "Cold start — layer up and keep your hands warm.",
          "Chilly conditions — warm hands make cleaner releases.",
          "Cold round — a hand warmer could save your putting touch."
        );
      }

      if (!pools.length && day.code <= 1) {
        pools.push(
          "Great disc golf weather — pack sunglasses and enjoy it.",
          "Clear skies — a good day to trust your lines.",
          "Fine conditions — enjoy the round and watch for firm skips."
        );
      }

      if (!pools.length) {
        pools.push(
          "Steady conditions — check footing and adjust for the wind.",
          "Playable weather — keep an eye on footing and disc selection.",
          "Mixed conditions — stay flexible with shot shape and speed."
        );
      }

      return pickTip(pools, `${day.date}-${day.code}-${Math.round(day.wind)}-${Math.round(day.rain * 10)}`);
    }

    function pickTip(options, seed) {
      let hash = 0;
      for (let index = 0; index < seed.length; index += 1) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(index);
        hash |= 0;
      }

      return options[Math.abs(hash) % options.length];
    }

    function normaliseWeather(payload) {
      const daily = payload && payload.daily;
      if (!daily || !Array.isArray(daily.time)) {
        return [];
      }

      return daily.time.slice(0, forecastDays).map((date, index) => ({
        date,
        code: Number(daily.weather_code[index]),
        maxTemp: Number(daily.temperature_2m_max[index]),
        minTemp: Number(daily.temperature_2m_min[index]),
        sunrise: tidy(daily.sunrise[index]),
        sunset: tidy(daily.sunset[index]),
        rain: Number(daily.precipitation_sum[index] || 0),
        rainProbability: Number(daily.precipitation_probability_max[index] || 0),
        uv: Number(daily.uv_index_max[index] || 0),
        wind: Number(daily.wind_speed_10m_max[index] || 0),
        gusts: Number(daily.wind_gusts_10m_max[index] || 0),
        windDirection: Number(daily.wind_direction_10m_dominant[index])
      }));
    }

    function weatherPanelHtml(course, weatherId) {
      const openClass = openWeatherCourseId === course.id ? " open" : "";
      const panelAttrs = `id="${escapeHtml(weatherId)}" aria-label="Weather forecast for ${escapeHtml(course.name)}"`;

      if (course.weatherLoading) {
        return `<div class="cf-weather-panel${openClass}" ${panelAttrs} aria-live="polite"><div class="cf-weather-empty">Loading weather forecast...</div></div>`;
      }

      if (course.weatherError) {
        return `<div class="cf-weather-panel${openClass}" ${panelAttrs} aria-live="polite"><div class="cf-weather-empty">${escapeHtml(course.weatherError)}</div></div>`;
      }

      if (!Array.isArray(course.weatherDays) || !course.weatherDays.length) {
        return `<div class="cf-weather-panel${openClass}" ${panelAttrs}></div>`;
      }

      return `<div class="cf-weather-panel${openClass}" ${panelAttrs}>
        <div class="cf-weather-inner">
          ${course.weatherDays.map((day, index) => {
            const summary = weatherSummary(day.code);
            const direction = compassDirection(day.windDirection);
            const windArrowClass = windDirectionClass(day.windDirection);
            return `<div class="cf-weather-card" aria-label="${escapeHtml(formatForecastDate(day.date, index))}: ${escapeHtml(summary)}, high ${Math.round(day.maxTemp)} ${temperatureLabel}, low ${Math.round(day.minTemp)} ${temperatureLabel}">
              <div class="cf-weather-header">
                <h3 class="cf-weather-day">${escapeHtml(formatForecastDate(day.date, index))}</h3>
              </div>
              <div class="cf-weather-body">
                <p class="cf-weather-tip">${escapeHtml(discGolfTip(day))}</p>
                <div class="cf-weather-main">
                  ${weatherIconSvg(day.code)}
                  <div>
                    <strong class="cf-weather-temp">${Math.round(day.maxTemp)}${temperatureSymbol}</strong>
                    <div class="cf-weather-low">Low ${Math.round(day.minTemp)}${temperatureSymbol}</div>
                  </div>
                </div>
                <div class="cf-weather-condition">${escapeHtml(summary)}</div>
                <div class="cf-weather-stat-grid">
                  <div class="cf-weather-stat" aria-label="Wind speed ${Math.round(day.wind)} ${windSpeedLabel} ${escapeHtml(direction)}">
                    ${statIconSvg("wind")}
                    <div><div class="cf-weather-stat-value"><span class="cf-weather-wind-arrow ${windArrowClass}">↑</span> ${Math.round(day.wind)} ${windSpeedSymbol} ${escapeHtml(direction)}</div><div class="cf-weather-stat-label">Wind speed</div></div>
                  </div>
                  <div class="cf-weather-stat" aria-label="Gusts ${Math.round(day.gusts)} ${windSpeedLabel}">
                    ${statIconSvg("gust")}
                    <div><div class="cf-weather-stat-value">${Math.round(day.gusts)} ${windSpeedSymbol}</div><div class="cf-weather-stat-label">Gusts</div></div>
                  </div>
                  <div class="cf-weather-stat" aria-label="Rain ${day.rain.toFixed(1)} millimetres, ${Math.round(day.rainProbability)} percent chance">
                    ${statIconSvg("rain")}
                    <div><div class="cf-weather-stat-value">${day.rain.toFixed(1)} mm · ${Math.round(day.rainProbability)}%</div><div class="cf-weather-stat-label">Rain · chance</div></div>
                  </div>
                  <div class="cf-weather-stat" aria-label="UV index ${escapeHtml(uvLabel(day.uv))}">
                    ${statIconSvg("uv")}
                    <div><div class="cf-weather-stat-value">${escapeHtml(uvLabel(day.uv))}</div><div class="cf-weather-stat-label">UV index</div></div>
                  </div>
                  <div class="cf-weather-stat" aria-label="Sunrise ${escapeHtml(formatTime(day.sunrise))}">
                    ${statIconSvg("sunrise")}
                    <div><div class="cf-weather-stat-value">${escapeHtml(formatTime(day.sunrise))}</div><div class="cf-weather-stat-label">Sunrise</div></div>
                  </div>
                  <div class="cf-weather-stat" aria-label="Sunset ${escapeHtml(formatTime(day.sunset))}">
                    ${statIconSvg("sunset")}
                    <div><div class="cf-weather-stat-value">${escapeHtml(formatTime(day.sunset))}</div><div class="cf-weather-stat-label">Sunset</div></div>
                  </div>
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
    }

    function courseBadgesHtml(course) {
      if (!Array.isArray(course.badges) || !course.badges.length) {
        return "";
      }

      return `<div class="cf-badges">${course.badges.map(badge =>
        `<a class="cf-badge" href="${escapeHtml(badge.url)}">${escapeHtml(badge.label)}</a>`
      ).join("")}</div>`;
    }

    function normalisePostcode(value) {
      return value.trim().toUpperCase().replace(/\s+/g, "");
    }

    function isFullGbPostcode(value) {
      return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(normalisePostcode(value));
    }

    function isOutwardGbPostcode(value) {
      return /^[A-Z]{1,2}\d[A-Z\d]?$/.test(normalisePostcode(value));
    }

    function isPostcodeLookup(value) {
      return isFullGbPostcode(value) || isOutwardGbPostcode(value);
    }

    function shouldLookupPlace(value) {
      const clean = value.trim();
      if (clean.length < 3 || isPostcodeLookup(clean) || /\d/.test(clean)) {
        return false;
      }

      const needle = clean.toLowerCase();
      const hasCourseNameMatch = courses.some(course => course.name.toLowerCase().includes(needle));
      return !hasCourseNameMatch;
    }

    function filteredCourses() {
      const locationSearch = userLocation && locationSearchKey && normaliseSearchKey(query) === locationSearchKey;
      const needle = locationSearch ? "" : query.trim().toLowerCase();
      let list = needle
        ? courses.filter(course => [course.name, course.town, course.county].join(" ").toLowerCase().includes(needle))
        : courses.slice();

      if (restrictToLocality) {
        const localityNeedle = locality.toLowerCase();
        list = list.filter(course => [course.name, course.town, course.county, course.regionName].join(" ").toLowerCase().includes(localityNeedle));
      }

      if (websiteOnly) {
        list = list.filter(course => course.website);
      }

      return list.sort((a, b) => {
        if (sort === "distance" && userLocation) {
          return (distanceMiles(a) ?? Infinity) - (distanceMiles(b) ?? Infinity) || a.name.localeCompare(b.name);
        }

        if (sort === "location") {
          return a.town.localeCompare(b.town) || a.county.localeCompare(b.county) || a.name.localeCompare(b.name);
        }

        return a.name.localeCompare(b.name);
      });
    }

    function applyPagination(list) {
      if (!pageSize || !Array.isArray(list)) {
        return list;
      }

      const pages = Math.max(1, Math.ceil(list.length / pageSize));
      if (currentPage > pages) {
        currentPage = pages;
      }

      const start = (currentPage - 1) * pageSize;
      return list.slice(start, start + pageSize);
    }

    function renderPagination(totalCourses) {
      if (!pageControlsEl) {
        return;
      }

      if (!pageSize || totalCourses <= pageSize) {
        pageControlsEl.innerHTML = "";
        return;
      }

      const pages = Math.max(1, Math.ceil(totalCourses / pageSize));
      pageControlsEl.innerHTML = `
        <div class="cf-pagination-inner">
          <button type="button" class="cf-pagination-button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
          <span class="cf-pagination-info">Page ${currentPage} of ${pages}</span>
          <button type="button" class="cf-pagination-button" data-page="next" ${currentPage === pages ? "disabled" : ""}>Next</button>
        </div>
      `;
    }

    function render() {
      const visibleCourses = filteredCourses();
      const pagedCourses = applyPagination(visibleCourses);
      const areaLabel = findAreaOption(areaMode).label;
      countEl.textContent = visibleCourses.length === courses.length
        ? `${courses.length} ${areaLabel} courses`
        : `${visibleCourses.length} of ${courses.length} ${areaLabel} courses`;

      renderPagination(visibleCourses.length);

      if (!courses.length) {
        listWrapEl.innerHTML = `
          <div class="cf-loading" aria-label="Loading courses">
            <div class="cf-loading-head">
              <span class="cf-spinner" aria-hidden="true"></span>
              <span>Loading courses...</span>
            </div>
            <div class="cf-skeleton-row">
              <div class="cf-skeleton-line title"></div>
              <div class="cf-skeleton-line meta"></div>
            </div>
            <div class="cf-skeleton-row">
              <div class="cf-skeleton-line title"></div>
              <div class="cf-skeleton-line meta"></div>
            </div>
            <div class="cf-skeleton-row">
              <div class="cf-skeleton-line title"></div>
              <div class="cf-skeleton-line meta"></div>
            </div>
          </div>
        `;
        return;
      }

      if (!visibleCourses.length) {
        const emptyLabel = query || locality || "these filters";
        listWrapEl.innerHTML = `<div class="cf-empty">No courses match "${escapeHtml(emptyLabel)}". Try a different search term or area.</div>`;
        return;
      }

      listWrapEl.innerHTML = `<div class="cf-list">${pagedCourses.map(course => {
        const rowId = `dgapi-course-${slugify(course.id || course.name)}`;
          const titleId = `${rowId}-title`;
          const weatherId = `${rowId}-weather`;

        return `
        <article class="cf-row" id="${escapeHtml(rowId)}" aria-labelledby="${escapeHtml(titleId)}">
          <div>
            <h2 class="cf-name" id="${escapeHtml(titleId)}">${escapeHtml(course.name)}</h2>
            ${courseBadgesHtml(course)}
            <div class="cf-meta">
              <span>${escapeHtml(course.town || "England")}</span>
              <span class="cf-meta-sep" aria-hidden="true">/</span>
              <span>${escapeHtml(course.county || "England")}</span>
              ${distanceMiles(course) !== null ? `<span class="cf-meta-sep" aria-hidden="true">/</span><span>${formatMiles(distanceMiles(course))}</span>` : ""}
            </div>
          </div>
          <div class="cf-links">
            <button class="cf-link secondary" type="button" data-directions-course="${escapeHtml(course.id)}" aria-label="Choose directions app for ${escapeHtml(course.name)}">Directions</button>
            ${course.website ? `<a class="cf-link" href="${escapeHtml(course.website)}" target="_blank" rel="noopener" aria-label="Website for ${escapeHtml(course.name)}">Website</a>` : ""}
            ${forecastDays > 0 && Number.isFinite(course.lat) && Number.isFinite(course.lon) ? `<button class="cf-link secondary" type="button" data-weather-course="${escapeHtml(course.id)}" aria-expanded="${openWeatherCourseId === course.id ? "true" : "false"}" aria-controls="${escapeHtml(weatherId)}" aria-label="Show weather for ${escapeHtml(course.name)}">Weather</button>` : ""}
          </div>
          ${forecastDays > 0 ? weatherPanelHtml(course, weatherId) : ""}
        </article>
      `;
      }).join("")}</div>`;

      updateSchema();
    }

    function setStatus(message) {
      statusEl.hidden = !message;
      statusEl.textContent = message || "";
    }

    function shouldUseGbArea(country) {
      const cleanCountry = tidy(country).toLowerCase();
      return cleanCountry === "wales" || cleanCountry === "scotland";
    }

    function setLocation(lat, lon, label, options = {}) {
      userLocation = { lat, lon };
      locationSearchKey = normaliseSearchKey(query);
      sort = "distance";
      sortEl.value = "distance";
      if (options.allowAreaWiden && areaMode === "england") {
        areaMode = "gb";
        areaEl.value = "gb";
        setStatus(label ? `Showing closest courses to ${label}, including Wales and Scotland.` : "Showing closest courses first, including Wales and Scotland.");
        loadCourses({ preserveStatus: true });
        return;
      }

      setStatus(label ? `Showing closest courses to ${label}.` : "Showing closest courses first.");
      render();
    }

    function normaliseSearchKey(value) {
      return value.trim().toLowerCase().replace(/\s+/g, " ");
    }

    function normalisePlaceLookup(value) {
      const clean = value.trim();
      const corrections = {
        carlise: "Carlisle"
      };

      return corrections[clean.toLowerCase()] || clean;
    }

    async function lookupPostcode(postcode) {
      const cleanPostcode = normalisePostcode(postcode);
      const fullPostcode = isFullGbPostcode(cleanPostcode);
      const outwardPostcode = isOutwardGbPostcode(cleanPostcode);

      if ((!fullPostcode && !outwardPostcode) || cleanPostcode === lastPostcodeLookup) {
        return;
      }

      lastPostcodeLookup = cleanPostcode;
      setStatus("Looking up postcode...");

      try {
        const endpoint = fullPostcode ? "postcodes" : "outcodes";
        const response = await fetch(`https://api.postcodes.io/${endpoint}/${encodeURIComponent(cleanPostcode)}`);
        if (!response.ok) {
          throw new Error("Postcode not found");
        }

        const payload = await response.json();
        const result = payload && payload.result;
        if (!result || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) {
          throw new Error("Postcode coordinates unavailable");
        }

        setLocation(result.latitude, result.longitude, result.postcode || result.outcode || cleanPostcode.toUpperCase(), {
          allowAreaWiden: shouldUseGbArea(result.country)
        });
      } catch (error) {
        setStatus("That postcode could not be found. Try a full postcode or an area code, for example CV32 5AA or TQ1.");
      }
    }

    async function lookupPlace(place) {
      const cleanPlace = normalisePlaceLookup(place);
      const lookupKey = cleanPlace.toLowerCase();
      if (!shouldLookupPlace(cleanPlace) || lookupKey === lastPlaceLookup) {
        return;
      }

      lastPlaceLookup = lookupKey;
      setStatus("Looking up location...");

      try {
        const response = await fetch(`https://api.postcodes.io/places?q=${encodeURIComponent(cleanPlace)}`);
        if (!response.ok) {
          throw new Error("Place not found");
        }

        const payload = await response.json();
        const results = Array.isArray(payload && payload.result) ? payload.result : [];
        const preferredResult = results.find(result => {
          const country = tidy(result.country).toLowerCase();
          const name = tidy(result.name).toLowerCase();
          return ["england", "wales", "scotland"].includes(country) || name.includes(lookupKey);
        }) || results[0];

        if (!preferredResult || !Number.isFinite(Number(preferredResult.latitude)) || !Number.isFinite(Number(preferredResult.longitude))) {
          throw new Error("Place coordinates unavailable");
        }

        setLocation(Number(preferredResult.latitude), Number(preferredResult.longitude), preferredResult.name || cleanPlace, {
          allowAreaWiden: shouldUseGbArea(preferredResult.country)
        });
      } catch (error) {
        render();
      }
    }

    function useBrowserLocation() {
      if (!navigator.geolocation) {
        setStatus("Your browser does not support location lookup. Enter a postcode instead.");
        return;
      }

      nearMeEl.disabled = true;
      setStatus("Asking your browser for your location...");

      navigator.geolocation.getCurrentPosition(
        position => {
          nearMeEl.disabled = false;
          setLocation(position.coords.latitude, position.coords.longitude, "your location");
        },
        error => {
          nearMeEl.disabled = false;

          if (error && error.code === 1) {
            setStatus("Location is blocked for this site. Use a postcode instead, or allow location in your browser site settings.");
          } else if (error && error.code === 2) {
            setStatus("Your location could not be found. Enter a postcode instead.");
          } else {
            setStatus("Location lookup timed out. Enter a postcode instead.");
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }

    async function loadCourseBadges() {
      try {
        const response = await fetch(COURSE_BADGES_URL, { headers: { Accept: "application/json" } });
        if (!response.ok) {
          throw new Error("Course badges JSON not found");
        }

        const payload = await response.json();
        if (payload && Array.isArray(payload.courses)) {
          courseBadges = Object.assign({}, payload, { source_url: DGAPI_SOURCE_URL });
        }
      } catch (error) {
        courseBadges = FALLBACK_COURSE_BADGES;
      }

      applyCourseBadges();
      render();
    }

    async function loadCourses(options = {}) {
      if (!options.preserveStatus) {
        setStatus(`Loading ${findAreaOption(areaMode).label} course list...`);
      }
      render();

      try {
        const response = await fetch(apiUrlForArea(), { mode: "cors", headers: { Accept: "application/json" } });
        if (!response.ok) {
          throw new Error(`DiscGolfAPI returned ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload.courses) || !payload.courses.length) {
          throw new Error("DiscGolfAPI returned no courses");
        }

        currentPage = 1;
        courses = payload.courses
          .map(normalizeCourse)
          .filter(course => course.name);
        if (!options.preserveStatus) {
          setStatus("");
        }
      } catch (error) {
        setStatus("Course data could not be loaded. Please try again shortly.");
      }

      applyCourseBadges();
      render();
    }

    function updateSchema() {
      const existing = document.getElementById(schemaId);
      if (existing) {
        existing.parentNode.removeChild(existing);
      }

      if (!courses.length) {
        return;
      }

      const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": areaMode === "gb" ? "Disc golf courses in England, Wales and Scotland" : "Disc golf courses in England",
        "itemListElement": courses.map((course, index) => {
          const item = {
            "@type": "SportsActivityLocation",
            "name": course.name,
            "sport": "Disc golf",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": course.town || undefined,
              "addressRegion": course.county || undefined,
              "addressCountry": "GB"
            }
          };

          if (course.website) {
            item.url = course.website;
          }

          if (Number.isFinite(course.lat) && Number.isFinite(course.lon)) {
            item.geo = {
              "@type": "GeoCoordinates",
              "latitude": course.lat,
              "longitude": course.lon
            };
          }

          return {
            "@type": "ListItem",
            "position": index + 1,
            "item": item
          };
        })
      };

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = schemaId;
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    function updateCourse(courseId, updates) {
      courses = courses.map(course => course.id === courseId ? Object.assign({}, course, updates) : course);
    }

    async function loadWeather(courseId) {
      const course = courses.find(item => item.id === courseId);
      if (!course || !Number.isFinite(course.lat) || !Number.isFinite(course.lon) || course.weatherDays || course.weatherLoading) {
        return;
      }

      updateCourse(courseId, { weatherLoading: true, weatherError: "" });
      render();

      try {
        const response = await fetch(weatherUrl(course), { headers: { Accept: "application/json" } });
        if (!response.ok) {
          throw new Error("Weather forecast unavailable");
        }

        const payload = await response.json();
        const weatherDays = normaliseWeather(payload);
        if (!weatherDays.length) {
          throw new Error("Weather forecast unavailable");
        }

        updateCourse(courseId, { weatherLoading: false, weatherDays, weatherError: "" });
      } catch (error) {
        updateCourse(courseId, {
          weatherLoading: false,
          weatherError: "Weather forecast could not be loaded. Please try again later."
        });
      }

      render();
    }

    function isMobileMapsDevice() {
      const ua = navigator.userAgent || navigator.vendor || "";
      return /iPhone|iPad|iPod|Android/i.test(ua);
    }

    function isIOSDevice() {
      const ua = navigator.userAgent || navigator.vendor || "";
      return /iPhone|iPad|iPod/i.test(ua);
    }

    function ensureDirectionsModal() {
      let modal = document.getElementById("dgapi-directions-modal");
      if (modal) {
        return modal;
      }

      modal = document.createElement("div");
      modal.className = "dgapi-directions-modal";
      modal.id = "dgapi-directions-modal";
      modal.hidden = true;
      modal.innerHTML = `
        <div class="dgapi-directions-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="dgapi-directions-title" aria-describedby="dgapi-directions-subtitle">
          <h3 class="dgapi-directions-modal__title" id="dgapi-directions-title">Open directions</h3>
          <p class="dgapi-directions-modal__subtitle" id="dgapi-directions-subtitle"></p>
          <div class="dgapi-directions-modal__options" id="dgapi-directions-options"></div>
          <button type="button" class="dgapi-directions-modal__close" data-directions-close>Cancel</button>
        </div>
      `;
      document.body.appendChild(modal);
      return modal;
    }

    function closeDirectionsModal() {
      const modal = document.getElementById("dgapi-directions-modal");
      if (!modal) {
        return;
      }

      modal.hidden = true;
      document.body.classList.remove("dgapi-directions-modal-open");
    }

    function openDirectionsModal(course) {
      const urls = directionsUrls(course);
      if (!isMobileMapsDevice()) {
        window.open(urls.google, "_blank", "noopener");
        return;
      }

      const modal = ensureDirectionsModal();
      const subtitle = modal.querySelector("#dgapi-directions-subtitle");
      const options = modal.querySelector("#dgapi-directions-options");
      const choices = isIOSDevice()
        ? [["Apple Maps", urls.apple], ["Google Maps", urls.google], ["Waze", urls.waze]]
        : [["Google Maps", urls.google], ["Waze", urls.waze]];

      subtitle.textContent = course.name;
      options.innerHTML = choices.map(choice => `<a class="dgapi-directions-modal__option" href="${escapeHtml(choice[1])}" aria-label="Open ${escapeHtml(course.name)} in ${escapeHtml(choice[0])}">${escapeHtml(choice[0])}</a>`).join("");
      modal.hidden = false;
      document.body.classList.add("dgapi-directions-modal-open");

      const firstOption = options.querySelector("a");
      if (firstOption) {
        firstOption.focus();
      }
    }

    searchEl.addEventListener("input", event => {
      query = event.target.value;
      currentPage = 1;
      render();

      window.clearTimeout(postcodeTimer);
      if (isPostcodeLookup(query)) {
        postcodeTimer = window.setTimeout(() => lookupPostcode(query), 450);
      } else if (shouldLookupPlace(query)) {
        postcodeTimer = window.setTimeout(() => lookupPlace(query), 600);
      }
    });

    areaEl.addEventListener("change", event => {
      areaMode = event.target.value;
      userLocation = null;
      locationSearchKey = "";
      currentPage = 1;
      if (sort === "distance") {
        sort = "name";
        sortEl.value = "name";
      }
      loadCourses();
    });

    sortEl.addEventListener("change", event => {
      sort = event.target.value;
      currentPage = 1;
      if (sort === "distance" && !userLocation) {
        setStatus("Enter a postcode or use your location to sort by closest course.");
        sort = "name";
        sortEl.value = "name";
      }
      render();
    });

    nearMeEl.addEventListener("click", useBrowserLocation);

    listWrapEl.addEventListener("click", event => {
      const directionsButton = event.target.closest("[data-directions-course]");
      if (directionsButton) {
        const course = courses.find(item => item.id === directionsButton.getAttribute("data-directions-course"));
        if (course) {
          openDirectionsModal(course);
        }
        return;
      }

      const button = event.target.closest("[data-weather-course]");
      if (!button) {
        return;
      }

      const courseId = button.getAttribute("data-weather-course");
      openWeatherCourseId = openWeatherCourseId === courseId ? "" : courseId;
      render();

      if (openWeatherCourseId) {
        loadWeather(openWeatherCourseId);
      }
    });

    if (pageControlsEl) {
      pageControlsEl.addEventListener("click", event => {
        const button = event.target.closest("[data-page]");
        if (!button) {
          return;
        }

        const action = button.getAttribute("data-page");
        const visibleCourses = filteredCourses();
        const pages = Math.max(1, Math.ceil(visibleCourses.length / pageSize));

        if (action === "prev" && currentPage > 1) {
          currentPage -= 1;
          render();
        }

        if (action === "next" && currentPage < pages) {
          currentPage += 1;
          render();
        }
      });
    }

    document.addEventListener("click", event => {
      const modal = document.getElementById("dgapi-directions-modal");
      if (!modal || modal.hidden) {
        return;
      }

      if (event.target === modal || event.target.closest("[data-directions-close]")) {
        closeDirectionsModal();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeDirectionsModal();
      }
    });

    render();
    loadCourses().then(loadCourseBadges).then(() => {
      if (autoNearby) {
        useBrowserLocation();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDgapiCourseFinder);
  } else {
    initDgapiCourseFinder();
  }
}());
