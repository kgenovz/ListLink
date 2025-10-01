# Stremio Trakt Add-on

A Stremio add-on that allows you to automatically add watched content to your Trakt.tv lists.

## Features

- **OAuth Authentication**: Secure connection to your Trakt.tv account
- **Multiple List Support**: Add content to watchlist or custom lists
- **Configuration Interface**: Web-based setup with list selection
- **No Data Storage**: All user data passed via URL parameters
- **Easy Integration**: Works seamlessly with Stremio

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Create Trakt Application**:
   - Go to [Trakt API Apps](https://trakt.tv/oauth/applications)
   - Create a new application
   - Set redirect URI to: `http://localhost:7000/auth/trakt/callback`
   - Note your Client ID and Client Secret

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Trakt credentials:
   ```
   TRAKT_CLIENT_ID=your_client_id
   TRAKT_CLIENT_SECRET=your_client_secret
   BASE_URL=http://localhost:7000
   PORT=7000
   ```

4. **Start the Server**:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Usage

1. **Configure the Add-on**:
   - Visit `http://localhost:7000/configure`
   - Authenticate with Trakt
   - Select which lists you want to use
   - Copy the generated add-on URL

2. **Install in Stremio**:
   - Open Stremio
   - Go to Add-ons section
   - Paste your configured add-on URL
   - Install the add-on

3. **Add Content to Lists**:
   - Browse movies/shows in Stremio
   - Look for "Add to [List Name]" stream options
   - Click to add content to your selected Trakt lists

## How It Works

- The add-on creates stream links that trigger API calls to Trakt
- User authentication and list preferences are encoded in the add-on URL
- No server-side data storage - everything is stateless
- Each "stream" represents an action to add content to a specific list

## Development

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

## API Endpoints

- `GET /manifest.json` - Stremio add-on manifest
- `GET /configure` - Configuration interface
- `GET /auth/trakt` - Initiate Trakt OAuth
- `GET /:config/stream/:type/:id.json` - Generate streams for content
- `GET /:config/add/:type/:id/:listSlug` - Add content to list