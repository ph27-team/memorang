import { Readable } from "stream"
import { toFile } from 'openai'
// import multer from "multer";

// const upload = multer();

const baseUrl = 'https://api.openai.com/v1/chatkit/'

export const createOrUpdateConvo = async (res, type, input, client_secret, threadId = null) => {
  try {
    const { attachments = [], content } = input
    let payload = {
      type,
      params: {
        input: {
            content,
            quoted_text: "",
            attachments,
            inference_options: {}
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
    const reader = result.body.getReader();
const decoder = new TextDecoder();
  let buffer = ""; // Holds partial chunks between reads

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 1. Decode current binary chunk and add to buffer
    buffer += decoder.decode(value, { stream: true });

    // 2. Split buffer by the SSE double-newline delimiter
    const parts = buffer.split("\n\n");
    
    // 3. Process all complete events (keep the last partial one in the buffer)
    buffer = parts.pop(); 

    for (const part of parts) {
      if (part.startsWith("data: ")) {
        const jsonString = part.replace("data: ", "").trim();
        
        // Handle OpenAI's specific [DONE] signal
        if (jsonString === "[DONE]") return;

        try {
          const data = JSON.parse(jsonString);
          console.log("New Event Data:", data);
          // UI Update: Update your quiz component here
        } catch (e) {
          console.error("Error parsing SSE JSON:", e);
        }
      }
    }
  }
    // res.status(result.status)
    // res.setHeader("Cache-Control", "no-cache")
    // res.setHeader("Connection", "keep-alive")
    
    // const nodeStream = Readable.fromWeb(result.body)
    // nodeStream.pipe(res)
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
  console.log('client_secret', client_secret)

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname
    );
    formData.append("purpose", "assistants")

    // const file = await toFile(req.file.buffer, req.file.originalname)

    const result = await fetch(`${baseUrl}files`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${client_secret}`,
      },
      body: formData,
    })  

    const response = await result.json()
    console.log('results', response)

    res.json(response)
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({ error: "Failed to upload to OpenAI" })
  }
}