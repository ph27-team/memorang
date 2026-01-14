const { OPENAI_API_KEY } = process.env

export const createNewConvo = async (client, input) => {
  try {
    const { attachments, content } = input
    const updatedAttachments = attachments.length > 0 
      ? attachments.map(fileId => ({
          file_id: fileId,
        })) 
      : []
    const updatedContent = content.length > 0 
      ? content.map(item => ({
          type: "text",
          text: item.type === "input_text" ? item.text : ''
        })) 
      : []

    let message = {}

    if (content.length > 0 ) {
      message.type = content[0].type
      message.text = content[0].text
    }

    if (attachments.length > 0) {
      message.type = "input_file"
      message.file_id = updatedAttachments[0].file_id
    }

    const conversation = await client.conversations.create({
      items: [{
        type: "message",
        content: [message],
        role: "user",
      }]
    })

    // console.log('Thread with Message Created:', conversation.id)
    return conversation
  } catch (error) {
    console.error('Error creating thread:', error)
  }
}

export const updateThread = async (client, threadId, input) => {
  try {
    const { attachments, content } = input
  } catch (error) {
    console.error('Error updating thread:', error)
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
