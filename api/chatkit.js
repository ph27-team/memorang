import dotenv from 'dotenv'
import { Readable } from "stream"
import { customAlphabet } from 'nanoid';
import { hexadecimalLowercase } from 'nanoid-dictionary';

import { createOrUpdateConvo, responseHandler, stateReducer } from './libs.js'

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
      const result = handleCustomActions(action)
      const newId = () => {
        const id = `cti_${customAlphabet(hexadecimalLowercase, 48)()}`
        return id
      }
const responseId = `resp_${customAlphabet(hexadecimalLowercase, 24)()}`;
      const payload = {
        type: "thread.item.done",
        item: {
          created_at: new Date().toISOString(),
          id: newId(),
          object: "chatkit.thread_item",
          type: "chatkit.widget",
          thread_id,
          widget: JSON.stringify({
            name: "Quiz_Widget",
            props: {
              ...result
            }
          })
        }
      }

      // const payload = {
      //   id: responseId,
      //   object: "chatkit.response", // Identify this as a response to the action
      //   status: "completed",
      //   output: [
      //     {
      //       type: "message",
      //       content: [
      //         {
      //           type: "text",
      //           text: "", // You can leave this empty if you only want the widget
      //           widget: {
      //             type: "chatkit.widget",
      //             schema: result // Assuming handleCustomActions returns the JSX/JSON string
      //           }
      //         }
      //       ]
      //     }
      //   ],
      //   // This is vital for syncing the state variables you've been working on
      //   update_state_variables: {
      //     ...result.updatedState 
      //   }
      // };

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.write(`data: ${JSON.stringify(payload)}\n\n`)

      res.end()
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
      questions,
      total,
    } = state

    let quiz_state = {
      ...state,
    }

    switch (type) {
      case "quiz.next": 
        quiz_state.current_question_index += 1
        quiz_state.current_retry_count = 0
        quiz_state.disable_choices = false
        quiz_state.is_correct = false
        quiz_state.showFeedback = false
        
        if (quiz_state.current_question_index >= total) {
          quiz_state.completed = true
        }
        
        return quiz_state
      
      case "quiz.retry": 
        quiz_state.disable_choices = false
        quiz_state.current_retry_count += 1
        
        return quiz_state
      
      case "quiz.submit": 
        let currentQuestion = questions[current_question_index]
        const isCorrect = currentQuestion.correct_choice_index === answer

        quiz_state.is_correct = isCorrect
        quiz_state.show_feedback = true
        quiz_state.disable_choices = true

        if (!isCorrect) {
          const choices = currentQuestion.choices.map((choice, index) => ({
            ...choice,
            disabled: choice.disabled === false 
              ? false 
              : index.toString() === answer,
          }))

          quiz_state.questions = questions.map((question, index) => ({
            ...question,
            choices: index === current_question_index ? choices : question.choices,
          }))
        }

        return quiz_state
      
      default:
        return quiz_state
    }
  }
}