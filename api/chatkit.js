import dotenv from 'dotenv'

import { createOrUpdateConvo, responseHandler } from './libs.js'

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

  const client_secret = req.cookies.chat_id

  switch (type) {
    case "threads.create": {
      const convo = await createOrUpdateConvo(res, type, params.input, client_secret)

      return convo
    }
    case "threads.list": {
      const threads = await client.beta.chatkit.threads.list({ 
        user: ORG_ID,
        limit: 100
      })

      const result = threads.body.data

      return res.json(result)
    }
    case "threads.add_user_message": {
      await createOrUpdateConvo(res, type, params.input, client_secret, params.thread_id)

      return
    }
    case "threads.custom_action": {
      handleCustomActions()
      // action = {type: 'quiz.submit', payload: {…}}
      // item_id = 'cti_696b33be85548194818f4909ad6de5e209e91027a98ee861'
      // thread_id = 'cthr_696b33a7eb0c81949a30f753d919adf309e91027a98ee861'
    }
  }
}

const handleCustomActions = (action) => {
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
}