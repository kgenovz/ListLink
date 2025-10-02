const express = require('express');
const { decodeConfig, createManifest } = require('../utils/config');

const router = express.Router();

const setupManifestRoutes = (baseUrl) => {
    router.get('/manifest.json', (req, res) => {
        res.json(createManifest(baseUrl));
    });

    router.get('/:config/manifest.json', (req, res) => {
        const config = decodeConfig(req.params.config);
        if (!config) {
            return res.status(400).json({ error: 'Invalid configuration' });
        }
        res.json(createManifest(baseUrl, config.username || 'Configured'));
    });

    return router;
};

module.exports = setupManifestRoutes;
