const express = require('express');
const crypto = require('crypto');
const { TRAKT_CLIENT_ID, exchangeCodeForToken, getTraktUsername, getAuthUrl } = require('../services/traktService');
const { getConfigurePage } = require('../services/viewService');

const router = express.Router();

const setupAuthRoutes = (baseUrl) => {
    router.get('/configure', (req, res) => {
        res.send(getConfigurePage(baseUrl));
    });

    router.get('/auth/trakt', (req, res) => {
        const state = crypto.randomBytes(16).toString('hex');
        const authUrl = getAuthUrl(TRAKT_CLIENT_ID, `${baseUrl}/auth/trakt/callback`, state);
        res.redirect(authUrl);
    });

    router.get('/auth/trakt/callback', async (req, res) => {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send('Authorization failed');
        }

        try {
            const { access_token } = await exchangeCodeForToken(code, `${baseUrl}/auth/trakt/callback`);
            const username = await getTraktUsername(access_token);
            res.redirect(`/configure?access_token=${access_token}&username=${username}`);
        } catch (error) {
            console.error('OAuth error:', error.response?.data || error.message);
            res.status(500).send('Authentication failed');
        }
    });

    return router;
};

module.exports = setupAuthRoutes;
