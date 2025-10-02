const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 7000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const TRAKT_API_BASE = 'https://api.trakt.tv';

// Manifest
const createManifest = (username = null) => ({
    id: 'community.listlink',
    version: '1.0.0',
    name: username ? `ListLink (${username})` : 'ListLink',
    description: 'Add watched content to your Trakt.tv and MDBList lists',
    logo: `${BASE_URL}/logo.png`,
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: [],
    behaviorHints: {
        configurable: true,
        configurationRequired: !username
    }
});

// Utilities
const encodeConfig = (config) => Buffer.from(JSON.stringify(config)).toString('base64');

const decodeConfig = (encodedConfig) => {
    try {
        return JSON.parse(Buffer.from(encodedConfig, 'base64').toString());
    } catch (error) {
        return null;
    }
};

const createTraktHeaders = (accessToken) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': TRAKT_CLIENT_ID
});

// Trakt API Functions
const exchangeCodeForToken = async (code) => {
    const response = await axios.post(`${TRAKT_API_BASE}/oauth/token`, {
        code,
        client_id: TRAKT_CLIENT_ID,
        client_secret: TRAKT_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/auth/trakt/callback`,
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

// HTML Template Loaders
const loadTemplate = (filename) => {
    return fs.readFileSync(path.join(__dirname, 'views', filename), 'utf8');
};

const getConfigurePage = () => {
    return loadTemplate('configure.html').replace('{{BASE_URL}}', BASE_URL);
};

const getSuccessPage = (listSlug) => {
    const displayName = listSlug === 'watchlist' ? 'Watchlist' : listSlug;
    return loadTemplate('success.html').replace('{{LIST_SLUG}}', displayName);
};

const getErrorPage = () => {
    return loadTemplate('error.html');
};

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Manifest Routes
app.get('/manifest.json', (req, res) => {
    res.json(createManifest());
});

app.get('/:config/manifest.json', (req, res) => {
    const config = decodeConfig(req.params.config);
    if (!config) {
        return res.status(400).json({ error: 'Invalid configuration' });
    }
    res.json(createManifest(config.username || 'Configured'));
});

// Configuration Routes
app.get('/configure', (req, res) => {
    res.send(getConfigurePage());
});

// OAuth Routes
app.get('/auth/trakt', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `${TRAKT_API_BASE}/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(BASE_URL + '/auth/trakt/callback')}&state=${state}`;
    res.redirect(authUrl);
});

app.get('/auth/trakt/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization failed');
    }

    try {
        const { access_token } = await exchangeCodeForToken(code);
        const username = await getTraktUsername(access_token);
        res.redirect(`/configure?access_token=${access_token}&username=${username}`);
    } catch (error) {
        console.error('OAuth error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
});

// API Routes
app.get('/api/user/lists', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    try {
        const lists = await getUserLists(accessToken);
        res.json(lists);
    } catch (error) {
        console.error('Error fetching lists:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch lists' });
    }
});

// Stream Routes
app.get('/:config/stream/:type/:id.json', (req, res) => {
    const config = decodeConfig(req.params.config);
    if (!config) {
        return res.status(400).json({ error: 'Invalid configuration' });
    }

    const { type, id } = req.params;

    try {
        const streams = config.lists.map(listSlug => ({
            title: `Add to ${listSlug === 'watchlist' ? 'Watchlist' : listSlug}`,
            externalUrl: `${BASE_URL}/${req.params.config}/add/${type}/${id}/${listSlug}`
        }));

        res.json({ streams });
    } catch (error) {
        console.error('Error generating streams:', error);
        res.json({ streams: [] });
    }
});

app.get('/:config/add/:type/:id/:listSlug', async (req, res) => {
    const config = decodeConfig(req.params.config);
    if (!config) {
        return res.status(400).send('Invalid configuration');
    }

    const { type, id, listSlug } = req.params;
    // Extract just the IMDB ID (for series, id format is tt1234567:season:episode)
    const imdbId = id.split(':')[0];

    try {
        await addItemToList(config.accessToken, listSlug, type, imdbId);
        res.send(getSuccessPage(listSlug));
    } catch (error) {
        console.error('Error adding to list:', error.response?.data || error.message);
        res.status(500).send(getErrorPage());
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`ListLink server running on ${BASE_URL}`);
    console.log(`Manifest URL: ${BASE_URL}/manifest.json`);
    console.log(`Configuration URL: ${BASE_URL}/configure`);
});