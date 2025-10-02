const express = require('express');
const { decodeConfig } = require('../utils/config');
const { addItemToList } = require('../services/traktService');
const { addItemToMDBListWatchlist, addItemToMDBList } = require('../services/mdblistService');
const { getSuccessPage, getErrorPage } = require('../services/viewService');

const router = express.Router();

const setupStreamRoutes = (baseUrl) => {
    router.get('/:config/stream/:type/:id.json', (req, res) => {
        const config = decodeConfig(req.params.config);
        if (!config) {
            return res.status(400).json({ error: 'Invalid configuration' });
        }

        const { type, id } = req.params;

        try {
            const streams = config.lists.map(list => {
                const listIdentifier = typeof list === 'string' ? list : list.id;
                const listName = typeof list === 'string'
                    ? (list === 'watchlist' ? 'Watchlist' : list)
                    : list.name;
                const source = typeof list === 'string' ? 'trakt' : list.source;
                const prefix = source === 'mdblist' ? '[MDBList] ' : '[Trakt] ';

                return {
                    title: `Add to ${prefix}${listName}`,
                    externalUrl: `${baseUrl}/${req.params.config}/add/${type}/${id}/${listIdentifier}?source=${source}`
                };
            });

            res.json({ streams });
        } catch (error) {
            console.error('Error generating streams:', error);
            res.json({ streams: [] });
        }
    });

    router.get('/:config/add/:type/:id/:listSlug', async (req, res) => {
        const config = decodeConfig(req.params.config);
        if (!config) {
            return res.status(400).send('Invalid configuration');
        }

        const { type, id, listSlug } = req.params;
        const source = req.query.source || 'trakt';
        // Extract just the IMDB ID (for series, id format is tt1234567:season:episode)
        const imdbId = id.split(':')[0];

        try {
            if (source === 'mdblist') {
                const mediatype = type === 'movie' ? 'movie' : 'show';
                if (listSlug === 'watchlist') {
                    await addItemToMDBListWatchlist(config.mdblistApiKey, imdbId, mediatype);
                } else {
                    await addItemToMDBList(config.mdblistApiKey, listSlug, imdbId, mediatype);
                }
            } else {
                await addItemToList(config.accessToken, listSlug, type, imdbId);
            }
            res.send(getSuccessPage(listSlug));
        } catch (error) {
            console.error('Error adding to list:', error.response?.data || error.message);
            res.status(500).send(getErrorPage());
        }
    });

    return router;
};

module.exports = setupStreamRoutes;
