const axios = require('axios');
require('dotenv').config();

const TRAKT_API_BASE = 'https://api.trakt.tv';
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;

const createTraktHeaders = (accessToken) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': TRAKT_CLIENT_ID
});

const exchangeCodeForToken = async (code, redirectUri) => {
    const response = await axios.post(`${TRAKT_API_BASE}/oauth/token`, {
        code,
        client_id: TRAKT_CLIENT_ID,
        client_secret: TRAKT_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    }, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};

const getTraktUsername = async (accessToken) => {
    const response = await axios.get(`${TRAKT_API_BASE}/users/me`, {
        headers: createTraktHeaders(accessToken)
    });
    return response.data.username;
};

const getUserLists = async (accessToken) => {
    const response = await axios.get(`${TRAKT_API_BASE}/users/me/lists`, {
        headers: createTraktHeaders(accessToken)
    });
    return response.data;
};

const addItemToList = async (accessToken, listSlug, type, imdbId) => {
    const itemData = { ids: { imdb: imdbId } };
    const payload = type === 'movie' ? { movies: [itemData] } : { shows: [itemData] };
    const endpoint = listSlug === 'watchlist'
        ? `${TRAKT_API_BASE}/sync/watchlist`
        : `${TRAKT_API_BASE}/users/me/lists/${listSlug}/items`;

    const response = await axios.post(endpoint, payload, {
        headers: createTraktHeaders(accessToken)
    });
    return response.data;
};

const getAuthUrl = (clientId, redirectUri, state) => {
    return `${TRAKT_API_BASE}/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
};

module.exports = {
    TRAKT_API_BASE,
    TRAKT_CLIENT_ID,
    exchangeCodeForToken,
    getTraktUsername,
    getUserLists,
    addItemToList,
    getAuthUrl
};
