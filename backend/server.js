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
app.post("/api/side-chat", async (req, res) => {
  try {
    const { message, fileContent } = req.body;

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
          model: "google/gemini-2.0-flash-lite-preview-02-05:free",
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

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Detailed error:", {
      message: error.message,
      stack: error.stack,
    });

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response text:", await error.response.text());
    }

    res.status(500).json({
      error: "Failed to process request",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
