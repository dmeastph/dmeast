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

    const rawText = data.content?.map(c => c.text || "").join("") || "";
    console.log("stop_reason:", data.stop_reason);
    console.log("RAW RESPONSE (first 1000 chars):", rawText.substring(0, 1000));

    // Parse JSON server-side so the frontend gets clean data
    let parsed = null;
    let parseError = null;
    try {
      let clean = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      // Find the array boundaries
      const firstBracket = clean.indexOf("[");
      const lastBracket = clean.lastIndexOf("]");
      if (firstBracket >= 0 && lastBracket > firstBracket) {
        clean = clean.slice(firstBracket, lastBracket + 1);
      }
      try {
        parsed = JSON.parse(clean);
      } catch (_) {
        // Salvage: cut at last complete object
        const lastObj = clean.lastIndexOf("}");
        if (lastObj > 0 && firstBracket >= 0) {
          const salvaged = clean.slice(0, lastObj + 1) + "]";
          parsed = JSON.parse(salvaged);
        } else {
          throw new Error("no recoverable array");
        }
      }
    } catch (e) {
      parseError = e.message;
      console.error("Server-side parse failed:", e.message);
    }

    // Return both the parsed data AND the raw text so frontend can use either
    return res.status(200).json({
      ...data,
      parsedItems: parsed,
      parseError: parseError,
      rawText: rawText,
    });

  } catch (err) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: err.message } } });
  }
}
