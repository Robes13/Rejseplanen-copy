let suggestions = [];

function getData(location) {
    location = location.replace(/ /g, '%20');
    let baseUrl = 'http://xmlopen.rejseplanen.dk/bin/rest.exe/';
    let locationQueryParam = 'location?input=';
    let apiURL = `${baseUrl}${locationQueryParam}${location}&format=json`;

    return fetch(apiURL)
        .then(response => response.json()) 
        .then(data => {
            console.log(data);

            if (data.LocationList && data.LocationList.StopLocation) {
                suggestions = data.LocationList.StopLocation.map(stop => stop.name);
            } else if (data.LocationList && data.LocationList.CoordLocation) {
                suggestions = data.LocationList.CoordLocation.map(coord => coord.name);
            }
            return suggestions;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            return [];
        });
}

document.addEventListener("DOMContentLoaded", function() {
    function setupAutocomplete(inputId, suggestionsId) {
        const inputElement = document.getElementById(inputId);
        const suggestionsElement = document.getElementById(suggestionsId);

        inputElement.addEventListener("input", async function() {
            const inputValue = this.value.trim();
            suggestionsElement.innerHTML = "";

            if (inputValue.length > 0) {
                await getData(inputValue);

                const filteredSuggestions = suggestions.filter(item =>
                    item.toLowerCase().includes(inputValue.toLowerCase())
                ).slice(0, 5);

                filteredSuggestions.forEach(suggestion => {
                    const suggestionElement = document.createElement("div");
                    suggestionElement.className = "autocomplete-suggestion";
                    suggestionElement.innerText = suggestion;
                    suggestionsElement.appendChild(suggestionElement);

                    suggestionElement.addEventListener("click", function() {
                        inputElement.value = suggestion;
                        suggestionsElement.innerHTML = "";
                    });
                });

                const inputRect = inputElement.getBoundingClientRect();
                suggestionsElement.style.width = `${inputRect.width}px`;
                suggestionsElement.style.top = `${inputRect.bottom + window.scrollY}px`;
                suggestionsElement.style.left = `${inputRect.left + window.scrollX}px`;
                suggestionsElement.style.display = "block";

                const windowHeight = window.innerHeight;
                const suggestionsHeight = suggestionsElement.offsetHeight;
                const inputBottom = inputRect.bottom + window.scrollY;

                if (inputBottom + suggestionsHeight > windowHeight) {
                    suggestionsElement.style.top = `${inputRect.top - suggestionsHeight}px`;
                }
            } else {
                suggestionsElement.style.display = "none";
            }
        });

        document.addEventListener("click", function(event) {
            if (event.target !== inputElement && event.target !== suggestionsElement) {
                suggestionsElement.style.display = "none";
            }
        });
    }

    setupAutocomplete("start-location", "start-location-suggestions");
    setupAutocomplete("destination", "destination-suggestions");
});


async function getLocationDetails(searchInput) {
    const fetchedDetails = await fetch(
        `https://xmlopen.rejseplanen.dk/bin/rest.exe/location?input=${searchInput}&format=json`
    );

    const fetchedDetailsJson = await fetchedDetails.json();

    let locationDetails = { name: '', id: 0, x: 0, y: 0 };
    const firstLocation = fetchedDetailsJson.LocationList.StopLocation ? fetchedDetailsJson.LocationList.StopLocation[0] : null;

    if (firstLocation) {
        locationDetails.name = firstLocation.name;
        locationDetails.id = firstLocation.id;
        locationDetails.x = firstLocation.x;
        locationDetails.y = firstLocation.y;
    }

    return locationDetails;
}

function displayTrips(trips) {
    const tripContainer = document.getElementById('trip-container');
    tripContainer.innerHTML = '';

    if (!trips || trips.length === 0) {
        tripContainer.innerHTML = '<p>No trips available.</p>';
        return;
    }

    trips.forEach((trip, tripIndex) => {
        const tripDiv = document.createElement('div');
        tripDiv.className = 'trip';

        const tripHeader = document.createElement('h2');
        tripHeader.innerText = `Rejsemulighed ${tripIndex + 1} med ${trip.Leg.length} skift`;
        tripDiv.appendChild(tripHeader);

        trip.Leg.forEach((leg, legIndex) => {
            const legDiv = document.createElement('div');
            legDiv.className = 'leg';

            const legHeader = document.createElement('h3');
            legHeader.innerText = `Skift ${legIndex + 1} - ${leg.type} (${leg.name})`;
            legDiv.appendChild(legHeader);

            const originTrack = leg.Origin.rtTrack ? ` <strong>(Spor ${leg.Origin.rtTrack})</strong>` : '';
            const destinationTrack = leg.Destination.rtTrack ? ` <strong>(Spor ${leg.Destination.rtTrack})</strong>` : '';

            const legDetails = document.createElement('p');
            legDetails.innerHTML = `
                <strong>Start:</strong> ${leg.Origin.name} (${leg.Origin.type}) at ${leg.Origin.time}, ${leg.Origin.date}${originTrack}<br>
                <strong>Slut:</strong> ${leg.Destination.name} (${leg.Destination.type}) at ${leg.Destination.time}, ${leg.Destination.date}${destinationTrack}<br>
                <strong>${leg.Notes.text}</strong><br>
            `;
            legDiv.appendChild(legDetails);

            tripDiv.appendChild(legDiv);
        });

        tripContainer.appendChild(tripDiv);
    });
}


async function newSearch() {
    const origin = document.getElementById("start-location").value;
    const destination = document.getElementById("destination").value;
    const triptime = document.getElementById("triptime").value;

    if (!origin || !destination || !triptime) {
        console.error('Error: Please provide all search inputs.');
        return;
    }

    const dateObj = new Date(triptime);

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(2);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    const formattedDate = `&date=${day}.${month}.${year}&time=${hours}:${minutes}`;

    const originDetails = await getLocationDetails(origin);
    const destinationDetails = await getLocationDetails(destination);

    if (originDetails.name && destinationDetails.name) {
        const fetchedDetails = await fetch(
            `https://xmlopen.rejseplanen.dk/bin/rest.exe/trip?originId=${originDetails.id}&destCoordX=${destinationDetails.x}&destCoordY=${destinationDetails.y}&destCoordName=${destinationDetails.name}${formattedDate}&format=json`
        );

        const fetchedDetailsJson = await fetchedDetails.json();

        const formattedJourneys = fetchedDetailsJson.TripList.Trip || [];

        console.log(formattedJourneys);

        displayTrips(formattedJourneys);
    } else {
        console.error('Error: Origin or destination details could not be fetched.');
    }
}
