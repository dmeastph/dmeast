export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check API key exists
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "ANTHROPIC_API_KEY environment variable is not configured" });
  }

  try {
    const { system, systemPrompt, userMessage, maxTokens, isPdf, pdfBase64 } = req.body;
    const sysContent = system || systemPrompt;

    if (!sysContent || !userMessage) {
      return res.status(400).json({ error: "Missing system or userMessage" });
    }

    // Build messages
    let messages;
    if (isPdf && pdfBase64) {
      messages = [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: userMessage },
        ],
      }];
    } else {
      messages = [{ role: "user", content: userMessage }];
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 4000,
        system: sysContent,
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error("Anthropic API error:", anthropicRes.status, JSON.stringify(data));
      // Pass the full error back so the frontend can show it
      return res.status(200).json({ 
        anthropicError: true,
        status: anthropicRes.status,
        error: data 
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
