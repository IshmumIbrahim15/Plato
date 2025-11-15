import React, { useState } from 'react'

export default function TopicSelector({ initial = {}, onNext }) {
  const topics = [
    'Intro to Python loops',
    'Functions & Modules',
    'Data Structures (Lists/Dicts)',
    'High school algebra',
    'Geometry basics',
    'Probability & Statistics',
  ]

  const areas = [
    { id: 'cs', name: 'Computer Science', topics: ['Intro to Python loops', 'Functions & Modules', 'Data Structures (Lists/Dicts)'] },
    { id: 'math', name: 'Mathematics', topics: ['High school algebra', 'Geometry basics', 'Probability & Statistics'] },
  ]

  const [selectedTopics, setSelectedTopics] = useState(initial.selectedTopics || [])
  const [selectedArea, setSelectedArea] = useState(initial.selectedArea || null)

  function toggleTopic(t) {
    setSelectedArea(null)
    setSelectedTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  function chooseArea(a) {
    setSelectedArea(a.id)
    setSelectedTopics(a.topics.slice())
  }

  return (
    <div className="onboard-card">
      <h2>Choose a topic or a broader area</h2>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h3>Topics</h3>
          {topics.map((t) => (
            <label key={t} style={{ display: 'block', margin: '6px 0' }}>
              <input
                type="checkbox"
                checked={selectedTopics.includes(t)}
                onChange={() => toggleTopic(t)}
              />{' '}
              {t}
            </label>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <h3>Areas</h3>
          {areas.map((a) => (
            <div key={a.id} style={{ margin: '8px 0' }}>
              <button
                type="button"
                onClick={() => chooseArea(a)}
                style={{ padding: '6px 10px' }}
              >
                {a.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <small>
          Tip: choose one or more specific topics, or pick a broader area to get a
          fuller curriculum.
        </small>
      </div>

      <div style={{ marginTop: 18 }}>
        <button
          onClick={() => onNext({ selectedTopics, selectedArea })}
          disabled={selectedTopics.length === 0}
        >
          Next
        </button>
      </div>
    </div>
  )
}
