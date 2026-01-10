import OpenAI from "openai"

export const chatHandler = (openai) => async (req, res) => {
  const { messages = [], action } = req.body

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

  if (action) {
    const { type, payload } = action

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
  }

  // Re-invoke agent with updated state
  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: `<QUIZ_STATE>${JSON.stringify(quiz_state)}</QUIZ_STATE>`,
          },
        ],
      },
      ...messages,
    ],
  })

  res.status(200).json(response)
}