import { toFile } from 'openai'
import dotenv from 'dotenv'

import { createNewConvo, responseHandler } from './libs.js'

dotenv.config()
const { ORG_ID } = process.env

export const chatHandler = (client) => async (req, res) => {
  const { 
    action, 
    messages = [], 
    params, 
    type,
  } = req.body
  console.log('log event', type, params)

  let chatkitThread = null
  let history = []

  // 1. Handle Structural Thread Events (Proxy these to OpenAI)
  // This keeps your chat history and sessions alive
  try {
    switch (type) {
      case "threads.create": {
        const { inference_options, quoted_text, ...input } = params.input
        const convo = await createNewConvo(client, input)

        console.log('convo created', convo)
        // const aiResponse = await client.responses.create({
        //   model: "gpt-4o",
        //   store: true,
        //   conversation: convo.id,
        //   input: [
        //     ...params.input.content.map(c => ({ role: "user", content: c.text }))
        //   ]
        // });

        const result = {
          id: `cthr_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
          object: "chatkit.thread",
          created_at: Math.floor(Date.now() / 1000),
          status: { type: "active" },
          title: null,
          user: ORG_ID || "memorang",
        }

        return res.json({
          type: "threads.create",
          result,
        })
      }
      case "threads.list": {
        const threads = await client.beta.chatkit.threads.list({ 
          user: ORG_ID,
          limit: 100
        })

        const result = threads.body
        // {
        //   object: "list",
        //   has_more: false,
        //   data: [],
        // }

        return res.json({
          type: "threads.list",
          result,
        })

      }
      // case "threads.retrieve": {
      //   const threads = await client.beta.chatkit.threads.list({ 
      //     user: ORG_ID,
      //     limit: 100
      //   })

      //   return res.json({
      //     id: params.thread_id,
      //     object: "chatkit.thread",
      //     status: { type: "active" },
      //   })
      // }
    }
  } catch (err) {
    console.error(`Error handling ${type}:`, err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
  
  // 2. Handle Chat Messages and Actions
  if (action) {
    const { type, payload } = action

    // Extract quiz state from system message
    const quizStateMatch = messages
      .map((m) => m.content?.[0]?.text || "")
      .join("\n")
      .match(/<QUIZ_STATE>([\s\S]*?)<\/QUIZ_STATE>/)

    let quiz_state = quizStateMatch
      ? JSON.parse(quizStateMatch[1])
      : null

    if (!quiz_state) {
      return res.status(400).json({ error: "Missing QUIZ_STATE" })
    }

    const currentQuestionIndex = quiz_state.current_question_index
    const question = quiz_state.questions[currentQuestionIndex]


    switch (type) {
      case "quiz.submit": {
        const userAnswer = payload.answer
        const isCorrect = question.correct_choice_index === userAnswer

        quiz_state.isCorrect = isCorrect

        if (!isCorrect) {
          question.retry_count = Math.min(
            question.retry_count + 1,
            question.hints.length - 1
          )

          // Disable wrong choice and reset the questions
          const choices = question.choices.map((choice) => ({
            ...choice,
            disabled: choice.value === userAnswer
          }))

          question.choices = choices
          const updatedQuestions = quiz_state.questions
            .map((question, index) => index === currentQuestionIndex ? question : question)

          quiz_state.questions = updatedQuestions
        }

        quiz_state.showFeedback = true
        break
      }

      case "quiz.retry": {
        quiz_state.showFeedback = true
        quiz_state.isCorrect = false

        break
      }

      case "quiz.next": {
        quiz_state.current_question_index += 1
        quiz_state.showFeedback = false

        if (quiz_state.current_question_index + 1 >= quiz_state.total) {
          quiz_state.completed = true
        }

        break
      }
    }

    const content = [
      {
        type: "text",
        text: `<QUIZ_STATE>${JSON.stringify(quiz_state)}</QUIZ_STATE>`
      }
    ]
    return responseHandler(client, {content, messages})(req, res)
  }

  return responseHandler(client, {messages})(req, res)
}

export const fileUploadHandler = (client) => async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.')

    // 1. Upload the file to OpenAI
    const file = await client.files.create({
      file: await toFile(req.file.buffer, req.file.originalname),
      purpose: 'assistants',
    })

    // 2. Return the file_id. ChatKit will automatically 
    // include this in the next message to your /api/chat handler.
    res.json({ 
      id: file.id,
      file_id: file.id,
      mime_type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size,
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({ error: "Failed to upload to OpenAI" })
  }
}