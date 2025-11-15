import React, { useState } from 'react'

export default function DiagnosticQuiz({ selectedTopics = [], selectedArea = null, onBack, onComplete }) {
  const questions = [
    {
      id: 'q1',
      text: 'How comfortable are you with basic programming concepts (variables, loops)?',
      options: [
        { id: 'a', text: 'Not comfortable', points: 0 },
        { id: 'b', text: 'Somewhat comfortable', points: 1 },
        { id: 'c', text: 'Comfortable', points: 2 },
      ],
    },
    {
      id: 'q2',
      text: 'Can you read and understand short code snippets or algebra problems?',
      options: [
        { id: 'a', text: 'No', points: 0 },
        { id: 'b', text: 'Sometimes', points: 1 },
        { id: 'c', text: 'Yes', points: 2 },
      ],
    },
    {
      id: 'q3',
      text: 'Which learning format do you prefer?',
      options: [
        { id: 'a', text: 'Short bite-sized lessons', points: 1 },
        { id: 'b', text: 'Longer deep-dive lessons', points: 2 },
        { id: 'c', text: 'Combination', points: 1 },
      ],
    },
  ]

  const [answers, setAnswers] = useState({})
  const [lessonLength, setLessonLength] = useState('short')
  const [stylePref, setStylePref] = useState('examples')

  function setAnswer(qid, option) {
    setAnswers((s) => ({ ...s, [qid]: option }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    // compute score
    const totalPoints = questions.reduce((acc, q) => {
      const opt = answers[q.id]
      const pts = opt ? q.options.find((o) => o.id === opt).points : 0
      return acc + pts
    }, 0)

    const maxPoints = questions.reduce((acc, q) => acc + Math.max(...q.options.map((o) => o.points)), 0)
    const score = Math.round((totalPoints / maxPoints) * 100)

    const skillLabel = score < 40 ? 'Beginner' : score < 75 ? 'Intermediate' : 'Advanced'

    onComplete({
      startingSkillEstimate: score,
      skillLabel,
      preferences: { lessonLength, stylePref },
      selectedTopics,
      selectedArea,
    })
  }

  return (
    <form className="onboard-card" onSubmit={handleSubmit}>
      <h2>Quick diagnostic</h2>
      <p>Short quiz to estimate your starting level.</p>

      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>{q.text}</div>
          <div>
            {q.options.map((o) => (
              <label key={o.id} style={{ display: 'block', margin: '6px 0' }}>
                <input
                  type="radio"
                  name={q.id}
                  value={o.id}
                  checked={answers[q.id] === o.id}
                  onChange={() => setAnswer(q.id, o.id)}
                />{' '}
                {o.text}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <label>
            Preferred lesson length:{' '}
            <select value={lessonLength} onChange={(e) => setLessonLength(e.target.value)}>
              <option value="short">Short (5-10m)</option>
              <option value="long">Long (20-40m)</option>
            </select>
          </label>
        </div>

        <div>
          <label>
            Learning style:{' '}
            <select value={stylePref} onChange={(e) => setStylePref(e.target.value)}>
              <option value="examples">Examples & practice</option>
              <option value="theory">Theory & concepts</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={onBack} style={{ marginRight: 8 }}>
          Back
        </button>
        <button type="submit">Finish</button>
      </div>
    </form>
  )
}
