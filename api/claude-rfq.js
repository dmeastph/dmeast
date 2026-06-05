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

    const models = [
      "claude-haiku-4-5-20251001",
      "claude-haiku-4-5",
      "claude-sonnet-4-5",
      "claude-3-5-haiku-20241022",
      "claude-3-5-sonnet-20241022",
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
        // Log first 500 chars of response for debugging
        const rawText = data.content?.map(c => c.text || "").join("") || "";
        console.log("Response preview:", rawText.substring(0, 500));
        return res.status(200).json(data);
      }

      if (data?.error?.type === "not_found_error") continue;

      const msg = `[${data?.error?.type}] ${data?.error?.message}`;
      return res.status(200).json({ anthropicError: true, error: { error: { message: msg } } });
    }

    return res.status(200).json({
      anthropicError: true,
      error: { error: { message: "No working model found. Check Vercel logs." } }
    });

  } catch (err) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: err.message } } });
  }
}
