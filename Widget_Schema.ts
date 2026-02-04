import { z } from "zod"

const Choice = z.strictObject({
  label: z.string().describe("text of the choice"),
  value: z.string().describe("index of the choice in the array"),
})

// Matches the "items" in Agent's "questions" array
const Question = z.strictObject({
  choices: z.array(Choice).describe("Answer choices for this question."),
  correct_choice_index: z.string().describe("0-based index of the correct answer."),
  explanation: z.string().describe("Detailed reason for the correct answer."),
  hints: z.array(z.string()),
  question_text: z.string().describe("The text of the question."),
})

const WidgetState = z.looseObject({
  completed: z.boolean().default(false),
  current_question_index: z.number().default(0),
  current_retry_count: z.number().default(0),
  is_correct: z.boolean().default(false),
  questions: z.array(Question),
  show_feedback: z.boolean().default(false),
  total: z.number(),
})

export default WidgetState