import { IS_PUTER } from "./puter.js";

const API_KEY = ""; // Get yours at https://platform.sulu.sh/apis/judge0

const AUTH_HEADERS = API_KEY
  ? {
      Authorization: `Bearer ${API_KEY}`,
    }
  : {};

const CE = "CE";
const EXTRA_CE = "EXTRA_CE";

const AUTHENTICATED_CE_BASE_URL = "https://judge0-ce.p.sulu.sh";
const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://judge0-extra-ce.p.sulu.sh";

var AUTHENTICATED_BASE_URL = {};
AUTHENTICATED_BASE_URL[CE] = AUTHENTICATED_CE_BASE_URL;
AUTHENTICATED_BASE_URL[EXTRA_CE] = AUTHENTICATED_EXTRA_CE_BASE_URL;

const UNAUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var UNAUTHENTICATED_BASE_URL = {};
UNAUTHENTICATED_BASE_URL[CE] = UNAUTHENTICATED_CE_BASE_URL;
UNAUTHENTICATED_BASE_URL[EXTRA_CE] = UNAUTHENTICATED_EXTRA_CE_BASE_URL;

const INITIAL_WAIT_TIME_MS = 0;
const WAIT_TIME_FUNCTION = (i) => 100;
const MAX_PROBE_REQUESTS = 50;

var fontSize = 13;

var layout;

var sourceEditor;
var stdinEditor;
var stdoutEditor;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $runBtn;
var $statusLine;

var timeStart;

var sqliteAdditionalFiles;
var languages = {};

var layoutConfig = {
  settings: {
    showPopoutIcon: false,
    reorderEnabled: true,
  },
  content: [
    {
      type: "column",
      content: [
        {
          type: "row",
          content: [
            {
              type: "column",
              width: 66,
              content: [
                {
                  type: "component",
                  componentName: "source",
                  id: "source",
                  title: "Source Code",
                  isClosable: false,
                  componentState: {
                    readOnly: false,
                  },
                },
                {
                  type: "row",
                  height: 40,
                  content: [
                    {
                      type: "component",
                      componentName: "stdin",
                      id: "stdin",
                      title: "Input",
                      isClosable: false,
                      componentState: {
                        readOnly: false,
                      },
                    },
                    {
                      type: "component",
                      componentName: "stdout",
                      id: "stdout",
                      title: "Output",
                      isClosable: false,
                      componentState: {
                        readOnly: true,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: "component",
              width: 34,
              componentName: "chatbot",
              id: "chatbot",
              title: "IDE Chatbot",
              isClosable: false,
              componentState: {
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
  ],
};

var gPuterFile;

function encode(str) {
  return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
  var escaped = escape(atob(bytes || ""));
  try {
    return decodeURIComponent(escaped);
  } catch {
    return unescape(escaped);
  }
}

function showError(title, content) {
  $("#judge0-site-modal #title").html(title);
  $("#judge0-site-modal .content").html(content);

  let reportTitle = encodeURIComponent(`Error on ${window.location.href}`);
  let reportBody = encodeURIComponent(
    `**Error Title**: ${title}\n` +
      `**Error Timestamp**: \`${new Date()}\`\n` +
      `**Origin**: ${window.location.href}\n` +
      `**Description**:\n${content}`
  );

  $("#report-problem-btn").attr(
    "href",
    `https://github.com/judge0/ide/issues/new?title=${reportTitle}&body=${reportBody}`
  );
  $("#judge0-site-modal").modal("show");
}

function showHttpError(jqXHR) {
  showError(
    `${jqXHR.statusText} (${jqXHR.status})`,
    `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`
  );
}

function handleRunError(jqXHR) {
  showHttpError(jqXHR);
  $runBtn.removeClass("disabled");

  window.top.postMessage(
    JSON.parse(
      JSON.stringify({
        event: "runError",
        data: jqXHR,
      })
    ),
    "*"
  );
}

function handleResult(data) {
  const tat = Math.round(performance.now() - timeStart);
  console.log(`It took ${tat}ms to get submission result.`);

  const status = data.status;
  const stdout = decode(data.stdout);
  const compileOutput = decode(data.compile_output);
  const time = data.time === null ? "-" : data.time + "s";
  const memory = data.memory === null ? "-" : data.memory + "KB";

  $statusLine.html(`${status.description}, ${time}, ${memory} (TAT: ${tat}ms)`);

  const output = [compileOutput, stdout].join("\n").trim();

  stdoutEditor.setValue(output);

  $runBtn.removeClass("disabled");

  window.top.postMessage(
    JSON.parse(
      JSON.stringify({
        event: "postExecution",
        status: data.status,
        time: data.time,
        memory: data.memory,
        output: output,
      })
    ),
    "*"
  );
}

async function getSelectedLanguage() {
  return getLanguage(getSelectedLanguageFlavor(), getSelectedLanguageId());
}

function getSelectedLanguageId() {
  return parseInt($selectLanguage.val());
}

function getSelectedLanguageFlavor() {
  return $selectLanguage.find(":selected").attr("flavor");
}

function run() {
  if (sourceEditor.getValue().trim() === "") {
    showError("Error", "Source code can't be empty!");
    return;
  } else {
    $runBtn.addClass("disabled");
  }

  stdoutEditor.setValue("");
  $statusLine.html("");

  let x = layout.root.getItemsById("stdout")[0];
  x.parent.header.parent.setActiveContentItem(x);

  let sourceValue = encode(sourceEditor.getValue());
  let stdinValue = encode(stdinEditor.getValue());
  let languageId = getSelectedLanguageId();
  let compilerOptions = $compilerOptions.val();
  let commandLineArguments = $commandLineArguments.val();

  let flavor = getSelectedLanguageFlavor();

  if (languageId === 44) {
    sourceValue = sourceEditor.getValue();
  }

  let data = {
    source_code: sourceValue,
    language_id: languageId,
    stdin: stdinValue,
    compiler_options: compilerOptions,
    command_line_arguments: commandLineArguments,
    redirect_stderr_to_stdout: true,
  };

  let sendRequest = function (data) {
    window.top.postMessage(
      JSON.parse(
        JSON.stringify({
          event: "preExecution",
          source_code: sourceEditor.getValue(),
          language_id: languageId,
          flavor: flavor,
          stdin: stdinEditor.getValue(),
          compiler_options: compilerOptions,
          command_line_arguments: commandLineArguments,
        })
      ),
      "*"
    );

    timeStart = performance.now();
    $.ajax({
      url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=false`,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
      headers: AUTH_HEADERS,
      success: function (data, textStatus, request) {
        console.log(`Your submission token is: ${data.token}`);
        let region = request.getResponseHeader("X-Judge0-Region");
        setTimeout(
          fetchSubmission.bind(null, flavor, region, data.token, 1),
          INITIAL_WAIT_TIME_MS
        );
      },
      error: handleRunError,
    });
  };

  if (languageId === 82) {
    if (!sqliteAdditionalFiles) {
      $.ajax({
        url: `./data/additional_files_zip_base64.txt`,
        contentType: "text/plain",
        success: function (responseData) {
          sqliteAdditionalFiles = responseData;
          data["additional_files"] = sqliteAdditionalFiles;
          sendRequest(data);
        },
        error: handleRunError,
      });
    } else {
      data["additional_files"] = sqliteAdditionalFiles;
      sendRequest(data);
    }
  } else {
    sendRequest(data);
  }
}

function fetchSubmission(flavor, region, submission_token, iteration) {
  if (iteration >= MAX_PROBE_REQUESTS) {
    handleRunError(
      {
        statusText: "Maximum number of probe requests reached.",
        status: 504,
      },
      null,
      null
    );
    return;
  }

  $.ajax({
    url: `${UNAUTHENTICATED_BASE_URL[flavor]}/submissions/${submission_token}?base64_encoded=true`,
    headers: {
      "X-Judge0-Region": region,
    },
    success: function (data) {
      if (data.status.id <= 2) {
        // In Queue or Processing
        $statusLine.html(data.status.description);
        setTimeout(
          fetchSubmission.bind(
            null,
            flavor,
            region,
            submission_token,
            iteration + 1
          ),
          WAIT_TIME_FUNCTION(iteration)
        );
      } else {
        handleResult(data);
      }
    },
    error: handleRunError,
  });
}

function setSourceCodeName(name) {
  $(".lm_title")[0].innerText = name;
}

function getSourceCodeName() {
  return $(".lm_title")[0].innerText;
}

function openFile(content, filename) {
  clear();
  sourceEditor.setValue(content);
  selectLanguageForExtension(filename.split(".").pop());
  setSourceCodeName(filename);
}

function saveFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

async function openAction() {
  if (IS_PUTER) {
    gPuterFile = await puter.ui.showOpenFilePicker();
    openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
  } else {
    document.getElementById("open-file-input").click();
  }
}

async function saveAction() {
  if (IS_PUTER) {
    if (gPuterFile) {
      gPuterFile.write(sourceEditor.getValue());
    } else {
      gPuterFile = await puter.ui.showSaveFilePicker(
        sourceEditor.getValue(),
        getSourceCodeName()
      );
      setSourceCodeName(gPuterFile.name);
    }
  } else {
    saveFile(sourceEditor.getValue(), getSourceCodeName());
  }
}

function setFontSizeForAllEditors(fontSize) {
  sourceEditor.updateOptions({ fontSize: fontSize });
  stdinEditor.updateOptions({ fontSize: fontSize });
  stdoutEditor.updateOptions({ fontSize: fontSize });
}

async function loadLangauges() {
  return new Promise((resolve, reject) => {
    let options = [];

    $.ajax({
      url: UNAUTHENTICATED_CE_BASE_URL + "/languages",
      success: function (data) {
        for (let i = 0; i < data.length; i++) {
          let language = data[i];
          let option = new Option(language.name, language.id);
          option.setAttribute("flavor", CE);
          option.setAttribute(
            "langauge_mode",
            getEditorLanguageMode(language.name)
          );

          if (language.id !== 89) {
            options.push(option);
          }

          if (language.id === DEFAULT_LANGUAGE_ID) {
            option.selected = true;
          }
        }
      },
      error: reject,
    }).always(function () {
      $.ajax({
        url: UNAUTHENTICATED_EXTRA_CE_BASE_URL + "/languages",
        success: function (data) {
          for (let i = 0; i < data.length; i++) {
            let language = data[i];
            let option = new Option(language.name, language.id);
            option.setAttribute("flavor", EXTRA_CE);
            option.setAttribute(
              "langauge_mode",
              getEditorLanguageMode(language.name)
            );

            if (
              options.findIndex((t) => t.text === option.text) === -1 &&
              language.id !== 89
            ) {
              options.push(option);
            }
          }
        },
        error: reject,
      }).always(function () {
        options.sort((a, b) => a.text.localeCompare(b.text));
        $selectLanguage.append(options);
        resolve();
      });
    });
  });
}

async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
  monaco.editor.setModelLanguage(
    sourceEditor.getModel(),
    $selectLanguage.find(":selected").attr("langauge_mode")
  );

  if (!skipSetDefaultSourceCodeName) {
    setSourceCodeName((await getSelectedLanguage()).source_file);
  }
}

function selectLanguageByFlavorAndId(languageId, flavor) {
  let option = $selectLanguage.find(`[value=${languageId}][flavor=${flavor}]`);
  if (option.length) {
    option.prop("selected", true);
    $selectLanguage.trigger("change", { skipSetDefaultSourceCodeName: true });
  }
}

function selectLanguageForExtension(extension) {
  let language = getLanguageForExtension(extension);
  selectLanguageByFlavorAndId(language.language_id, language.flavor);
}

async function getLanguage(flavor, languageId) {
  return new Promise((resolve, reject) => {
    if (languages[flavor] && languages[flavor][languageId]) {
      resolve(languages[flavor][languageId]);
      return;
    }

    $.ajax({
      url: `${UNAUTHENTICATED_BASE_URL[flavor]}/languages/${languageId}`,
      success: function (data) {
        if (!languages[flavor]) {
          languages[flavor] = {};
        }

        languages[flavor][languageId] = data;
        resolve(data);
      },
      error: reject,
    });
  });
}

function setDefaults() {
  setFontSizeForAllEditors(fontSize);
  sourceEditor.setValue(DEFAULT_SOURCE);
  stdinEditor.setValue(DEFAULT_STDIN);
  $compilerOptions.val(DEFAULT_COMPILER_OPTIONS);
  $commandLineArguments.val(DEFAULT_CMD_ARGUMENTS);

  $statusLine.html("");

  loadSelectedLanguage();
}

function clear() {
  sourceEditor.setValue("");
  stdinEditor.setValue("");
  $compilerOptions.val("");
  $commandLineArguments.val("");

  $statusLine.html("");
}

function refreshSiteContentHeight() {
  const navigationHeight = document.getElementById(
    "judge0-site-navigation"
  ).offsetHeight;

  const siteContent = document.getElementById("judge0-site-content");
  siteContent.style.height = `${window.innerHeight}px`;
  siteContent.style.paddingTop = `${navigationHeight}px`;
}

function refreshLayoutSize() {
  refreshSiteContentHeight();
  layout.updateSize();
}

// Define messagesArea
const messagesArea = document.createElement("div");
messagesArea.id = "golden-chatbot-messages";
messagesArea.style.cssText =
  "height:100%; overflow-y:auto; display:flex; flex-direction:column;";

// Define addMessage function
function addMessage(sender, message, messageId = null, isThinking = false) {
  console.log(
    `Attempting to add message - Sender: ${sender}, Message: ${message}`
  );

  // Ensure messagesArea is set
  if (!messagesArea) {
    messagesArea = document.getElementById("messages-area");
  }

  // If messagesArea still not found, log error and return
  if (!messagesArea) {
    console.error("Messages area not found");
    return;
  }

  // Create message element
  const messageWrapper = document.createElement("div");
  if (messageId) {
    messageWrapper.id = messageId;
  }
  messageWrapper.style.cssText =
    "margin-bottom:10px; display:flex; flex-direction:column;";

  const senderElement = document.createElement("strong");
  senderElement.style.color = sender === "Me" ? "#007bff" : "#6c757d";
  senderElement.textContent = `${sender}:`;

  const messageElement = document.createElement("div");
  messageElement.style.cssText = `
      background-color: ${sender === "Me" ? "#e6f2ff" : "#f0f0f0"};
      padding: 8px;
      border-radius: 8px;
      max-width: 90%;
      word-wrap: break-word;
      white-space: pre-wrap;
  `;

  if (isThinking) {
    // Create thinking animation elements
    messageElement.textContent = "Thinking";
    const dots = document.createElement("span");
    dots.textContent = "...";
    dots.style.cssText = `
          display: inline-block;
          animation: blink 1.5s infinite;
          width: 20px;
          text-align: left;
      `;
    messageElement.appendChild(dots);

    // Add animation style if it doesn't exist
    if (!document.getElementById("blinkAnimation")) {
      const style = document.createElement("style");
      style.id = "blinkAnimation";
      style.textContent = `
              @keyframes blink {
                  0% { opacity: 0.2; }
                  20% { opacity: 1; }
                  100% { opacity: 0.2; }
              }
          `;
      document.head.appendChild(style);
    }
  } else {
    messageElement.textContent = message;
  }

  messageWrapper.appendChild(senderElement);
  messageWrapper.appendChild(messageElement);

  // Add to messages area
  messagesArea.appendChild(messageWrapper);

  // Scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;

  console.log("Message added. Total messages:", messagesArea.children.length);
}

window.addEventListener("resize", refreshLayoutSize);
document.addEventListener("DOMContentLoaded", async function () {
  $("#select-language").dropdown();
  $("[data-content]").popup({
    lastResort: "left center",
  });

  refreshSiteContentHeight();

  console.log(
    "Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!"
  );

  $selectLanguage = $("#select-language");
  $selectLanguage.change(function (event, data) {
    let skipSetDefaultSourceCodeName =
      (data && data.skipSetDefaultSourceCodeName) || !!gPuterFile;
    loadSelectedLanguage(skipSetDefaultSourceCodeName);
  });

  await loadLangauges();

  $compilerOptions = $("#compiler-options");
  $commandLineArguments = $("#command-line-arguments");

  $runBtn = $("#run-btn");
  $runBtn.click(run);

  $("#open-file-input").change(function (e) {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = function (e) {
        openFile(e.target.result, selectedFile.name);
      };

      reader.onerror = function (e) {
        showError("Error", "Error reading file: " + e.target.error);
      };

      reader.readAsText(selectedFile);
    }
  });

  $statusLine = $("#judge0-status-line");

  $(document).on("keydown", "body", function (e) {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case "Enter": // Ctrl+Enter, Cmd+Enter
          e.preventDefault();
          run();
          break;
        case "s": // Ctrl+S, Cmd+S
          e.preventDefault();
          save();
          break;
        case "o": // Ctrl+O, Cmd+O
          e.preventDefault();
          open();
          break;
        case "+": // Ctrl+Plus
        case "=": // Some layouts use '=' for '+'
          e.preventDefault();
          fontSize += 1;
          setFontSizeForAllEditors(fontSize);
          break;
        case "-": // Ctrl+Minus
          e.preventDefault();
          fontSize -= 1;
          setFontSizeForAllEditors(fontSize);
          break;
        case "0": // Ctrl+0
          e.preventDefault();
          fontSize = 13;
          setFontSizeForAllEditors(fontSize);
          break;
      }
    }
  });

  require(["vs/editor/editor.main"], function (ignorable) {
    layout = new GoldenLayout(layoutConfig, $("#judge0-site-content"));

    // Register source component
    layout.registerComponent("source", function (container, state) {
      sourceEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        scrollBeyondLastLine: true,
        readOnly: state.readOnly,
        language: "cpp",
        fontFamily: "JetBrains Mono",
        minimap: {
          enabled: true,
        },
      });

      sourceEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        run
      );
    });

    // Register chatbot component
    layout.registerComponent("chatbot", function (container, state) {
      // Create chatbot container
      const chatbotContainer = document.createElement("div");
      chatbotContainer.className = "chatbot-container";
      chatbotContainer.style.cssText =
        "height:100%; display:flex; flex-direction:column;";

      // Create messages area
      const messagesContainer = document.createElement("div");
      messagesContainer.style.cssText =
        "flex-grow:1; overflow-y:auto; padding:10px; background-color:#f0f0f0;";

      messagesContainer.appendChild(messagesArea);

      // Create input area
      const inputContainer = document.createElement("div");
      inputContainer.style.cssText =
        "display:flex; padding:10px; padding-bottom:30px; background-color:#e0e0e0; ";

      const inputField = document.createElement("input");
      inputField.id = "golden-chatbot-input";
      inputField.type = "text";
      inputField.placeholder = "Ask me anything...";
      inputField.style.cssText = "flex-grow:1; margin-right:10px;";

      const sendButton = document.createElement("button");
      sendButton.id = "golden-chatbot-send";
      sendButton.textContent = "Send";

      inputContainer.appendChild(inputField);
      inputContainer.appendChild(sendButton);

      // Assemble the chatbot container
      chatbotContainer.appendChild(messagesContainer);
      chatbotContainer.appendChild(inputContainer);

      // Add to Golden Layout container
      container.getElement()[0].appendChild(chatbotContainer);

      // Debugging log
      console.log("Chatbot DOM elements:", {
        container: !!chatbotContainer,
        messagesArea: !!messagesArea,
        inputField: !!inputField,
        sendButton: !!sendButton,
      });

      // Send button click handler
      sendButton.addEventListener("click", function () {
        console.log("Send button clicked");
        const message = inputField.value.trim();
        console.log("Message value:", message);

        if (message) {
          // Get the current editor's content
          const fileContent = sourceEditor.getValue();

          // Add user message
          addMessage("Me", message);

          // Clear input
          inputField.value = "";

          // Add thinking message with a unique ID
          const thinkingId = "thinking-" + Date.now();
          addMessage("Judge0", "", thinkingId, true); // Pass true for isThinking

          // Send message to OpenRouter API
          fetch("http://localhost:3000/api/side-chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: message,
              fileContent: fileContent,
            }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Network response was not ok");
              }
              return response.json();
            })
            .then((data) => {
              // Remove thinking message
              const thinkingMessage = document.getElementById(thinkingId);
              if (thinkingMessage) {
                thinkingMessage.remove();
              }

              // Extract the AI's response and add it
              const aiResponse = data.choices[0].message.content;
              addMessage("Judge0", aiResponse);
            })
            .catch((error) => {
              // Remove thinking message
              const thinkingMessage = document.getElementById(thinkingId);
              if (thinkingMessage) {
                thinkingMessage.remove();
              }

              console.error("Error:", error);
              addMessage(
                "Judge0",
                "Sorry, I encountered an error processing your message."
              );
            });
        } else {
          console.log("Empty message, not adding");
        }
      });

      // Enter key handler
      inputField.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          sendButton.click();
        }
      });

      console.log("Chatbot component fully initialized");
    });

    // Register stdin component
    layout.registerComponent("stdin", function (container, state) {
      stdinEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly: state.readOnly,
        language: "plaintext",
        fontFamily: "JetBrains Mono",
        minimap: {
          enabled: false,
        },
      });
    });

    // Register stdout component
    layout.registerComponent("stdout", function (container, state) {
      stdoutEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly: state.readOnly,
        language: "plaintext",
        fontFamily: "JetBrains Mono",
        minimap: {
          enabled: false,
        },
      });
    });

    layout.on("initialised", function () {
      setDefaults();
      refreshLayoutSize();
      window.top.postMessage({ event: "initialised" }, "*");
    });

    layout.init();
  });

  let superKey = "⌘";
  if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
    superKey = "Ctrl";
  }

  [$runBtn].forEach((btn) => {
    btn.attr("data-content", `${superKey}${btn.attr("data-content")}`);
  });

  document.querySelectorAll(".description").forEach((e) => {
    e.innerText = `${superKey}${e.innerText}`;
  });

  if (IS_PUTER) {
    puter.ui.onLaunchedWithItems(async function (items) {
      gPuterFile = items[0];
      openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
    });
  }

  document
    .getElementById("judge0-open-file-btn")
    .addEventListener("click", openAction);
  document
    .getElementById("judge0-save-btn")
    .addEventListener("click", saveAction);

  window.onmessage = function (e) {
    if (!e.data) {
      return;
    }

    if (e.data.action === "get") {
      window.top.postMessage(
        JSON.parse(
          JSON.stringify({
            event: "getResponse",
            source_code: sourceEditor.getValue(),
            language_id: getSelectedLanguageId(),
            flavor: getSelectedLanguageFlavor(),
            stdin: stdinEditor.getValue(),
            stdout: stdoutEditor.getValue(),
            compiler_options: $compilerOptions.val(),
            command_line_arguments: $commandLineArguments.val(),
          })
        ),
        "*"
      );
    } else if (e.data.action === "set") {
      if (e.data.source_code) {
        sourceEditor.setValue(e.data.source_code);
      }
      if (e.data.language_id && e.data.flavor) {
        selectLanguageByFlavorAndId(e.data.language_id, e.data.flavor);
      }
      if (e.data.stdin) {
        stdinEditor.setValue(e.data.stdin);
      }
      if (e.data.stdout) {
        stdoutEditor.setValue(e.data.stdout);
      }
      if (e.data.compiler_options) {
        $compilerOptions.val(e.data.compiler_options);
      }
      if (e.data.command_line_arguments) {
        $commandLineArguments.val(e.data.command_line_arguments);
      }
      if (e.data.api_key) {
        AUTH_HEADERS["Authorization"] = `Bearer ${e.data.api_key}`;
      }
    }
  };
  // Initialize AI Line Chat Feature
  createAILineChatPopup();

  // Add event listener for text selection
  document.addEventListener("mouseup", showAILineChatPopup);
});

// Default source code that appears in the IDE
const DEFAULT_SOURCE =
  "// Default source code. Open the file menu to open a file.";

// Default content in the STD Input window
const DEFAULT_STDIN = "";

const DEFAULT_COMPILER_OPTIONS = "";
const DEFAULT_CMD_ARGUMENTS = "";
const DEFAULT_LANGUAGE_ID = 105; // C++ (GCC 14.1.0) (https://ce.judge0.com/languages/105)

function getEditorLanguageMode(languageName) {
  const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";
  const LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE = {
    Bash: "shell",
    C: "c",
    C3: "c",
    "C#": "csharp",
    "C++": "cpp",
    Clojure: "clojure",
    "F#": "fsharp",
    Go: "go",
    Java: "java",
    JavaScript: "javascript",
    Kotlin: "kotlin",
    "Objective-C": "objective-c",
    Pascal: "pascal",
    Perl: "perl",
    PHP: "php",
    Python: "python",
    R: "r",
    Ruby: "ruby",
    SQL: "sql",
    Swift: "swift",
    TypeScript: "typescript",
    "Visual Basic": "vb",
  };

  for (let key in LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE) {
    if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
      return LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE[key];
    }
  }
  return DEFAULT_EDITOR_LANGUAGE_MODE;
}

const EXTENSIONS_TABLE = {
  asm: { flavor: CE, language_id: 45 }, // Assembly (NASM 2.14.02)
  c: { flavor: CE, language_id: 103 }, // C (GCC 14.1.0)
  cpp: { flavor: CE, language_id: 105 }, // C++ (GCC 14.1.0)
  cs: { flavor: EXTRA_CE, language_id: 29 }, // C# (.NET Core SDK 7.0.400)
  go: { flavor: CE, language_id: 95 }, // Go (1.18.5)
  java: { flavor: CE, language_id: 91 }, // Java (JDK 17.0.6)
  js: { flavor: CE, language_id: 102 }, // JavaScript (Node.js 22.08.0)
  lua: { flavor: CE, language_id: 64 }, // Lua (5.3.5)
  pas: { flavor: CE, language_id: 67 }, // Pascal (FPC 3.0.4)
  php: { flavor: CE, language_id: 98 }, // PHP (8.3.11)
  py: { flavor: EXTRA_CE, language_id: 25 }, // Python for ML (3.11.2)
  r: { flavor: CE, language_id: 99 }, // R (4.4.1)
  rb: { flavor: CE, language_id: 72 }, // Ruby (2.7.0)
  rs: { flavor: CE, language_id: 73 }, // Rust (1.40.0)
  scala: { flavor: CE, language_id: 81 }, // Scala (2.13.2)
  sh: { flavor: CE, language_id: 46 }, // Bash (5.0.0)
  swift: { flavor: CE, language_id: 83 }, // Swift (5.2.3)
  ts: { flavor: CE, language_id: 101 }, // TypeScript (5.6.2)
  txt: { flavor: CE, language_id: 43 }, // Plain Text
};

function getLanguageForExtension(extension) {
  return EXTENSIONS_TABLE[extension] || { flavor: CE, language_id: 43 }; // Plain Text (https://ce.judge0.com/languages/43)
}

// AI Line Chatting Feature Variables
let aiLineChatPopup = null;
let aiLineChatInput = null;
let currentHighlightedLines = null;

function createAILineChatPopup() {
  // Create popup container
  aiLineChatPopup = document.createElement("div");
  aiLineChatPopup.id = "ai-line-chat-popup";
  aiLineChatPopup.style.cssText = `
  position: absolute;
  background-color: white;
  border: none;
  padding: 0;
  z-index: 1000;
  display: none;
  width: fit-content; 
  height: fit-content; 
`;

  // Create "Chat" button
  const chatButton = document.createElement("button");
  chatButton.textContent = "Chat";
  chatButton.style.cssText = `
  background-color: #008080; 
  color: white;
  border: none;
  padding: 3px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
  display: block; 
`;

  chatButton.addEventListener("click", () => {
    aiLineChatPopup.style.display = "none";
    showAILineChatInput();
  });

  aiLineChatPopup.appendChild(chatButton);
  document.body.appendChild(aiLineChatPopup);
}

function showAILineChatPopup(event) {
  console.log("showAILineChatPopup called");

  // Target Monaco Editor container
  const editorContainer = document.querySelector(".monaco-editor.focused");

  if (!editorContainer) {
    console.error("Monaco Editor container not found");
    return;
  }

  // Get the Monaco Editor instance
  const editor = window.monaco.editor
    .getEditors()
    .find((ed) => ed.getDomNode() === editorContainer);

  if (!editor) {
    console.error("No active Monaco Editor found");
    return;
  }

  // Get the current selection
  const selection = editor.getSelection();
  const selectedText = editor.getModel().getValueInRange(selection);

  if (!selectedText) {
    console.error("No text selected");
    return;
  }

  currentHighlightedLines = selectedText;

  // Get the viewport information
  const scrollTop = editor.getScrollTop();
  const layoutInfo = editor.getLayoutInfo();

  // Get coordinates for the selection
  const selectionStartCoords = editor.getScrolledVisiblePosition({
    lineNumber: selection.startLineNumber,
    column: selection.startColumn,
  });

  const selectionEndCoords = editor.getScrolledVisiblePosition({
    lineNumber: selection.endLineNumber,
    column: selection.endColumn,
  });

  if (!selectionStartCoords || !selectionEndCoords) {
    console.error("Could not get selection coordinates");
    return;
  }

  // Calculate the position of the selection relative to the viewport
  const startPosition = editor.getTopForLineNumber(selection.startLineNumber);
  const adjustedTop = startPosition - scrollTop;

  // Check if the selection is within the viewport
  const isInViewport = adjustedTop >= 0 && adjustedTop <= layoutInfo.height;

  if (!isInViewport) {
    console.log("Selection not in viewport");
    return;
  }

  // Ensure popup is created with the chat button
  if (!aiLineChatPopup) {
    console.log("Creating AI Line Chat Popup");
    createAILineChatPopup();
  }

  // Ensure the chat button is present
  if (!aiLineChatPopup.querySelector("button")) {
    console.log("Creating Chat Button");
    const chatButton = document.createElement("button");
    chatButton.textContent = "Chat";
    chatButton.style.cssText = `
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      display: block;
      font-size: 12px;
      line-height: 1.5;
      white-space: nowrap;
    `;
    chatButton.addEventListener("click", () => {
      aiLineChatPopup.style.display = "none";
      showAILineChatInput();
    });
    aiLineChatPopup.innerHTML = ""; // Clear any existing content
    aiLineChatPopup.appendChild(chatButton);
  }

  // Position the popup after the selection end with a margin
  const MARGIN = 10;

  // Calculate the rightmost position of the selection
  const selectionRight = Math.max(
    selectionStartCoords.left,
    selectionEndCoords.left
  );

  // Position the popup after the selection
  const popupLeft = selectionRight + MARGIN;
  const popupTop = selectionEndCoords.top;

  // Ensure the popup doesn't go beyond the editor's right edge
  const maxLeft = layoutInfo.width - aiLineChatPopup.offsetWidth - MARGIN;
  const finalLeft = Math.min(popupLeft, maxLeft);

  // Detailed popup styling with position adjustments
  aiLineChatPopup.style.cssText = `
    position: absolute;
    left: ${finalLeft}px;
    top: ${popupTop}px;
    display: block !important;
    background-color: transparent;
    border: none;
    padding: 5px;
    z-index: 1000;
    pointer-events: auto;
  `;

  // Append to editor container for proper positioning
  editorContainer.appendChild(aiLineChatPopup);

  // Store the scroll listener reference
  let scrollListener = null;

  // Add scroll listener to update popup position
  const scrollHandler = () => {
    const newScrollTop = editor.getScrollTop();
    const newSelectionEndCoords = editor.getScrolledVisiblePosition({
      lineNumber: selection.endLineNumber,
      column: selection.endColumn,
    });

    if (!newSelectionEndCoords) {
      aiLineChatPopup.style.display = "none";
      return;
    }

    const newAdjustedTop = startPosition - newScrollTop;

    // Hide popup if selection scrolls out of view
    if (newAdjustedTop < 0 || newAdjustedTop > layoutInfo.height) {
      aiLineChatPopup.style.display = "none";
    } else {
      aiLineChatPopup.style.display = "block";
      aiLineChatPopup.style.top = `${newSelectionEndCoords.top}px`;
    }
  };

  // Add scroll listener and store the reference
  scrollListener = editor.onDidScrollChange(scrollHandler);

  // Handle click outside popup
  const clickOutsideHandler = function (event) {
    if (
      aiLineChatPopup &&
      aiLineChatPopup.style.display === "block" &&
      !aiLineChatPopup.contains(event.target)
    ) {
      aiLineChatPopup.style.display = "none";
      // Only dispose of the scroll listener
      if (scrollListener) {
        scrollListener.dispose();
      }
      // Remove this click handler
      document.removeEventListener("mousedown", clickOutsideHandler);
    }
  };

  document.addEventListener("mousedown", clickOutsideHandler);

  // Add window resize handler
  const resizeHandler = () => {
    if (aiLineChatPopup.style.display === "block") {
      const newLayoutInfo = editor.getLayoutInfo();
      const newMaxLeft =
        newLayoutInfo.width - aiLineChatPopup.offsetWidth - MARGIN;
      const newSelectionEndCoords = editor.getScrolledVisiblePosition({
        lineNumber: selection.endLineNumber,
        column: selection.endColumn,
      });

      if (newSelectionEndCoords) {
        const newSelectionRight = Math.max(
          selectionStartCoords.left,
          newSelectionEndCoords.left
        );
        const newPopupLeft = Math.min(newSelectionRight + MARGIN, newMaxLeft);
        aiLineChatPopup.style.left = `${newPopupLeft}px`;
        aiLineChatPopup.style.top = `${newSelectionEndCoords.top}px`;
      }
    }
  };

  window.addEventListener("resize", resizeHandler);

  // Remove resize handler when popup is hidden
  const popupObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "style" &&
        aiLineChatPopup.style.display === "none"
      ) {
        window.removeEventListener("resize", resizeHandler);
        popupObserver.disconnect();
      }
    });
  });

  popupObserver.observe(aiLineChatPopup, { attributes: true });
}

function showAILineChatInput() {
  if (!aiLineChatInput) {
    // Create container for input and buttons
    aiLineChatInput = document.createElement("div");
    aiLineChatInput.id = "ai-line-chat-input-container";
    aiLineChatInput.style.cssText = `
      position: absolute;
      display: flex;
      align-items: center;
      background-color: white;
      border: none;
      border-radius: 0px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      outline: none;
      z-index: 1000;
      padding: 5px;
    `;

    // Create input field
    const inputField = document.createElement("input");
    inputField.id = "ai-line-chat-input";
    inputField.placeholder = "Ask AI about this code...";
    inputField.style.cssText = `
      flex-grow: 1;
      width: 300px;
      padding: 5px;
      margin-right: 10px;
      border: none;
      border-radius: 0px;
      outline: 1px solid rgba(0,0,0,0.1)
    `;

    // Create submit button
    const submitButton = document.createElement("button");
    submitButton.textContent = "Submit";
    submitButton.style.cssText = `
      background-color: #e0e0e0;
      color: #333;
      border: none;
      padding: 5px 10px;
      margin-right: 5px;
      border-radius: 3px;
      cursor: pointer;
    `;

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "X";
    closeButton.style.cssText = `
      background-color: #e0e0e0;
      color: #333;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
    `;

    // Hover effects
    submitButton.addEventListener("mouseenter", () => {
      submitButton.style.backgroundColor = "#d0d0d0";
    });
    submitButton.addEventListener("mouseleave", () => {
      submitButton.style.backgroundColor = "#e0e0e0";
    });

    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.backgroundColor = "#d0d0d0";
    });
    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.backgroundColor = "#e0e0e0";
    });

    // Submit button event listener
    submitButton.addEventListener("click", () => {
      const query = inputField.value.trim();
      if (query) {
        // Send query to side-chat endpoint with code context
        sendAILineChatQuery(query, currentHighlightedLines);

        // Reset input and hide
        inputField.value = "";
        // Close the input
        aiLineChatInput.style.display = "none";
      }
    });

    // Close button event listener
    closeButton.addEventListener("click", () => {
      // Reset input and hide
      inputField.value = "";
      aiLineChatInput.style.display = "none";
    });

    // Close the input when clicked outside
    document.addEventListener("mousedown", function (event) {
      if (
        aiLineChatInput &&
        aiLineChatInput.style.display === "flex" &&
        !aiLineChatInput.contains(event.target)
      ) {
        // Reset input to empty
        inputField.value = "";
        // Check if the click is not on the input or its children
        aiLineChatInput.style.display = "none";
      }
    });

    // Append elements to container
    aiLineChatInput.appendChild(inputField);
    aiLineChatInput.appendChild(submitButton);
    aiLineChatInput.appendChild(closeButton);

    // Add enter key support
    inputField.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        submitButton.click();
      }
    });

    document.body.appendChild(aiLineChatInput);
  }

  // Position input relative to the popup
  const popupLeft = parseInt(aiLineChatPopup.style.left);
  const popupTop = parseInt(aiLineChatPopup.style.top);

  // Position the input slightly to the right and below the popup
  aiLineChatInput.style.left = `${popupLeft - 100}px`;
  aiLineChatInput.style.top = `${popupTop + 40}px`;
  aiLineChatInput.style.display = "flex";

  // Focus on the input field
  const inputField = aiLineChatInput.querySelector("input");
  inputField.focus();
}

function sendAILineChatQuery(query, codeContext) {
  // Add user's message to the chat
  addMessage("Me", `${query}:\n\n\n${codeContext}`);

  // Prepare the message payload
  const messagePayload = {
    sender: "User",
    message: query,
    fileContent: codeContext,
    context: {
      type: "line_chat",
      codeSnippet: codeContext,
    },
  };

  // Add thinking message with a unique ID
  const thinkingId = "thinking-" + Date.now();
  addMessage("Judge0", "", thinkingId, true); // Pass true for isThinking

  // Send message to side-chat endpoint
  fetch("http://localhost:3000/api/side-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messagePayload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Remove thinking message
      const thinkingMessage = document.getElementById(thinkingId);
      if (thinkingMessage) {
        thinkingMessage.remove();
      }

      // Extract the AI's response and add it
      const aiResponse = data.choices[0].message.content;
      addMessage("Judge0", aiResponse);
    })
    .catch((error) => {
      // Remove thinking message
      const thinkingMessage = document.getElementById(thinkingId);
      if (thinkingMessage) {
        thinkingMessage.remove();
      }

      console.error("Error:", error);
      addMessage(
        "Judge0",
        "Sorry, I encountered an error processing your message."
      );
    });
}
