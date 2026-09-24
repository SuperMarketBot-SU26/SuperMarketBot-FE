const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.SMB_ENV = {
    // In local dev, empty string uses the Vite proxy to avoid CORS.
    // On Vercel / production, direct to the Azure Cloud Backend.
    BE_URL: isLocal ? '' : 'https://smartmarketbot-api-d3achkeqhdcbfudw.southeastasia-01.azurewebsites.net'
};
