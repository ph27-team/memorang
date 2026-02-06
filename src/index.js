import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import multer from 'multer'
import OpenAI from 'openai'
import { fileURLToPath } from 'url'

import { chatHandler } from './chatkit.js'
import { fileUploadHandler } from './libs.js'

dotenv.config()
const { OPENAI_API_KEY, ORG_ID, WORKFLOW_ID } = process.env

const app = express()
const port = 3000

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ limit: '5mb', extended: true }))
app.use(cookieParser())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

app.use(express.static(path.join(__dirname, '../public')))

const upload = multer({ storage: multer.memoryStorage() })

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
    })

    const client_secret = session.client_secret

    res.cookie('chat_id', client_secret, { httpOnly: true })
    res.json({ client_secret })
  } catch (error) {
    console.error('Error creating ChatKit session:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// New endpoint for 'direct' upload strategy
app.post('/api/chatkit/upload', upload.single('file'), async (req, res) => {
  fileUploadHandler(openai)(req, res)
})

app.post('/api/chat', chatHandler(openai))

app.listen(port, () => {
  console.log(`Server listening at ${port}`)
})
