export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: "ANTHROPIC_API_KEY not set in Vercel env vars" } } });
  }

  // Show first 8 chars of key so we can verify it matches
  const keyPreview = process.env.ANTHROPIC_API_KEY.substring(0, 20) + "...";
  console.log("Using API key starting with:", keyPreview);

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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: maxTokens || 4000,
        system: sysContent,
        messages,
      }),
    });

    const data = await anthropicRes.json();
    console.log("Anthropic response status:", anthropicRes.status);
    console.log("Anthropic response:", JSON.stringify(data).substring(0, 300));

    if (!anthropicRes.ok) {
      // Return full error details to the frontend
      const errMsg = data?.error?.message || JSON.stringify(data);
      const errType = data?.error?.type || "unknown";
      return res.status(200).json({ 
        anthropicError: true, 
        error: { error: { message: `[${errType}] ${errMsg} (key: ${keyPreview})` } }
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(200).json({ anthropicError: true, error: { error: { message: err.message } } });
  }
}
