import { Readable } from "stream"
import { nanoid } from "nanoid"

const baseUrl = 'https://api.openai.com/v1/chatkit/'

export const createOrUpdateConvo = async (res, type, input, client_secret, threadId = null) => {
  try {
    const { attachments = [], content = [{id: nanoid(), text: ''}] } = input
    let payload = {
      type,
      params: {
        input: {
          content,
          quoted_text: "",
          attachments,
          inference_options: {},
        }
      }
    }

    if (threadId) payload.params.thread_id = threadId

    const result = await fetch(`${baseUrl}conversation`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${client_secret}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "Accept-Encoding": "gzip, deflate, br, zstd"
      },
      body: JSON.stringify(payload)
    })


    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const nodeStream = Readable.fromWeb(result.body)
    nodeStream.pipe(res)
    return
  } catch (error) {
    console.error('Error creating thread:', error)
  }
}

export const responseHandler = (client, { context = [] }) => async (req, res) => {
  const response = await client.responses.create({
    model: "gpt-4.1-nano",
    input: context,
  })

  // res.json(response)
  const outputText = response.output_text
      ?? response.output?.[0]?.content?.[0]?.text
      ?? ""

  return res.json({
    type: "messages.create",
    result: {
      object: "chatkit.thread_item",
      type: "chatkit.assistant_message",
      thread_id: req.body.params?.thread_id,
      content: [
        {
          type: "output_text",
          text: outputText,
        },
      ],
    },
  })
}

// https://api.openai.com/v1/chatkit/files
export const fileUploadHandler = (client) => async (req, res) => {
  const client_secret = req.cookies.chat_id

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([req.file.buffer], { id: nanoid(), type: req.file.mimetype }),
      req.file.originalname
    );

    const result = await fetch(`${baseUrl}files`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${client_secret}`,
      },
      body: formData,
    })

    const response = await result.json()
    res.json(response)
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({ error: "Failed to upload to OpenAI" })
  }
}
