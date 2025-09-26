import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;
const PPLX_API_KEY = process.env.PERPLEXITY_API_KEY;

app.use(cors()); // allow all origins for now
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.send("DocMatch Perplexity Proxy is running");
});

app.post("/api/compare", async (req, res) => {
  try {
    if (!PPLX_API_KEY) {
      return res.status(500).json({ error: "Missing PERPLEXITY_API_KEY" });
    }

    const { docA, docB, instructions } = req.body || {};
    if (!docA || !docB) {
      return res.status(400).json({ error: "docA and docB are required" });
    }

    const system = `
You are a banking SOP/approval-matrix reviewer. Compare two documents and produce a concise, structured table:
Columns: Section/Item | Doc A | Doc B | Difference | Severity (low/medium/high)
- Group by sections (headers, steps, approval levels).
- Be strict on numbers, roles, thresholds.
- Note multilingual mismatches (Khmer/English).
- Keep under 2,000 words.
`.trim();

    const user = `
Instructions: ${instructions || "Compare semantically and list key mismatches."}

--- Document A ---
${docA}

--- Document B ---
${docB}
`.trim();

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PPLX_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "pplx-70b-chat",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2
      })
    });

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content || JSON.stringify(json);
    res.status(200).json({ result: text });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Perplexity proxy running on http://localhost:${PORT}`);
});
