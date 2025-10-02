const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 7000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const TRAKT_API_BASE = 'https://api.trakt.tv';

// Manifest
const createManifest = (username = null) => ({
    id: 'community.trakt-adder',
    version: '1.0.0',
    name: username ? `Trakt List Adder (${username})` : 'Trakt List Adder',
    description: 'Add watched content to your Trakt.tv lists',
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

// HTML Templates
const getConfigurePage = () => `
<!DOCTYPE html>
<html>
<head>
    <title>Configure Trakt Add-on</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .step { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .list-item { margin: 5px 0; }
        #result { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Configure Trakt Add-on</h1>
    <div class="step">
        <h2>Step 1: Authenticate with Trakt</h2>
        <p>Click the button below to authenticate with your Trakt.tv account:</p>
        <a href="/auth/trakt" class="button">Connect to Trakt</a>
    </div>
    <div id="authenticated" style="display: none;">
        <div class="step">
            <h2>Step 2: Select Lists</h2>
            <p>Choose which lists you want to add content to:</p>
            <div id="lists"></div>
            <button onclick="generateAddonUrl()" class="button">Generate Add-on URL</button>
        </div>
        <div id="result" style="display: none;">
            <h3>Your Add-on URL:</h3>
            <p>Copy this URL and add it to Stremio:</p>
            <input type="text" id="addonUrl" readonly style="width: 100%; padding: 10px;">
        </div>
    </div>
    <script>
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('access_token')) {
            handleAuthSuccess(urlParams.get('access_token'), urlParams.get('username'));
        }
        function handleAuthSuccess(accessToken, username) {
            document.getElementById('authenticated').style.display = 'block';
            window.accessToken = accessToken;
            window.username = username;
            loadUserLists();
        }
        async function loadUserLists() {
            try {
                const response = await fetch('/api/user/lists', {
                    headers: { 'Authorization': 'Bearer ' + window.accessToken }
                });
                const lists = await response.json();
                displayLists(lists);
            } catch (error) {
                console.error('Error loading lists:', error);
            }
        }
        function displayLists(lists) {
            const listsContainer = document.getElementById('lists');
            listsContainer.innerHTML = \`
                <div class="list-item">
                    <label><input type="checkbox" value="watchlist" checked> Watchlist</label>
                </div>
            \`;
            lists.forEach(list => {
                listsContainer.innerHTML += \`
                    <div class="list-item">
                        <label><input type="checkbox" value="\${list.ids.slug}"> \${list.name}</label>
                    </div>
                \`;
            });
        }
        function generateAddonUrl() {
            const selectedLists = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            const config = {
                accessToken: window.accessToken,
                username: window.username,
                lists: selectedLists
            };
            const encodedConfig = btoa(JSON.stringify(config));
            const addonUrl = \`${BASE_URL}/\${encodedConfig}/manifest.json\`;
            document.getElementById('addonUrl').value = addonUrl;
            document.getElementById('result').style.display = 'block';
        }
    </script>
</body>
</html>
`;

const getSuccessPage = (listSlug) => `
<!DOCTYPE html>
<html>
<head>
    <title>Added to Trakt</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: green; font-size: 24px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Success!</h1>
    <div class="success">✓ Item added to ${listSlug === 'watchlist' ? 'Watchlist' : listSlug}</div>
    <p>You can close this window and return to Stremio.</p>
</body>
</html>
`;

const getErrorPage = () => `
<!DOCTYPE html>
<html>
<head>
    <title>Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: red; font-size: 24px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Error</h1>
    <div class="error">✗ Failed to add item to list</div>
    <p>Please try again later.</p>
</body>
</html>
`;

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
    const imdbId = id; // Keep the full IMDB ID including 'tt' prefix

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
    console.log(`Trakt Add-on server running on ${BASE_URL}`);
    console.log(`Manifest URL: ${BASE_URL}/manifest.json`);
    console.log(`Configuration URL: ${BASE_URL}/configure`);
});