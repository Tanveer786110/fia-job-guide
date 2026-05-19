const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/analyze", async (req, res) => {
  const { topicLabel, score, total, wrongQuestions } = req.body;

  const wrongList = wrongQuestions?.map(w =>
    `Q: ${w.question}\nTumhara jawab: ${w.chosen}\nSahi jawab: ${w.correct}`
  ).join('\n\n') || 'Koi galat jawab nahi.';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `FIA Sub-Inspector exam quiz result:
Topic: ${topicLabel}
Score: ${score}/${total}

Galat sawaal:
${wrongList}

Urdu mein short weakness analysis do aur improvement tips do. 5-6 lines mein.`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (analysis) {
      res.json({ analysis });
    } else {
      res.json({ analysis: "Analysis nahi aayi. Dobara try karein." });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
