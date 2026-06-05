export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: "ANTHROPIC_API_KEY not set" } } });
  }

  const keyPreview = process.env.ANTHROPIC_API_KEY.substring(0, 20) + "...";

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

    // Try all known model name formats newest first
    const models = [
      "claude-haiku-4-5",
      "claude-sonnet-4-5",
      "claude-3-5-haiku-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-20241022",
      "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307",
      "claude-3-sonnet-20240229",
    ];

    for (const model of models) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: maxTokens || 4000, system: sysContent, messages }),
      });

      const data = await r.json();
      console.log(`Model ${model}: status ${r.status}, type: ${data?.error?.type || "ok"}`);

      if (r.ok) {
        console.log("SUCCESS with model:", model);
        return res.status(200).json(data);
      }

      if (data?.error?.type === "not_found_error") continue; // try next model
      
      // Any other error — report it with full details
      const msg = `[${data?.error?.type}] ${data?.error?.message} (key: ${keyPreview}, model: ${model})`;
      return res.status(200).json({ anthropicError: true, error: { error: { message: msg } } });
    }

    return res.status(200).json({ 
      anthropicError: true, 
      error: { error: { message: `No working model found. Key: ${keyPreview}. Check Vercel logs for details.` } }
    });

  } catch (err) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: err.message } } });
  }
}
