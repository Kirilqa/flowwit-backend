export const EXTRACTION_PROMPT = `
You are a structured data extractor.
Based on the conversation provided, extract the final result and return it as a valid JSON object matching the required schema.
Return only the JSON object — no explanation, no markdown, no code blocks.
`.trim()
