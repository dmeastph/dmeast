export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: "ANTHROPIC_API_KEY not set" } } });
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

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens || 8000,
        system: sysContent,
        messages,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = `[${data?.error?.type}] ${data?.error?.message}`;
      return res.status(200).json({ anthropicError: true, error: { error: { message: msg } } });
    }

    // Log the stop_reason so we can detect truncation
    console.log("stop_reason:", data.stop_reason, "| output length:", 
      (data.content?.map(c => c.text || "").join("") || "").length);

    return res.status(200).json(data);

  } catch (err) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: err.message } } });
  }
}
