export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: "ANTHROPIC_API_KEY not set" } } });
  }

  try {
    const {
      system, systemPrompt, userMessage, maxTokens,
      isPdf, pdfBase64,
      isImage, imageBase64, imageMediaType,  // single image (legacy)
      isImages, images,                       // multi-image: [{base64, mediaType}, ...]
    } = req.body;
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
    } else if (isImages && Array.isArray(images) && images.length > 0) {
      // Multi-image: send each as its own image block, then the text instruction last
      const content = images.map((im, i) => ({
        type: "image",
        source: { type: "base64", media_type: im.mediaType || "image/jpeg", data: im.base64 },
      }));
      content.push({ type: "text", text: userMessage });
      messages = [{ role: "user", content }];
    } else if (isImage && imageBase64) {
      messages = [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMediaType || "image/png", data: imageBase64 } },
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
        max_tokens: maxTokens || 16000,
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
    console.log("stop_reason:", data.stop_reason, "| length:", rawText.length, "| images:", images?.length || 0);

    let parsed = null;
    let parseError = null;
    try {
      let clean = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const fb = clean.indexOf("[");
      const lb = clean.lastIndexOf("]");
      if (fb >= 0 && lb > fb) {
        clean = clean.slice(fb, lb + 1);
      } else if (fb >= 0) {
        clean = clean.slice(fb);
      }
      try {
        parsed = JSON.parse(clean);
      } catch (_) {
        const lastObj = clean.lastIndexOf("}");
        if (lastObj > 0 && fb >= 0) {
          parsed = JSON.parse(clean.slice(0, lastObj + 1) + "]");
        } else {
          throw new Error("no recoverable array");
        }
      }
    } catch (e) {
      parseError = e.message;
      console.error("Server parse failed:", e.message, "| raw start:", rawText.substring(0, 200));
    }

    return res.status(200).json({
      ...data,
      parsedItems: parsed,
      parseError: parseError,
      wasTruncated: data.stop_reason === "max_tokens",
      rawText: rawText.substring(0, 2000),
    });

  } catch (err) {
    return res.status(200).json({ anthropicError: true, error: { error: { message: err.message } } });
  }
}
