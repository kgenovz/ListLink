const fs = require('fs');
const path = require('path');

const loadTemplate = (filename) => {
    return fs.readFileSync(path.join(__dirname, '..', 'views', filename), 'utf8');
};

const getConfigurePage = (baseUrl) => {
    return loadTemplate('configure.html').replace('{{BASE_URL}}', baseUrl);
};

const getSuccessPage = (listSlug, type, id) => {
    const displayName = listSlug === 'watchlist' ? 'Watchlist' : listSlug;
    const imdbId = id.split(':')[0];
    const deeplink = buildStremioDeeplink(type, id, imdbId);

    return loadTemplate('success.html')
        .replace('{{LIST_SLUG}}', displayName)
        .replace('{{STREMIO_DEEPLINK}}', deeplink);
};

const getErrorPage = (type, id) => {
    const imdbId = id.split(':')[0];
    const deeplink = buildStremioDeeplink(type, id, imdbId);

    return loadTemplate('error.html')
        .replace('{{STREMIO_DEEPLINK}}', deeplink);
};

const buildStremioDeeplink = (type, id, imdbId) => {
    if (type === 'movie') {
        return `stremio:///detail/movie/${imdbId}/${imdbId}`;
    } else {
        // For series, id format is tt1234567:season:episode
        const parts = id.split(':');
        if (parts.length === 3) {
            return `stremio:///detail/series/${imdbId}/${id}`;
        } else {
            // If no season/episode info, just return the series detail page
            return `stremio:///detail/series/${imdbId}/${imdbId}`;
        }
    }
};

module.exports = {
    getConfigurePage,
    getSuccessPage,
    getErrorPage
};
