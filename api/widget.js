export const widgetUi = (quiz_state) => {
  const {
    completed = false,
    current_question_index = 0,
    current_retry_count = 0,
    disable_choices = false,
    is_correct = false,
    questions = [],
    show_feedback = false,
    show_submit_button = true,
  } = quiz_state

  const total = questions.length
  const normalizedIndex = current_question_index + 1
  const isLastQuestion = normalizedIndex === total
  const percent = `${((normalizedIndex) / total) * 100}%`
  const currentQuestion = questions[current_question_index]

  const HintChildren = [
    {
      "type": "Icon",
      "name": "info",
      "color": "warning"
    },
    {
      "type": "Text",
      "value": "Sorry, that's incorrect. Here's a hint:",
      "size": "sm",
      "weight": "semibold"
    }
  ]
  const Hints = currentQuestion?.hints
    .slice(0, current_retry_count)
    .reduce((accum, hint, index) => {
      const child = {
        key: `hint_${index}`,
        type: "Text",
        value: hint,
        size: "sm",
        color: "secondary"
      }

      return [...accum, {
        type: "Row",
        gap: 2,
        key: `${index}`,
        children: [child]
      }]
    }, HintChildren)

  const feedbackButtonText = is_correct
    ? isLastQuestion
      ? "Finish"
      : "Next question"
    : "Retry"

  const Header = {
    type: "Col",
    gap: 2,
    children: [
      {
        type: "Row",
        children: [
          {
            type: "Caption",
            key: "progress_text",
            value: `Question ${normalizedIndex} of ${total}`
          },
          {
            type: "Spacer"
          },
          {
            type: "Caption",
            key: "percent_text",
            value: percent,
            color: "tertiary"
          }
        ]
      },
      {
        type: "Box",
        height: 8,
        background: "alpha-10",
        radius: "full",
        padding: 0,
        children: [
          {
            type: "Box",
            height: "100%",
            key: "percent_bar",
            width: percent,
            background: "blue",
            radius: "full"
          }
        ]
      }
    ]
  }

  const Completed = {
    type: "Col",
    align: "center",
    gap: 4,
    padding: 4,
    children: [
      {
        type: "Box",
        background: "green-400",
        radius: "full",
        padding: 3,
        children: [
          {
            type: "Icon",
            name: "check-circle-filled",
            size: "3xl",
            color: "white"
          }
        ]
      },
      {
        type: "Title",
        value: "Great job! You're done.",
        size: "md"
      },
      {
        type: "Text",
        value: "You completed all questions from the PDF.",
        color: "secondary"
      },
      {
        type: "Spacer"
      },
      {
        type: "Text",
        value: "If you'd to try a new test, please upload a new PDF.",
        color: "secondary"
      }
    ]
  }

  const FeedbackButton = show_submit_button
    ? {
      type: "Button",
      submit: true,
      label: "Submit Answer",
      style: "primary"
    }
    : {
      type: "Button",
      label: feedbackButtonText,
      variant: isLastQuestion || is_correct ? "solid" : "outline",
      onClickAction: {
        type: isLastQuestion && is_correct
          ? "quiz.finish"
          : is_correct
          ? "quiz.next"
          : "quiz.retry",
        payload: {
          current_question_index,
          questions,
        }
      }
    }

  const FeedbackContent = is_correct
    ? [
      {
        type: "Icon",
        name: "check-circle",
        color: "success"
      },
      {
        type: "Text",
        value: "Correct!",
        size: "sm",
        weight: "semibold"
      },
      {
        type: "Text",
        key: "explanation",
        value: currentQuestion.explanation,
        size: "sm",
        color: "secondary"
      }
    ]
    : Hints

  const Feedback = {
    type: "Col",
    gap: 2,
    children: [
      {
        type: "Box",
        background: is_correct ? "green-100" : "yellow-100",
        radius: "sm",
        padding: 2,
        children: FeedbackContent
      },
      {
        type: "Row",
        children: [
          {
            type: "Spacer"
          },
          FeedbackButton
        ]
      }
    ]
  }

  const FormFooter = show_feedback
    ? Feedback
    : {
      type: "Row",
      children: [
        {
          type: "Spacer"
        },
        {
          type: "Button",
          submit: true,
          label: "Submit Answer",
          style: "primary"
        }
      ]
    }

  const Form = {
    type: "Form",
    onSubmitAction: {
      type: "quiz.submit",
      payload: {
        current_question_index,
        current_retry_count,
        questions,
      }
    },
    children: [
      {
        type: "Col",
        gap: 3,
        children: [
          {
            type: "Title",
            key: "question_title",
            value: currentQuestion.question_text,
            size: "md"
          },
          {
            type: "RadioGroup",
            key: "choices",
            name: "answer",
            options: questions[current_question_index].choices,
            direction: "col",
            disabled: disable_choices,
            defaultValue: '-1',
            required: true,
          },
          FormFooter
        ]
      }
    ]
  }

  const Content = completed
    ? Completed
    : Form

  return {
    type: "Card",
    size: "md",
    children: [
      Header,
      {
        type: "Divider",
        flush: true
      },
      Content
    ]
  }
}