const encodeConfig = (config) => {
    return Buffer.from(JSON.stringify(config)).toString('base64');
};

const decodeConfig = (encodedConfig) => {
    try {
        return JSON.parse(Buffer.from(encodedConfig, 'base64').toString());
    } catch (error) {
        return null;
    }
};

const createManifest = (baseUrl, username = null) => ({
    id: 'community.listlink',
    version: '1.0.0',
    name: username ? `ListLink (${username})` : 'ListLink',
    description: 'Add watched content to your Trakt.tv and MDBList lists',
    logo: `${baseUrl}/logo.png`,
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: [],
    behaviorHints: {
        configurable: true,
        configurationRequired: !username
    }
});

module.exports = {
    encodeConfig,
    decodeConfig,
    createManifest
};
