<Card size="md">
  <Col gap={2}>
    <Row>
      <Caption key="progress_text" value={`Question ${current_question_index + 1} of ${questions.length}`} />
      <Spacer />
      <Caption key="percent_text" value={`${((current_question_index + 1) / questions.length) * 100}%`} color="tertiary" />
    </Row>
    <Box height={8} background="alpha-10" radius="full" padding={0}>
      <Box
        height="100%"
        key="percent_bar"
        width={`${((current_question_index + 1) / questions.length) * 100}%`}
        background="blue"
        radius="full"
      />
    </Box>
  </Col>
  <Divider flush />

  {completed ? (
    <Col align="center" gap={4} padding={4}>
      <Box background="green-400" radius="full" padding={3}>
        <Icon name="check-circle-filled" size="3xl" color="white" />
      </Box>
      <Title value="Great job! You're done." size="md" />
      <Text
        value="You completed all questions from the PDF."
        color="secondary"
      />
      <Spacer />
      <Text
        value="If you'd to try a new test, please upload a new PDF."
        color="secondary"
      />
    </Col>
  ) : (
    <Form
      onSubmitAction={{
        type: "quiz.submit",
        payload: {
          current_question_index,
          current_retry_count,
          questions,
        },
      }}
    >
      <Col gap={3}>
        {/* Dynamically pull the question based on the state index */}
        <Title
          key="question_title"
          value={questions[current_question_index].question_text}
          size="md"
        />

        <RadioGroup
          key="choices"
          name="answer"
          options={questions[current_question_index].choices}
          direction="col"
          disabled={disable_choices}
          defaultValue='-1'
          required={true}
        />

        {/* Conditionally show feedback and correct buttons */}
        {show_feedback ? (
          <Col gap={2}>
            <Box
              background={is_correct ? "green-100" : "yellow-100"}
              radius="sm"
              padding={2}
            >
              {is_correct ? (
                <>
                  <Icon name="check-circle" color="success" />
                  <Text value="Correct!" size="sm" weight="semibold" />
                </>
              ) : (
                <>
                  <Icon name="info" color="warning" />
                  <Text
                    value="Sorry, that's incorrect. Here's a hint:"
                    size="sm"
                    weight="semibold"
                  />
                </>
              )}

              {is_correct ? (
                <Text
                  key="explanation"
                  value={questions[current_question_index].explanation}
                  size="sm"
                  color="secondary"
                />
              ) : (
                questions[current_question_index].hints
                  .slice(0, current_retry_count)
                  .map((hint, index) => (
                    <Row gap={2} key={index}>
                      <Text key={`hint_${index}`} value={hint} size="sm" color="secondary" />
                    </Row>
                  ))
              )}
            </Box>

            <Row>
              <Spacer />
              {show_submit_button ? <Button submit label="Submit Answer" style="primary" />
                : is_correct ? (
                  <Button
                      label={(current_question_index + 1) === questions.length ? "Finish" : "Next question"}
                    onClickAction={{
                      type: (current_question_index + 1) === questions.length ? "quiz.finish" : "quiz.next",
                      payload: {
                        current_question_index,
                        questions,
                      },
                    }}
                  />
                ) : (
                  <Button
                    label="Retry"
                    variant="outline"
                    onClickAction={{
                      type: "quiz.retry",
                      payload: {
                        questions,
                      },
                    }}
                  />
                )
              }
            </Row>
          </Col>
        ) : (
          <Row>
            <Spacer />
            <Button submit label="Submit Answer" style="primary" />
          </Row>
        )}
      </Col>
    </Form>
  )}
</Card>