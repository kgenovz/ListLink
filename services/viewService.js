const fs = require('fs');
const path = require('path');

const loadTemplate = (filename) => {
    return fs.readFileSync(path.join(__dirname, '..', 'views', filename), 'utf8');
};

const getConfigurePage = (baseUrl) => {
    return loadTemplate('configure.html').replace('{{BASE_URL}}', baseUrl);
};

const getSuccessPage = (listSlug) => {
    const displayName = listSlug === 'watchlist' ? 'Watchlist' : listSlug;
    return loadTemplate('success.html').replace('{{LIST_SLUG}}', displayName);
};

const getErrorPage = () => {
    return loadTemplate('error.html');
};

module.exports = {
    getConfigurePage,
    getSuccessPage,
    getErrorPage
};
