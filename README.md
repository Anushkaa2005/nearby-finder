# Nearby Finder 🌍

**Discover places around you with an interactive map.**

Nearby Finder is a web application designed to help users explore nearby places such as hospitals, libraries, restaurants, cafés, ATMs, pharmacies, and parks. It uses OpenStreetMap data to display locations and provides an interactive map with distance-based sorting.

## 📌 Project Overview

Finding useful places in an unfamiliar neighbourhood can be difficult. Nearby Finder provides a simple interface where users can enter a location, select a category, choose a search radius, and explore matching places on a map.

The application is built using HTML, CSS, and JavaScript, with Leaflet for map functionality and OpenStreetMap services for location search and nearby-place data.

## ✨ Features

- **Location Search:** Search for a city or neighbourhood.
- **Multiple Categories:** Find hospitals, libraries, restaurants, cafés, ATMs, pharmacies, and parks.
- **Custom Search Radius:** Choose between 1 km, 3 km, 5 km, and 10 km.
- **Interactive Map:** View locations on a map with markers.
- **Distance Calculation:** Calculate approximate distances using the Haversine formula.
- **Sorting Options:** Sort results by distance or name.
- **Place Details:** View available place names and address information.
- **Share Functionality:** Share or copy links to places.
- **Input Validation:** Validate location input before searching.
- **Error Handling:** Display messages for failed requests and unavailable services.
- **Demo Fallback:** Display clearly labelled illustrative demo results when nearby-place data is unavailable but the location search succeeds.
- **Responsive Design:** Adapt the interface for different screen sizes.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Structure of the application |
| CSS3 | Styling and responsive layout |
| JavaScript | Search logic, event handling, and data processing |
| Leaflet.js | Interactive map and markers |
| OpenStreetMap | Map tiles and geographic data |
| Nominatim API | Location geocoding |
| Overpass API | Searching nearby places |

## 📁 Project Structure

```text
Nearby-Finder/
├── index.html
├── style.css
├── script.js
└── README.md
```

## 🚀 How to Run the Project

### Prerequisites

- A modern web browser such as Google Chrome.
- Visual Studio Code or another code editor.
- An active internet connection.
- The Live Server extension for Visual Studio Code, or Python installed on your system.

### Method 1: Using Live Server

1. Download or clone this repository.
2. Open the project folder in Visual Studio Code.
3. Install the **Live Server** extension by Ritwick Dey.
4. Open `index.html`.
5. Right-click inside the editor and select **Open with Live Server**.
6. The application will open in your browser.
7. Enter a location, select a category and radius, and click **Find places**.

### Method 2: Using Python

Open a terminal in the project directory and run:

```bash
python -m http.server 8000
```

On some Windows systems, use:

```bash
py -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/index.html
```

Keep the terminal running while using the application.

## 🧭 How to Use

1. Enter a location, such as `Bengaluru, India`.
2. Select the category of places you want to discover.
3. Choose your preferred search radius.
4. Click **Find places**.
5. Browse the results and view the markers on the interactive map.
6. Sort places by distance or name.
7. Use **View on map** to open a place in OpenStreetMap.
8. Use **Share** to share a place link.

## 🔍 How It Works

1. The application sends the entered location to the Nominatim geocoding service.
2. The returned latitude and longitude are used as the search centre.
3. A query is sent to the Overpass API to retrieve OpenStreetMap features matching the selected category and radius.
4. JavaScript processes the returned JSON data and calculates approximate distances using the Haversine formula.
5. Results are sorted and displayed as cards.
6. Leaflet adds markers to the interactive map.
7. If nearby-place data cannot be retrieved, the application may show labelled demo results when geocoding succeeds.

## ⚠️ Limitations

- An internet connection is required for map tiles and online API requests.
- Public Nominatim and Overpass services may be unavailable, rate-limited, or restrict requests.
- Demo results are illustrative only and do not represent verified real-world businesses.
- The accuracy and completeness of results depend on OpenStreetMap data.
- Some places may have incomplete names or address details.
- Distance values represent approximate straight-line distances, not road or walking distances.
- The application does not currently provide turn-by-turn navigation, live traffic, or real-time business opening hours.
- A successful location search does not guarantee that nearby-place data will be available.

## 🧪 Testing

The following checks can be used to evaluate the application:

- Search for a valid city or neighbourhood.
- Test an invalid or empty location.
- Search using each available category.
- Change the search radius and verify the updated results.
- Sort results by distance and name.
- Verify that map markers correspond to displayed results.
- Test the Share and View on map actions.
- Test behaviour when an API request fails or returns no results.
- Verify that demo results are clearly identified as illustrative data.

Record the actual outcomes when testing the project.

## 🔮 Future Enhancements

- Add browser-based geolocation with user permission.
- Introduce more place categories and filters.
- Improve address and distance information.
- Add route planning and walking or driving directions.
- Improve API reliability using an appropriate backend or alternative data provider.
- Add automated tests and accessibility improvements.

## 👩‍💻 Author

**Anushkaa Agarwal**

MSc Artificial Intelligence and Machine Learning

Project: Nearby Finder

## 📄 License and Data Attribution

This project is intended for educational purposes.

Map data © OpenStreetMap contributors. OpenStreetMap data is available under the Open Database License (ODbL). Review the applicable terms and attribution requirements before distributing or deploying the application.

Leaflet is an open-source JavaScript library for interactive maps.

## 🤖 AI Usage Declaration

AI assistance was used to support code development, interface improvements, debugging, and documentation. The project author is responsible for reviewing, understanding, testing, and verifying the submitted implementation.
