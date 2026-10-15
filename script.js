
"use strict";

// ==========================================
// NEARBY FINDER - FINAL JAVASCRIPT
// Real API search + labelled demo fallback
// ==========================================

const form = document.getElementById("searchForm");
const locationInput = document.getElementById("location");
const categoryInput = document.getElementById("category");
const radiusInput = document.getElementById("radius");
const sortInput = document.getElementById("sort");
const searchButton = document.getElementById("searchButton");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const resultCount = document.getElementById("resultCount");

let map = null;
let markerLayer = null;
let currentOrigin = null;
let currentPlaces = [];
let searchController = null;
let isSearching = false;
let usingDemoData = false;
let cooldownUntil = 0;

const geocodeCache = new Map();
const placesCache = new Map();

const categories = {
  hospital: { label: "Hospital", key: "amenity", value: "hospital" },
  library: { label: "Library", key: "amenity", value: "library" },
  restaurant: { label: "Restaurant", key: "amenity", value: "restaurant" },
  cafe: { label: "Cafe", key: "amenity", value: "cafe" },
  atm: { label: "ATM", key: "amenity", value: "atm" },
  pharmacy: { label: "Pharmacy", key: "amenity", value: "pharmacy" },
  park: { label: "Park", key: "leisure", value: "park" }
};

// Public OpenStreetMap data endpoints
const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

// ------------------------------------------
// General helpers
// ------------------------------------------

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function clearResults() {
  results.replaceChildren();
  resultCount.textContent = "0 places";
  currentPlaces = [];
}

function initMap() {
  if (typeof L === "undefined") {
    setStatus(
      "The map library could not load. Check your internet connection.",
      true
    );
    return false;
  }

  if (!map) {
    map = L.map("map").setView([12.9716, 77.5946], 12);

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    ).addTo(map);

    markerLayer = L.layerGroup().addTo(map);
  }

  return true;
}

initMap();

// ------------------------------------------
// Fetch JSON with useful error messages
// ------------------------------------------

async function fetchJSON(url, options = {}, service = "API") {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      service +
      " could not be reached. Check your internet connection or API availability."
    );
  }

  if (response.status === 429) {
    const error = new Error(
      service +
      " is rate-limiting requests. Please wait a few minutes."
    );
    error.rateLimited = true;
    throw error;
  }

  if (response.status === 403) {
    throw new Error(
      service +
      " denied access (HTTP 403). Try again later."
    );
  }

  if (!response.ok) {
    throw new Error(
      service + " returned HTTP " + response.status + "."
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(service + " returned invalid JSON.");
  }
}

// ------------------------------------------
// Geocode a location using Nominatim
// ------------------------------------------

async function geocode(place, signal) {
  const key = place.trim().toLowerCase();

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  const url = new URL(
    "https://nominatim.openstreetmap.org/search"
  );

  url.search = new URLSearchParams({
    q: place,
    format: "jsonv2",
    limit: "1"
  });

  const data = await fetchJSON(
    url.toString(),
    { signal },
    "Location search"
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Location not found. Try Bengaluru, India or a specific area."
    );
  }

  const origin = {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    name: data[0].display_name
  };

  if (
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(origin.lon)
  ) {
    throw new Error("Invalid coordinates received.");
  }

  geocodeCache.set(key, origin);
  return origin;
}

// ------------------------------------------
// Calculate distance with Haversine formula
// ------------------------------------------

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = value => value * Math.PI / 180;

  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) *
    Math.cos(rad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 6371 * 2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ------------------------------------------
// Search real places through Overpass
// ------------------------------------------

async function getPlaces(origin, category, radius, signal) {
  const cacheKey = [
    origin.lat.toFixed(4),
    origin.lon.toFixed(4),
    category,
    radius
  ].join("|");

  if (placesCache.has(cacheKey)) {
    return placesCache.get(cacheKey);
  }

  const selected = categories[category];

  const query = `
    [out:json][timeout:25];
    (
      node["${selected.key}"="${selected.value}"]
        (around:${radius},${origin.lat},${origin.lon});
      way["${selected.key}"="${selected.value}"]
        (around:${radius},${origin.lat},${origin.lon});
      relation["${selected.key}"="${selected.value}"]
        (around:${radius},${origin.lat},${origin.lon});
    );
    out center tags 60;
  `;

  let lastError = null;

  for (const endpoint of overpassEndpoints) {
    if (signal.aborted) {
      throw new DOMException("Request cancelled", "AbortError");
    }

    try {
      const data = await fetchJSON(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body: new URLSearchParams({ data: query }),
          signal
        },
        "Nearby places search"
      );

      if (!Array.isArray(data.elements)) {
        throw new Error("The API returned invalid place data.");
      }

      const places = data.elements.map(item => {
        const lat = Number(item.lat ?? item.center?.lat);
        const lon = Number(item.lon ?? item.center?.lon);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          return null;
        }

        const tags = item.tags || {};

        const address = [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:suburb"],
          tags["addr:city"]
        ].filter(Boolean).join(", ");

        return {
          name: tags.name || "Unnamed place",
          address: address || "Address unavailable",
          lat,
          lon,
          distance: distanceKm(
            origin.lat,
            origin.lon,
            lat,
            lon
          ),
          demo: false
        };
      }).filter(Boolean);

      placesCache.set(cacheKey, places);
      return places;

    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }

      lastError = error;

      // Respect server rate limits and access restrictions.
      if (
        error.rateLimited ||
        error.message.includes("HTTP 403")
      ) {
        throw error;
      }
    }
  }

  throw lastError ||
    new Error("Nearby places service is unavailable.");
}

// ------------------------------------------
// Labelled demo data for UI demonstration
// ------------------------------------------

function getDemoPlaces(origin, category, radius) {
  const selected = categories[category];

  const demoNames = {
    hospital: [
      "Demo City Hospital",
      "Demo Community Health Centre",
      "Demo Medical Clinic"
    ],
    library: [
      "Demo Public Library",
      "Demo Community Reading Room",
      "Demo Study Centre"
    ],
    restaurant: [
      "Demo Garden Restaurant",
      "Demo Family Restaurant",
      "Demo Food Corner"
    ],
    cafe: [
      "Demo Green Cafe",
      "Demo Coffee Corner",
      "Demo Garden Cafe"
    ],
    atm: [
      "Demo Bank ATM",
      "Demo Central ATM",
      "Demo Community ATM"
    ],
    pharmacy: [
      "Demo Health Pharmacy",
      "Demo Care Medical Store",
      "Demo Wellness Pharmacy"
    ],
    park: [
      "Demo Community Park",
      "Demo Green Garden",
      "Demo Recreation Park"
    ]
  };

  const names = demoNames[category] || ["Demo Place"];

  // Synthetic coordinates only; these are not real businesses.
  const offsets = [
    [0.004, 0.003],
    [-0.006, 0.004],
    [0.002, -0.008]
  ];

  const places = names.map((name, index) => {
    const [dLat, dLon] = offsets[index];

    const lat = origin.lat + dLat;
    const lon = origin.lon + dLon;

    return {
      name,
      address: "Illustrative demo result — not a verified address",
      lat,
      lon,
      distance: distanceKm(
        origin.lat,
        origin.lon,
        lat,
        lon
      ),
      demo: true,
      categoryLabel: selected.label
    };
  });

  return places.filter(place =>
    place.distance <= Number(radius) / 1000
  );
}

// ------------------------------------------
// Map links
// ------------------------------------------

function mapURL(place) {
  return (
    "https://www.openstreetmap.org/?mlat=" +
    encodeURIComponent(place.lat) +
    "&mlon=" +
    encodeURIComponent(place.lon) +
    "#map=17/" +
    encodeURIComponent(place.lat) +
    "/" +
    encodeURIComponent(place.lon)
  );
}

// ------------------------------------------
// Render cards and map markers
// ------------------------------------------

function renderResults() {
  results.replaceChildren();

  const sorted = [...currentPlaces];

  if (sortInput.value === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => a.distance - b.distance);
  }

  if (sorted.length === 0) {
    const empty = makeElement("div", "empty-state");

    empty.append(
      makeElement("div", "empty-icon", "⌖"),
      makeElement("h3", "", "No places found"),
      makeElement(
        "p",
        "",
        "Try another category or increase the search radius."
      )
    );

    results.appendChild(empty);
  }

  sorted.forEach(place => {
    const card = makeElement("article", "place-card");

    const title = makeElement(
      "h3",
      "place-title",
      place.name
    );

    const address = makeElement(
      "p",
      "place-address",
      place.address
    );

    const meta = makeElement("div", "place-meta");

    meta.append(
      makeElement(
        "span",
        "place-type",
        categories[categoryInput.value].label
      ),
      makeElement(
        "span",
        "place-distance",
        place.distance.toFixed(1) + " km away"
      )
    );

    if (place.demo) {
      const badge = makeElement(
        "p",
        "place-address",
        "DEMO DATA — NOT A REAL VERIFIED PLACE"
      );
      badge.style.color = "#a45b00";
      badge.style.fontWeight = "700";
      card.append(title, badge, address, meta);
    } else {
      card.append(title, address, meta);
    }

    const actions = makeElement("div", "place-actions");

    const link = makeElement(
      "a",
      "map-link",
      "View on map ↗"
    );

    link.href = mapURL(place);
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const share = makeElement(
      "button",
      "share-button",
      "Share"
    );

    share.type = "button";

    share.addEventListener("click", async () => {
      const shareText = place.name + "\n" + mapURL(place);

      try {
        if (navigator.share) {
          await navigator.share({
            title: place.name,
            text: shareText
          });
        } else if (
          navigator.clipboard &&
          window.isSecureContext
        ) {
          await navigator.clipboard.writeText(shareText);
          share.textContent = "Copied!";
        } else {
          window.prompt("Copy this place link:", shareText);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          window.prompt("Copy this place link:", shareText);
        }
      }
    });

    actions.append(link, share);
    card.appendChild(actions);
    results.appendChild(card);
  });

  resultCount.textContent =
    sorted.length +
    (sorted.length === 1 ? " place" : " places");

  if (initMap() && currentOrigin) {
    markerLayer.clearLayers();

    L.marker([currentOrigin.lat, currentOrigin.lon])
      .bindPopup("Searched location")
      .addTo(markerLayer);

    sorted.forEach(place => {
      const marker = L.marker([place.lat, place.lon]);

      marker.bindPopup(
        place.demo
          ? place.name + " — DEMO DATA"
          : place.name
      );

      marker.addTo(markerLayer);
    });

    if (sorted.length > 0) {
      const points = [
        [currentOrigin.lat, currentOrigin.lon],
        ...sorted.map(place => [place.lat, place.lon])
      ];

      map.fitBounds(L.latLngBounds(points), {
        padding: [25, 25],
        maxZoom: 15
      });
    } else {
      map.setView(
        [currentOrigin.lat, currentOrigin.lon],
        13
      );
    }

    setTimeout(() => map.invalidateSize(), 100);
  }
}

// ------------------------------------------
// Main search form
// ------------------------------------------

form.addEventListener("submit", async event => {
  event.preventDefault();

  const place = locationInput.value.trim();

  if (place.length < 2) {
    locationInput.setCustomValidity(
      "Enter at least two characters."
    );
    locationInput.reportValidity();
    return;
  }

  locationInput.setCustomValidity("");

  if (isSearching) {
    return;
  }

  if (Date.now() < cooldownUntil) {
    const seconds = Math.ceil(
      (cooldownUntil - Date.now()) / 1000
    );

    setStatus(
      "Please wait " + seconds +
      " seconds before trying again.",
      true
    );
    return;
  }

  isSearching = true;
  searchController = new AbortController();

  const signal = searchController.signal;

  clearResults();
  usingDemoData = false;

  searchButton.disabled = true;
  searchButton.textContent = "Searching...";

  setStatus("Searching for the location...");

  try {
    currentOrigin = await geocode(place, signal);

    setStatus("Searching for nearby places...");

    try {
      currentPlaces = await getPlaces(
        currentOrigin,
        categoryInput.value,
        Number(radiusInput.value),
        signal
      );

      renderResults();

      setStatus(
        currentPlaces.length
          ? "Found " + currentPlaces.length + " real OpenStreetMap results."
          : "No matching places found. Try another category or radius."
      );

    } catch (apiError) {
      if (apiError.name === "AbortError") {
        throw apiError;
      }

      if (apiError.rateLimited) {
        cooldownUntil = Date.now() + 120000;
      }

      currentPlaces = getDemoPlaces(
        currentOrigin,
        categoryInput.value,
        Number(radiusInput.value)
      );

      usingDemoData = true;
      renderResults();

      setStatus(
        "Real nearby-place data is unavailable. Showing clearly labelled DEMO results instead. " +
        apiError.message,
        true
      );
    }

  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    clearResults();

    setStatus(
      "Location search failed: " +
      (error.message || "Please try again."),
      true
    );

  } finally {
    isSearching = false;
    searchController = null;
    searchButton.disabled = false;
    searchButton.textContent = "Find places ↗";
  }
});

// ------------------------------------------
// Interactive sorting and filters
// ------------------------------------------

sortInput.addEventListener("change", () => {
  if (currentOrigin) {
    renderResults();
  }
});

categoryInput.addEventListener("change", () => {
  setStatus("Category changed. Search again to update results.");
});

radiusInput.addEventListener("change", () => {
  setStatus("Radius changed. Search again to update results.");
});

locationInput.addEventListener("input", () => {
  locationInput.setCustomValidity("");
});
