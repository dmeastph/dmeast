export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const { system, systemPrompt, userMessage, maxTokens, isPdf, pdfBase64 } = req.body;
    const sysContent = system || systemPrompt;

    let messages;
    if (isPdf && pdfBase64) {
      messages = [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: userMessage },
        ],
      }];
    } else {
      messages = [{ role: "user", content: userMessage }];
    }

    // Try models in order from newest to oldest until one works
    const modelsToTry = [
      "claude-3-5-haiku-20241022",
      "claude-3-haiku-20240307",
      "claude-3-sonnet-20240229",
      "claude-3-opus-20240229",
    ];

    let lastError = null;
    for (const model of modelsToTry) {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens || 4000,
          system: sysContent,
          messages,
        }),
      });

      const data = await anthropicRes.json();

      if (anthropicRes.ok) {
        console.log("Used model:", model);
        return res.status(200).json(data);
      }

      // If model not found, try next
      const errType = data?.error?.type;
      if (errType === "not_found_error" || errType === "invalid_request_error") {
        lastError = data;
        continue;
      }

      // Other error (auth, rate limit, etc) — return immediately
      console.error("Anthropic error:", model, JSON.stringify(data));
      return res.status(200).json({ anthropicError: true, error: data });
    }

    // All models failed
    return res.status(200).json({ anthropicError: true, error: lastError });

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
