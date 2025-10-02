const express = require('express');
const { getUserLists } = require('../services/traktService');
const { getMDBListUserLists } = require('../services/mdblistService');

const router = express.Router();

router.get('/api/user/lists', async (req, res) => {
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

router.get('/api/user/mdblist-lists', async (req, res) => {
    const apiKey = req.query.apikey;
    if (!apiKey) {
        return res.status(401).json({ error: 'No API key provided' });
    }

    try {
        const lists = await getMDBListUserLists(apiKey);
        res.json(lists);
    } catch (error) {
        console.error('Error fetching MDBList lists:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch MDBList lists' });
    }
});

module.exports = router;
