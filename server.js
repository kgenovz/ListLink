const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const setupManifestRoutes = require('./routes/manifestRoutes');
const setupAuthRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const setupStreamRoutes = require('./routes/streamRoutes');

// Configuration
const PORT = process.env.PORT || 7000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Register routes
app.use(setupManifestRoutes(BASE_URL));
app.use(setupAuthRoutes(BASE_URL));
app.use(apiRoutes);
app.use(setupStreamRoutes(BASE_URL));

// Start server
app.listen(PORT, () => {
    console.log(`ListLink server running on ${BASE_URL}`);
    console.log(`Manifest URL: ${BASE_URL}/manifest.json`);
    console.log(`Configuration URL: ${BASE_URL}/configure`);
});
