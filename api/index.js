import express from 'express'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path';
import { fileURLToPath } from 'url';

import { chatHandler } from './chatkit.js';

dotenv.config()
const { OPENAI_API_KEY, ORG_ID, WORKFLOW_ID } = process.env;

const app = express();
const port = 3000;

app.use(express.json())

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(express.static(path.join(__dirname, '../public')));

// Endpoint to create a ChatKit session and return a client secret
app.post('/api/chatkit/session', async (req, res) => {
  try {
    const session = await openai.beta.chatkit.sessions.create({
      user: ORG_ID, // A unique identifier for your user
      workflow: { id: WORKFLOW_ID },
      chatkit_configuration: {
        file_upload: {
          enabled: true,
          max_files: 10,
          max_file_size: 5, // 5MB
        },
      },
    });
    res.json({ client_secret: session.client_secret });
  } catch (error) {
    console.error('Error creating ChatKit session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/chatkit/refresh', async (req, res) => {
  const { currentClientSecret } = req.body;
  try {
    const session = await openai.beta.chatkit.sessions.refresh({
      client_secret: currentClientSecret,
    });
    res.json({ client_secret: session.client_secret });
  } catch (error) {
    console.error('Error refreshing ChatKit session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/chat', chatHandler(openai))

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
