import React, { useState } from 'react'

export default function LearningPipeline() {
  const [topic, setTopic] = useState('Calculus')
  const [level, setLevel] = useState('beginner')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState(null)
  const [error, setError] = useState(null)

  async function runCycle() {
    setRunning(true)
    setError(null)
    setOutput(null)
    try {
      const userModel = { userId: 'ui-user', topic, level, mastery: {}, history: {}, curriculum: [] }
      const resp = await fetch('/api/runCycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userModel }),
      })
      const json = await resp.json()
      if (!json.ok) throw new Error(json.error || 'Unknown API error')
      setOutput(json.result)
    } catch (err) {
      setError(String(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="pipeline-card" style={{ marginTop: 24 }}>
      <h2>Run Learning Pipeline</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          Topic:{' '}
          <input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label>
          Level:{' '}
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <button onClick={runCycle} disabled={running}>
          {running ? 'Running…' : 'Run'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: 'crimson' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {output && (
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <section style={{ border: '1px solid #ddd', padding: 12 }}>
            <h3>Curriculum</h3>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
              {JSON.stringify(output.curriculum || output.result?.curriculum || output.subtopic?.curriculum || output, null, 2)}
            </pre>
          </section>

          <section style={{ border: '1px solid #ddd', padding: 12 }}>
            <h3>Lesson</h3>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
              {JSON.stringify(output.previousLesson || output.lesson || output.result?.previousLesson || {}, null, 2)}
            </pre>
          </section>

          <section style={{ border: '1px solid #ddd', padding: 12 }}>
            <h3>Quiz</h3>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
              {JSON.stringify(output.quiz || output.result?.quiz || {}, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </div>
  )
}
