import React from 'react'
import { clearProfile, loadProfile } from '../utils/profileStorage'

export default function ProfileSummary({ profile, onEdit, onReset }) {
  const p = profile || loadProfile()

  if (!p) {
    return (
      <div className="onboard-card">
        <h2>No profile</h2>
        <p>No saved profile found.</p>
        <div>
          <button onClick={onEdit}>Start onboarding</button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboard-card">
      <h2>Your profile</h2>
      <div>
        <strong>Selected topics:</strong>
        <ul>
          {(p.selectedTopics || []).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div>
        <strong>Selected area:</strong> {p.selectedArea || '—'}
      </div>
      <div>
        <strong>Starting skill:</strong> {p.startingSkillEstimate} ({p.skillLabel})
      </div>
      <div>
        <strong>Preferences:</strong>
        <ul>
          <li>Lesson length: {p.preferences?.lessonLength}</li>
          <li>Style: {p.preferences?.stylePref}</li>
        </ul>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onEdit} style={{ marginRight: 8 }}>
          Edit
        </button>
        <button
          onClick={() => {
            clearProfile()
            onReset()
          }}
        >
          Reset profile
        </button>
      </div>
    </div>
  )
}
