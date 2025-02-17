# AI IDE

## Overview

This AI-powered IDE is a free and open-source code editor and compiler that allows users to write, run, and debug code in different programming languages. It features an integrated AI chat assistant, providing real-time coding support—similar to Cursor.

This IDE is a fork of the Judge0 IDE. It retains all the core features of the Judge0 IDE, such as support for multiple programming languages and a user-friendly interface for a seamless coding experience.

## Features

- **Multi-language Support**: Write and execute code in various programming languages including C++, Java, Python, and more.
- **Integrated AI Chat Assistant**: Receive real-time assistance and suggestions from an AI chatbot—accessible inline or via the side panel.
- **Multi-LLM Support**: Choose from various large language models (LLMs) to power the AI, tailoring responses to meet your specific needs.
- **Code Execution**: Run your code directly in the browser and view the output instantly.
- **File Management**: Open and save files easily with a simple interface.
- **Customizable Themes**: Switch between light and dark themes for a personalized coding environment.

## Installation

To set up the project, ensure you have Node.js and npm installed on your machine. Then, follow these steps:

1. Clone the repository:

   ```
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install the required backend dependencies:

   ```
   cd backend
   npm install
   ```

3. Create a `.env` file in the backend directory and add your API keys:

   ```
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. Start the backend server:

   ```bash
   node server.js
   ```

5. In a new terminal window, serve the frontend using a local development server:
   - Using Node.js (Cross-platform)
     ```bash
     npx http-server .
     ```
   - Using Python On MacOS/Linux:
     ```bash
     python3 -m http.server 8000
     ```
   - Using Python On Windows:
     ```bash
     python -m http.server 8000
     ```

## Usage

1. Navigate to the appropriate localhost URL based on your chosen serving method:

   - Node.js http-server: http://localhost:8080
   - Python http.server: http://localhost:8000

2. Select a programming language from the dropdown menu.

3. Write your code in the provided editor.

4. Use the AI chat assistant to ask questions or get help with your code.

5. Click the "Run Code" button to execute your code and view the output.

## File Descriptions

- **backend/server.js**: The server-side code that handles API requests and manages code execution.
- **js/ai.js**: JavaScript file containing the AI chat assistant logic and interactions.
- **js/theme.js**: Handles theme management and user interface styling.
- **index.html**: The main HTML file serving as the front-end of the web application.
- **css/ide.css**: Stylesheet for the IDE layout and components.

## Backend Dependencies

- **Express**: For building the web server and handling HTTP requests.
- **CORS**: For enabling Cross-Origin Resource Sharing in the server.
- **dotenv**: For loading environment variables from the `.env` file.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

---

## From Judge0

The following section contains the original README content from Judge0.

### About

[**Judge0 IDE**](https://ide.judge0.com) is a free and open-source online code editor that allows you to write and execute code from a rich set of languages. It's perfect for anybody who just wants to quickly write and run some code without opening a full-featured IDE on their computer. Moreover, it is also useful for teaching and learning or just trying out a new language.

Judge0 IDE is using [**Judge0**](https://ce.judge0.com) for executing the user's source code.

Visit https://ide.judge0.com, and enjoy happy coding. :)

### Community

Do you have a question, feature request, or something else on your mind? Or do you want to follow Judge0 news?

- [Subscribe to Judge0 newsletter](https://subscribe.judge0.com)
- [Join our Discord server](https://discord.gg/GRc3v6n)
- [Watch asciicasts](https://asciinema.org/~hermanzdosilovic)
- [Report an issue](https://github.com/judge0/judge0/issues/new)
- [Contact us](mailto:contact@judge0.com)
- [Schedule an online meeting with us](https://meet.judge0.com)

### Author and Contributors

Judge0 IDE was created by [Herman Zvonimir Došilović](https://github.com/hermanzdosilovic).

Thanks a lot to all [contributors](https://github.com/judge0/ide/graphs/contributors) for their contributions to this project.

### License

Judge0 IDE is licensed under the [MIT License](https://github.com/judge0/ide/blob/master/LICENSE).
