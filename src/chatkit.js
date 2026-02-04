import dotenv from 'dotenv'
import { Readable } from "stream"
import { customAlphabet } from 'nanoid';
import { hexadecimalLowercase } from 'nanoid-dictionary';

import { createOrUpdateConvo, responseHandler } from './libs.js'
import { widgetUi } from "./widget.js"

dotenv.config()
const { ORG_ID } = process.env

export const chatHandler = (client) => async (req, res) => {
  const {
    params,
    type,
  } = req.body
  const {
    action,
    input,
    item_id,
    thread_id,
  } = params

  console.log("ChatKit action received:", type, params);
  const client_secret = req.cookies.chat_id

  switch (type) {
    case "threads.create": {
      const convo = await createOrUpdateConvo(res, type, input, client_secret)

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
      const convo = await createOrUpdateConvo(res, type, input, client_secret, params.thread_id)

      return convo
    }
    case "threads.custom_action": {
      const widget = handleCustomActions(action)
      const newId = () => {
        const id = `cti_${customAlphabet(hexadecimalLowercase, 48)()}`
        return id
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const payload = {
        type: "thread.item.done",
        item: {
          created_at: new Date().toISOString(),
          id: item_id ?? newId(),
          object: "chatkit.thread_item",
          type: "widget",
          thread_id,
          widget,
        }
      }

      res.write(`data: ${JSON.stringify(payload)}\n\n`)

      res.write(`data: ${JSON.stringify({
        type: "thread.item.end_of_turn",
        item: {
          id: newId(),
          object: "chatkit.thread_item",
          type: "end_of_turn",
          thread_id,
          created_at: new Date().toISOString()
        }
      })}\n\n`)


      res.flush?.()
      setTimeout(() => {
        res.end()
      }, 1000)
      return
    }
  }
}

const handleCustomActions = (action) => {
  if (action) {
    const {
      type,
      payload: { answer, ...state },
    } = action

    const {
      current_question_index,
      current_retry_count,
      questions,
      show_feedback,
    } = state

    let quiz_state = {
      current_question_index,
      current_retry_count,
      questions,
      show_feedback,
    }

    switch (type) {
      case "quiz.finish":
        quiz_state.completed = true

        return widgetUi(quiz_state)

      case "quiz.next":
        quiz_state.current_question_index += 1
        quiz_state.current_retry_count = 0
        quiz_state.disable_choices = false
        quiz_state.is_correct = false
        quiz_state.show_feedback = false
        quiz_state.show_submit_button = true

        return widgetUi(quiz_state)

      case "quiz.retry":
        quiz_state.disable_choices = false
        quiz_state.is_correct = false
        quiz_state.show_feedback = true
        quiz_state.show_submit_button = true

        return widgetUi(quiz_state)

      case "quiz.submit":
        let currentQuestion = questions[current_question_index]
        const isCorrect = currentQuestion.correct_choice_index === answer

        quiz_state.disable_choices = true
        quiz_state.is_correct = isCorrect
        quiz_state.show_feedback = true
        quiz_state.show_submit_button = false

        if (!isCorrect) {
          quiz_state.current_retry_count += 1

          const choices = currentQuestion.choices.map((choice, index) => ({
            ...choice,
            disabled: !!choice.disabled || index.toString() == answer,
          }))

          quiz_state.questions = questions.map((question, index) => ({
            ...question,
            choices: index === current_question_index ? choices : question.choices,
          }))
        }

        return widgetUi(quiz_state)

      default:

        return widgetUi(quiz_state)
    }
  }
}