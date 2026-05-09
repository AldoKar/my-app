import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Spotify Auth Routes ---
  
  app.get('/api/auth/url', (req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/callback`;
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private user-library-read user-top-read user-modify-playback-state';

    if (!clientId) {
      return res.status(500).json({ error: 'SPOTIFY_CLIENT_ID not configured' });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scope,
      show_dialog: 'true'
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/callback`;

    if (!code) {
      return res.status(400).send('No code provided');
    }

    try {
      const authOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
        },
        body: new URLSearchParams({
          code: code as string,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      };

      const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to exchange code for token');
      }

      // In a real app, you'd store this in a session. 
      // For this demo, we'll pass it back to the client via postMessage.
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  payload: ${JSON.stringify(data)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>DJ connected! You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging token:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Proxy for Spotify API requests to keep token secure if needed, 
  // though for a prototype we might just use the token on the client.
  // But let's build a small proxy for creating playlists to demonstrate safety.
  app.post('/api/spotify/create-playlist', async (req, res) => {
    const { accessToken, userId, name, description } = req.body;
    try {
      const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description, public: false })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create playlist' });
    }
  });

  // --- Vite / Production Serving ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GrooveEye DJ backend running at http://localhost:${PORT}`);
  });
}

startServer();
