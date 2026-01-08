import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export default async function handler(req: any, res: any) {
  const body = req.body ?? {}

  const {
    messages = [],
    state = {},
    action, // present when a widget emits an action
  } = body

  let nextState = { ...state }

  // ---- HANDLE WIDGET ACTIONS ----
  if (action) {
    const { type, payload } = action

    switch (type) {
      case "quiz.submit": {
        const userAnswer = payload.answer
        const correctAnswer = payload.correctAnswer

        const isCorrect = userAnswer === correctAnswer

        nextState.showFeedback = true
        nextState.isCorrect = isCorrect

        break
      }

      case "quiz.next": {
        const nextIndex = state.current_question_index + 1

        nextState.current_question_index = nextIndex
        nextState.showFeedback = false
        nextState.isCorrect = false
        nextState.selectedValue = ""

        if (nextIndex >= state.total) {
          nextState.completed = true
        }

        break
      }

      case "quiz.retry": {
        nextState.showFeedback = false
        nextState.isCorrect = false
        nextState.selectedValue = ""
        break
      }
    }
  }

  // ---- RUN AGENT BUILDER ----
  const response = await client.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: `QUIZ_STATE:\n${JSON.stringify(nextState)}`,
          },
        ],
      },
      ...messages,
    ],
    metadata: {
      source: "vercel-quiz-runtime",
    },
  })

  res.status(200).json(response)
}