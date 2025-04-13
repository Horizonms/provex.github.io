import * as L from 'leaflet';

// Form Elements
const userInfoForm = document.getElementById('userInfoForm');
const contractForm = document.getElementById('contractForm');
const userNameInput = document.getElementById('userName');
const userIdInput = document.getElementById('userId');
const userPhoneInput = document.getElementById('userPhone');
const countryCodeInput = document.getElementById('countryCode');
const submitUserInfoBtn = document.getElementById('submitUserInfoBtn');
const formErrorDisplay = document.getElementById('formError');

// Location Elements
const locationSection = document.getElementById('locationSection');
const locationTitle = document.getElementById('locationTitle');
const getLocationBtn = document.getElementById('getLocationBtn');
const statusDisplay = document.getElementById('status');
const coordinatesDisplay = document.getElementById('coordinates');
const accuracyDisplay = document.getElementById('accuracy');
const errorDisplay = document.getElementById('errorInfo');
const shareBtn = document.getElementById('shareBtn');
const mapContainer = document.getElementById('map'); // Get map container

// State Variables
let currentCoordinates = null; // Variable to store coordinates for sharing
let map = null; // Variable to hold the Leaflet map instance
let marker = null; // Variable to hold the Leaflet marker instance
let accuracyCircle = null; // Variable to hold the accuracy circle
let contractData = {}; // Object to store user info

// --- Form Handling ---
contractForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent actual form submission
    hideFormError(); // Hide previous form errors

    const name = userNameInput.value.trim();
    const id = userIdInput.value.trim();
    const phone = userPhoneInput.value.trim();
    const countryCode = countryCodeInput.value.trim();

    // Basic validation
    if (!name || !id || !phone) {
        showFormError('Todos los campos son obligatorios.');
        return;
    }

    // Validate phone format (simple check, allows optional +)
    const phonePattern = /^[1-9]\d{7,14}$/; // Allows digits, min 8 digits total
    if (!phonePattern.test(phone)) {
        showFormError('Número de teléfono inválido. Asegúrate de usar solo números (sin el código de país). Ejemplo: 4121234567');
        return;
    }

    // Store data - Combine country code and phone number
    contractData = { name, id, phone: countryCode + phone };

    // Hide form and show location section
    userInfoForm.style.display = 'none';
    locationSection.style.display = 'block';
    locationTitle.textContent = `Obtener Ubicación para ${contractData.name}`;

    // Reset location state if user goes back and forth
    resetLocationState();
});

function showFormError(message) {
    formErrorDisplay.textContent = message;
    formErrorDisplay.style.display = 'block';
}

function hideFormError() {
    formErrorDisplay.textContent = '';
    formErrorDisplay.style.display = 'none';
}

// --- Location Handling ---

// Function to initialize or update the map
function initOrUpdateMap(lat, lon, accuracy) {
    mapContainer.style.display = 'block'; // Show map container

    const zoomLevel = 16; // Adjust zoom level as needed

    if (!map) {
        // Initialize map
        map = L.map(mapContainer).setView([lat, lon], zoomLevel);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Add marker
        marker = L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>Ubicación de ${contractData.name || 'Cliente'}</b><br>Precisión: ${accuracy.toFixed(2)} m`)
            .openPopup();

        // Add accuracy circle
        accuracyCircle = L.circle([lat, lon], {
            radius: accuracy,
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.15
        }).addTo(map);

    } else {
        // Update map view, marker, and circle
        map.setView([lat, lon], map.getZoom() > zoomLevel ? map.getZoom() : zoomLevel); // Update view, maintain zoom if user changed it
        marker.setLatLng([lat, lon])
            .setPopupContent(`<b>Ubicación de ${contractData.name || 'Cliente'}</b><br>Precisión: ${accuracy.toFixed(2)} m`)
            .openPopup();
        accuracyCircle.setLatLng([lat, lon]);
        accuracyCircle.setRadius(accuracy);
    }

    // Ensure map tiles are loaded correctly after container resize/display change
    setTimeout(() => {
        if (map) { // Check if map still exists
           map.invalidateSize();
        }
    }, 100);
}

getLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        statusDisplay.textContent = 'La geolocalización no es soportada por tu navegador.';
        showError('La geolocalización no es soportada por tu navegador.');
        hideShareButton(); // Hide share button if geolocation not supported
        hideMap(); // Hide map if geolocation not supported
        return;
    }

    statusDisplay.textContent = 'Obteniendo ubicación...';
    coordinatesDisplay.textContent = '-';
    accuracyDisplay.textContent = '-';
    currentCoordinates = null; // Reset coordinates
    hideShareButton(); // Hide share button while fetching
    hideError(); // Hide previous errors
    // Don't hide map here, let success/error handle it

    const options = {
        enableHighAccuracy: true, // Request high accuracy
        timeout: 15000, // Maximum wait time (15 seconds)
        maximumAge: 0 // Force fresh position
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
});

shareBtn.addEventListener('click', () => {
    if (currentCoordinates && contractData.phone) {
        const { latitude, longitude } = currentCoordinates;
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

        // Format the message as a report
        const reportMessage = `*REPORTE DE CONTRATO*\n\n` +
                              `*Nombre:* ${contractData.name}\n` +
                              `*Cédula:* ${contractData.id}\n` +
                              `*Teléfono Contacto:* ${contractData.phone}\n\n` +
                              `*Ubicación Registrada:*\n` +
                              `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n` +
                              `Precisión: ${accuracyDisplay.textContent} metros\n\n` +
                              `*Ver en Mapa:* ${googleMapsUrl}\n\n` +
                              `(Generado por App de Ubicación)`;

        // Clean phone number for wa.me link (remove non-digits except leading +)
        const cleanPhoneNumber = contractData.phone.replace(/[^\d+]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(reportMessage)}`;

        window.open(whatsappUrl, '_blank'); // Open WhatsApp in a new tab
    } else if (!currentCoordinates) {
        showError("Primero obtén la ubicación para poder compartir el reporte.");
    } else {
         showError("No se encontró el número de teléfono del cliente. Regresa y completa la información.");
    }
});

function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    statusDisplay.textContent = 'Ubicación obtenida:';
    coordinatesDisplay.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    accuracyDisplay.textContent = accuracy.toFixed(2); // Show accuracy with 2 decimals

    // Store coordinates for sharing
    currentCoordinates = { latitude, longitude };

    // Initialize or update the map
    initOrUpdateMap(latitude, longitude, accuracy);

    showShareButton(); // Show the share button
    hideError(); // Hide any previous error message

    console.log('Latitude:', latitude);
    console.log('Longitude:', longitude);
    console.log('Accuracy:', accuracy);
}

function error(err) {
    statusDisplay.textContent = 'No se pudo obtener la ubicación.';
    coordinatesDisplay.textContent = '-';
    accuracyDisplay.textContent = '-';
    currentCoordinates = null; // Reset coordinates on error
    hideShareButton(); // Hide share button on error
    hideMap(); // Hide map on error
    let message = `ERROR(${err.code}): ${err.message}`;

    switch (err.code) {
        case err.PERMISSION_DENIED:
            message = "Permiso de ubicación denegado. Por favor, habilita el permiso en la configuración de tu navegador/dispositivo.";
            break;
        case err.POSITION_UNAVAILABLE:
            message = "La información de ubicación no está disponible en este momento. Asegúrate de tener buena señal GPS/Wi-Fi/móvil.";
            break;
        case err.TIMEOUT:
            message = "La solicitud para obtener la ubicación ha caducado. Inténtalo de nuevo, preferiblemente en un lugar con mejor señal.";
            break;
        case err.UNKNOWN_ERROR:
            message = "Un error desconocido ha ocurrido al intentar obtener la ubicación.";
            break;
    }
    showError(message);
    console.warn(message);
}

function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
}

function hideError() {
    errorDisplay.textContent = '';
    errorDisplay.style.display = 'none';
}

function showShareButton() {
    shareBtn.style.display = 'inline-block';
}

function hideShareButton() {
    shareBtn.style.display = 'none';
}

// Function to hide the map container
function hideMap() {
    mapContainer.style.display = 'none';
    // We don't destroy the map instance here to allow quick updates
    // if the user tries again without reloading the page.
}

// Function to reset location state (used when form is submitted)
function resetLocationState() {
    statusDisplay.textContent = 'Presiona el botón para obtener tu ubicación.';
    coordinatesDisplay.textContent = '-';
    accuracyDisplay.textContent = '-';
    currentCoordinates = null;
    hideShareButton();
    hideError();
    hideMap();
    // Destroy map instance if it exists to ensure fresh start for new user
    if (map) {
        map.remove();
        map = null;
        marker = null;
        accuracyCircle = null;
    }
}

// Initial setup: Hide location section
locationSection.style.display = 'none';