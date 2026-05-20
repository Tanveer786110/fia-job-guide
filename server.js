const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// AI Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  const { topic, topicLabel, score, total, wrongQuestions } = req.body;

  if (!topic || score === undefined || !total) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const wrongSummary = (wrongQuestions || []).slice(0, 8)
    .map((q, i) => `${i+1}. Q: "${q.question}" — Chosen: "${q.chosen}" | Correct: "${q.correct}"`)
    .join('\n');

  const accuracy = Math.round((score / total) * 100);

  const prompt = `FIA exam coach. Student quiz result:
Topic: ${topicLabel}, Score: ${score}/${total} (${accuracy}%)
Wrong: ${wrongSummary || 'None'}

Reply in Roman Urdu. Max 150 words. Format:
📊 Summary: [1 line]
⚠️ Weak: [topics]
💡 Tips: [2 tips]
🎯 Message: [motivation]`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq error:', err);
      return res.status(502).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;
    res.json({ analysis, accuracy });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
