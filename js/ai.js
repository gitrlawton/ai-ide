import theme from "./theme.js";

export class AIChatHistory {
  constructor(editor) {
    this.sourceEditor = editor; // Store the editor reference
    this.messages = document.getElementById("judge0-chat-messages");
    this.form = document.getElementById("judge0-chat-form");
    this.input = document.getElementById("judge0-chat-user-input");

    // Initialize the dropdown with Semantic UI
    $(".ui.dropdown").dropdown();

    this.setupEventListeners();
    this.initializeChat();
  }

  setupEventListeners() {
    // Handle form submission
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sendMessage();
    });

    // Handle Enter key (but allow Shift+Enter for new lines)
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  createThinkingMessage() {
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = `
    align-self: flex-start;
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    font-size: 0.9em;
    color: ${!theme.isLight() ? "#999" : "#666"};
  `;

    // Create the thinking animation
    messageDiv.innerHTML = `
      <div class="thinking-animation">
        Generating response<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
      </div>
    `;

    return messageDiv;
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message) return;

    // Clear input and disable it while processing
    this.input.value = "";
    this.input.disabled = true;

    try {
      // Add user message to chat
      this.addUserMessage(message);

      // Add thinking message
      const thinkingDiv = this.createThinkingMessage();
      this.messages.appendChild(thinkingDiv);
      this.scrollToBottom();

      const fileContent = this.sourceEditor.getValue();
      const selectedModel = $("#judge0-llm-dropdown").dropdown("get value");
      console.log("Selected Model (ai.js): " + selectedModel);

      if (!selectedModel) {
        throw new Error(`Error: No model selected when sending message.`);
      }

      // Set up SSE connection
      const response = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          fileContent,
          llm: selectedModel,
        }),
      });

      // Remove thinking message once we start getting a response
      this.messages.removeChild(thinkingDiv);

      // Create a message container for the AI response
      const messageDiv = document.createElement("div");
      messageDiv.className = "ui label";
      if (!theme.isLight()) {
        messageDiv.classList.add("inverted");
      }
      this.messages.appendChild(messageDiv);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim() === "" || !line.startsWith("data: ")) continue;
          if (line.includes("[DONE]")) continue;

          try {
            const parsed = JSON.parse(line.replace(/^data: /, ""));
            if (parsed.choices?.[0]?.delta?.content) {
              const content = parsed.choices[0].delta.content;
              fullContent += content;

              // Update the message div with the accumulated content
              const cleanContent = DOMPurify.sanitize(
                marked.parse(fullContent)
              );
              messageDiv.innerHTML = cleanContent;
              this.scrollToBottom();
            }
          } catch (e) {
            console.error("Error parsing chunk:", e);
          }
        }
      }
    } catch (error) {
      // Remove thinking message if there's an error
      if (this.messages.contains(thinkingDiv)) {
        this.messages.removeChild(thinkingDiv);
      }
      console.error("Chat error:", error);
      this.addErrorMessage(
        "Sorry, there was an error processing your request."
      );
    } finally {
      // Re-enable input
      this.input.disabled = false;
      this.input.focus();
    }
  }

  addUserMessage(content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "ui label judge0-user-message";
    if (!theme.isLight()) {
      messageDiv.classList.add("inverted");
    }
    const cleanContent = DOMPurify.sanitize(marked.parse(content));
    messageDiv.innerHTML = cleanContent;
    this.messages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  addAIMessage(content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "ui label";
    if (!theme.isLight()) {
      messageDiv.classList.add("inverted");
    }

    // Process markdown content
    const cleanContent = DOMPurify.sanitize(marked.parse(content));
    messageDiv.innerHTML = cleanContent;

    this.messages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  addErrorMessage(content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "ui red label";
    if (!theme.isLight()) {
      messageDiv.classList.add("inverted");
    }
    messageDiv.textContent = content;
    this.messages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  updateTheme(isLight) {
    const elements = [
      document.getElementById("judge0-chat-container"),
      document.getElementById("judge0-chat-messages"),
      document.getElementById("judge0-chat-input-container"),
      document.getElementById("judge0-chat-user-input"),
    ];

    elements.forEach((element) => {
      if (element) {
        if (isLight) {
          element.classList.remove("inverted");
        } else {
          element.classList.add("inverted");
        }
      }
    });

    // Update existing message labels
    const labels = this.messages.querySelectorAll(".label");
    labels.forEach((label) => {
      if (isLight) {
        label.classList.remove("inverted");
      } else {
        label.classList.add("inverted");
      }
    });
  }

  initializeChat() {}
}
