// Lightweight tolerant JSON extractor/parser for LLM outputs.
// Tries to extract JSON from fenced blocks or the first {..} block,
// then attempts simple repairs (remove trailing commas, normalize quotes)
// before parsing. Returns the parsed object or throws an informative error.

export function parseLLMJson(text) {
  if (!text && text !== '') throw new Error('No text provided to parseLLMJson')
  // If it's already an object, return it
  if (typeof text === 'object') return text

  const raw = String(text)

  // 1) Prefer content inside ```json or ``` fenced blocks
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  let candidate = fenceMatch ? fenceMatch[1].trim() : null

  // 2) Fallback: take from first { to last }
  if (!candidate) {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s !== -1 && e !== -1 && e > s) candidate = raw.slice(s, e + 1)
  }

  if (!candidate) {
    const snippet = raw.slice(0, 500)
    throw new Error(`No JSON-like block found in LLM output. Raw start: ${snippet}`)
  }

  // Try a straight parse first
  try {
    return JSON.parse(candidate)
  } catch (err) {
    // Attempt lightweight repairs
    let repaired = candidate

    // 1. Remove trailing commas before } or ]
    repaired = repaired.replace(/,\s*([}\]])/g, '$1')

    // 2. Replace smart quotes with straight quotes
    repaired = repaired.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")

    // 3. Replace single-quoted JSON property names or string values with double quotes
    //    This is a heuristic and may not be perfect.
    repaired = repaired.replace(/([:{\[,\s])'([^']*)'/g, '$1"$2"')

    // 4. Ensure property names are double-quoted: bareword: -> "bareword":
    repaired = repaired.replace(/([,{\s])([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":')

    // 5. Collapse repeated commas
    repaired = repaired.replace(/,\s*,/g, ',')

    try {
      const parsed = JSON.parse(repaired)
      console.warn('parseLLMJson: parsed after repairs')
      return parsed
    } catch (err2) {
      const snippet = repaired.slice(0, 1500)
      const message = `Failed to parse LLM JSON. First error: ${err.message}; After repairs: ${err2.message}. Candidate (repaired): ${snippet}`
      const e = new Error(message)
      e.candidate = repaired
      e.original = candidate
      throw e
    }
  }
}
