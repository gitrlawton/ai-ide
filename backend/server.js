require("dotenv").config();
const express = require("express");
const cors = require("cors");

console.log("API Key loaded:", process.env.OPENROUTER_API_KEY ? "Yes" : "No");

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

// Route to handle messages in side chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, fileContent, codeContext, llm } = req.body;

    // Construct the appropriate context based on what's provided
    const context = codeContext
      ? `Selected code:\n${codeContext}`
      : fileContent
        ? `File content:\n${fileContent}`
        : "No code context provided";

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI-IDE",
        },
        body: JSON.stringify({
          model: llm,
          stream: true, // Enable streaming
          messages: [
            {
              role: "system",
              content:
                "You are a helpful code assistant. The following is the context of the file the user is working on:",
            },
            {
              role: "system",
              content: fileContent || "No file content provided",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    // Stream the response back to the client
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        res.write("data: [DONE]\n\n");
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.includes("[DONE]")) continue;

        try {
          const cleanedLine = line.replace(/^data:\s*/, "").trim();
          if (!cleanedLine) continue;

          // Only try to parse if it looks like JSON
          if (cleanedLine.startsWith("{")) {
            const parsed = JSON.parse(cleanedLine);
            if (parsed.choices?.[0]?.delta?.content) {
              res.write(`data: ${JSON.stringify(parsed)}\n\n`);
            }
          } else {
            console.log("Skipping non-JSON line:", cleanedLine);
          }
        } catch (e) {
          console.error("Error parsing chunk:", e);
        }
      }
    }

    res.end();
  } catch (error) {
    console.error("Detailed error:", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
