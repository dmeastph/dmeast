// ─── Claude API helpers for DMEAST ──────────────────────────────────────────
//
// Extracted from src/App.jsx in Phase 1 of the refactor.
//
// Wraps the /api/claude-rfq Vercel serverless function. The serverless function
// itself handles authentication (ANTHROPIC_API_KEY stays server-side) and proxies
// requests to Anthropic's Messages API. This module is the thin client-side wrapper.
//
// RFQ-specific JSON post-processing (extracting line items from Claude's response)
// remains in App.jsx because it's domain logic, not API wrapping.
//
// Original location: App.jsx lines ~6689–6695 (pre-refactor).

/**
 * Call the Claude RFQ parsing endpoint.
 *
 * @param {object} requestBody - Payload for the API:
 *   {
 *     maxTokens: number,        // e.g. 16000
 *     system: string,           // system prompt
 *     isPdf: boolean,           // true if userMessage carries a PDF reference
 *     userMessage: string,      // prompt + RFQ content (text or base64)
 *     imageData?: string,       // optional base64 image (for image-based RFQs)
 *   }
 * @returns {Promise<object>} Full response object from /api/claude-rfq, which may include:
 *   - content:      array of {type, text} blocks (Anthropic's format)
 *   - parsedItems:  pre-parsed RFQ line items (if server-side parsing succeeded)
 *   - rawText:      raw text response from Claude
 *   - error / anthropicError: error indicators
 * @throws {Error} If the request fails or Anthropic returns an error.
 */
export async function callClaudeRFQ(requestBody) {
  const response = await fetch("/api/claude-rfq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const data = await response.json();

  if (data.anthropicError || (!data.content && data.error)) {
    const m = data.error?.error?.message || data.error || "API error";
    throw new Error(typeof m === "string" ? m : JSON.stringify(m));
  }

  return data;
}
