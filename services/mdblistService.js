const axios = require('axios');

const MDBLIST_API_BASE = 'https://api.mdblist.com';

const getMDBListUserLists = async (apiKey) => {
    const response = await axios.get(`${MDBLIST_API_BASE}/lists/user?apikey=${apiKey}`);
    return response.data;
};

const addItemToMDBListWatchlist = async (apiKey, imdbId, mediatype) => {
    const payload = mediatype === 'movie'
        ? { movies: [{ imdb: imdbId }] }
        : { shows: [{ imdb: imdbId }] };

    const response = await axios.post(
        `${MDBLIST_API_BASE}/watchlist/items/add?apikey=${apiKey}`,
        payload,
        {
            headers: { 'Content-Type': 'application/json' }
        }
    );
    return response.data;
};

const addItemToMDBList = async (apiKey, listId, imdbId, mediatype) => {
    const payload = mediatype === 'movie'
        ? { movies: [{ imdb: imdbId }] }
        : { shows: [{ imdb: imdbId }] };

    const response = await axios.post(
        `${MDBLIST_API_BASE}/lists/${listId}/items/add?apikey=${apiKey}`,
        payload,
        {
            headers: { 'Content-Type': 'application/json' }
        }
    );
    return response.data;
};

module.exports = {
    MDBLIST_API_BASE,
    getMDBListUserLists,
    addItemToMDBListWatchlist,
    addItemToMDBList
};
