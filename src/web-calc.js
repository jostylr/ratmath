/**
 * Web Calculator for ratmath
 *
 * Interactive web-based calculator that parses mathematical expressions using the ratmath library.
 * Supports rational arithmetic, intervals, and various output formats.
 */

import { Parser, Rational, RationalInterval, Integer } from "../index.js";

class WebCalculator {
  constructor() {
    this.outputMode = "BOTH"; // 'DECI', 'RAT', 'BOTH'
    this.decimalLimit = 20; // Maximum decimal places before showing ...
    this.history = []; // Command history for up/down arrows
    this.historyIndex = -1; // Current position in history
    this.outputHistory = []; // All input/output pairs for copying
    this.currentEntry = null; // Track current entry being built
    this.mobileInput = ""; // Track mobile input separately
    this.mobileKeypadSetup = false; // Track if mobile keypad is setup

    this.initializeElements();
    this.setupEventListeners();
    this.displayWelcome();
  }

  initializeElements() {
    this.inputElement = document.getElementById("calculatorInput");
    this.outputHistoryElement = document.getElementById("outputHistory");
    this.helpModal = document.getElementById("helpModal");
    this.copyButton = document.getElementById("copyButton");
    this.helpButton = document.getElementById("helpButton");
    this.clearButton = document.getElementById("clearButton");
    this.closeHelp = document.getElementById("closeHelp");
    this.mobileKeypad = document.getElementById("mobileKeypad");
    this.commandPanel = document.getElementById("commandPanel");
    this.closeCommandPanel = document.getElementById("closeCommandPanel");
  }

  setupEventListeners() {
    // Input handling
    this.inputElement.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // Button handlers
    this.copyButton.addEventListener("click", () => this.copySession());
    this.helpButton.addEventListener("click", () => this.showHelp());
    this.clearButton.addEventListener("click", () => this.clearHistory());

    // Modal handlers
    this.closeHelp.addEventListener("click", () => this.hideHelp());
    this.helpModal.addEventListener("click", (e) => {
      if (e.target === this.helpModal) {
        this.hideHelp();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideHelp();
      }
    });

    // Auto-focus input on page load (but not on mobile to avoid virtual keyboard)
    if (!this.isMobile()) {
      setTimeout(() => this.inputElement.focus(), 100);
    }

    // Add mobile-specific input handling
    if (this.isMobile()) {
      this.inputElement.setAttribute("inputmode", "none");
      this.inputElement.setAttribute("autocomplete", "off");
      this.inputElement.setAttribute("autocorrect", "off");
      this.inputElement.setAttribute("autocapitalize", "off");
      this.inputElement.setAttribute("spellcheck", "false");
      this.setupMobileKeypad();
    }
  }

  isMobile() {
    return (
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (window.innerWidth <= 768 && "ontouchstart" in window)
    );
  }

  handleKeyDown(e) {
    switch (e.key) {
      case "Enter":
        this.processInput();
        break;
      case "ArrowUp":
        e.preventDefault();
        this.navigateHistory(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        this.navigateHistory(1);
        break;
    }
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    if (direction === -1) {
      // Up arrow
      if (this.historyIndex === -1) {
        this.historyIndex = this.history.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else {
      // Down arrow
      if (this.historyIndex === -1) return;
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = -1;
        this.inputElement.value = "";
        return;
      }
    }

    this.inputElement.value = this.history[this.historyIndex];
    // Move cursor to end
    setTimeout(() => {
      this.inputElement.setSelectionRange(
        this.inputElement.value.length,
        this.inputElement.value.length,
      );
    }, 0);
  }

  processInput() {
    // On mobile, use the mobileInput instead of input element
    if (this.isMobile()) {
      const mobileInputValue = this.mobileInput.trim();
      if (!mobileInputValue) return;
      this.processExpression(mobileInputValue);
      this.mobileInput = "";
      this.updateMobileDisplay();
      return;
    }

    // Desktop behavior
    const input = this.inputElement.value.trim();
    if (!input) {
      this.inputElement.focus();
      return;
    }
    this.processExpression(input);
  }

  processExpression(input) {
    // Add to history
    if (
      this.history.length === 0 ||
      this.history[this.history.length - 1] !== input
    ) {
      this.history.push(input);
    }
    this.historyIndex = -1;

    // Start tracking this entry for copying
    this.currentEntry = { input: input, output: "", isError: false };

    // Display input
    this.addToOutput(input, null, false);

    // Handle special commands
    const upperInput = input.toUpperCase();

    if (upperInput === "HELP") {
      this.showHelp();
      this.inputElement.value = "";
      this.currentEntry = null; // Don't track help command
      return;
    }

    if (upperInput === "CLEAR") {
      this.clearHistory();
      this.inputElement.value = "";
      this.currentEntry = null; // Don't track clear command
      return;
    }

    if (upperInput === "DECI") {
      this.outputMode = "DECI";
      const output = "Output mode set to decimal";
      this.addToOutput("", output, false);
      this.finishEntry(output);
      this.inputElement.value = "";
      return;
    }

    if (upperInput === "RAT") {
      this.outputMode = "RAT";
      const output = "Output mode set to rational";
      this.addToOutput("", output, false);
      this.finishEntry(output);
      this.inputElement.value = "";
      return;
    }

    if (upperInput === "BOTH") {
      this.outputMode = "BOTH";
      const output = "Output mode set to both decimal and rational";
      this.addToOutput("", output, false);
      this.finishEntry(output);
      this.inputElement.value = "";
      return;
    }

    if (upperInput.startsWith("LIMIT")) {
      const limitStr = upperInput.substring(5).trim();
      let output;
      if (limitStr === "") {
        output = `Current decimal display limit: ${this.decimalLimit} digits`;
        this.addToOutput("", output, false);
      } else {
        const limit = parseInt(limitStr);
        if (isNaN(limit) || limit < 1) {
          output = "Error: LIMIT must be a positive integer";
          this.addToOutput("", output, true);
          this.currentEntry.isError = true;
        } else {
          this.decimalLimit = limit;
          output = `Decimal display limit set to ${limit} digits`;
          this.addToOutput("", output, false);
        }
      }
      this.finishEntry(output);
      this.inputElement.value = "";
      return;
    }

    // Try to parse and evaluate the expression
    try {
      const hasExactDecimal = input.includes("#") || input.includes("#0");
      const hasFraction = input.includes("/");
      const hasDecimalPoint = input.includes(".");
      const isSimpleInteger = /^\s*-?\d+\s*$/.test(input);
      const hasPlainDecimal =
        hasDecimalPoint && !hasExactDecimal && !hasFraction;

      const result = Parser.parse(input, {
        typeAware:
          hasExactDecimal || hasFraction || isSimpleInteger || !hasPlainDecimal,
      });
      const output = this.formatResult(result);
      this.addToOutput("", output, false);
      this.finishEntry(output);
    } catch (error) {
      let errorMessage;
      if (
        error.message.includes("Division by zero") ||
        error.message.includes("Denominator cannot be zero")
      ) {
        errorMessage = "Error: Division by zero is undefined";
      } else if (
        error.message.includes("Factorial") &&
        error.message.includes("negative")
      ) {
        errorMessage = "Error: Factorial is not defined for negative numbers";
      } else if (
        error.message.includes("Zero cannot be raised to the power of zero")
      ) {
        errorMessage = "Error: 0^0 is undefined";
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      this.addToOutput("", errorMessage, true);
      this.currentEntry.isError = true;
      this.finishEntry(errorMessage);
    }

    this.inputElement.value = "";

    // Ensure input stays focused (except on mobile)
    if (!this.isMobile()) {
      setTimeout(() => this.inputElement.focus(), 50);
    }
  }

  finishEntry(output) {
    if (this.currentEntry) {
      this.currentEntry.output = output;
      this.outputHistory.push(this.currentEntry);
      this.currentEntry = null;
    }
  }

  formatResult(result) {
    if (result instanceof RationalInterval) {
      return this.formatInterval(result);
    } else if (result instanceof Rational) {
      return this.formatRational(result);
    } else if (result instanceof Integer) {
      return this.formatInteger(result);
    } else {
      return result.toString();
    }
  }

  formatInteger(integer) {
    return integer.value.toString();
  }

  formatRational(rational) {
    const repeatingInfo = rational.toRepeatingDecimalWithPeriod();
    const repeatingDecimal = repeatingInfo.decimal;
    const period = repeatingInfo.period;
    const decimal = this.formatDecimal(rational);
    const fraction = rational.toString();

    const isTerminatingDecimal = repeatingDecimal.endsWith("#0");
    const displayDecimal = isTerminatingDecimal
      ? repeatingDecimal
      : this.formatRepeatingDecimal(rational);

    const periodInfo = period > 0 ? ` {period: ${period}}` : "";

    switch (this.outputMode) {
      case "DECI":
        return `${displayDecimal}${periodInfo}`;
      case "RAT":
        return fraction;
      case "BOTH":
        if (fraction.includes("/")) {
          return `${displayDecimal}${periodInfo} (${fraction})`;
        } else {
          return decimal;
        }
      default:
        return fraction;
    }
  }

  formatDecimal(rational) {
    const decimal = rational.toDecimal();
    if (decimal.length > this.decimalLimit + 2) {
      const dotIndex = decimal.indexOf(".");
      if (
        dotIndex !== -1 &&
        decimal.length - dotIndex - 1 > this.decimalLimit
      ) {
        return decimal.substring(0, dotIndex + this.decimalLimit + 1) + "...";
      }
    }
    return decimal;
  }

  formatRepeatingDecimal(rational) {
    const repeatingDecimal = rational.toRepeatingDecimal();

    if (!repeatingDecimal.includes("#")) {
      return repeatingDecimal;
    }

    if (repeatingDecimal.endsWith("#0")) {
      const withoutRepeating = repeatingDecimal.substring(
        0,
        repeatingDecimal.length - 2,
      );
      if (withoutRepeating.length > this.decimalLimit + 2) {
        const dotIndex = withoutRepeating.indexOf(".");
        if (
          dotIndex !== -1 &&
          withoutRepeating.length - dotIndex - 1 > this.decimalLimit
        ) {
          return (
            withoutRepeating.substring(0, dotIndex + this.decimalLimit + 1) +
            "..."
          );
        }
      }
      return withoutRepeating;
    }

    if (repeatingDecimal.length > this.decimalLimit + 2) {
      const hashIndex = repeatingDecimal.indexOf("#");
      const beforeHash = repeatingDecimal.substring(0, hashIndex);
      const afterHash = repeatingDecimal.substring(hashIndex + 1);

      if (beforeHash.length > this.decimalLimit + 1) {
        return beforeHash.substring(0, this.decimalLimit + 1) + "...";
      }

      const remainingSpace = this.decimalLimit + 2 - beforeHash.length;
      if (remainingSpace <= 1) {
        return beforeHash + "#...";
      } else if (afterHash.length > remainingSpace - 1) {
        return (
          beforeHash + "#" + afterHash.substring(0, remainingSpace - 1) + "..."
        );
      }
    }

    return repeatingDecimal;
  }

  formatInterval(interval) {
    const lowRepeatingInfo = interval.low.toRepeatingDecimalWithPeriod();
    const highRepeatingInfo = interval.high.toRepeatingDecimalWithPeriod();
    const lowRepeating = lowRepeatingInfo.decimal;
    const highRepeating = highRepeatingInfo.decimal;
    const lowPeriod = lowRepeatingInfo.period;
    const highPeriod = highRepeatingInfo.period;
    const lowDecimal = this.formatDecimal(interval.low);
    const highDecimal = this.formatDecimal(interval.high);
    const lowFraction = interval.low.toString();
    const highFraction = interval.high.toString();

    const lowIsTerminating = lowRepeating.endsWith("#0");
    const highIsTerminating = highRepeating.endsWith("#0");
    const lowDisplay = lowIsTerminating
      ? lowRepeating.substring(0, lowRepeating.length - 2)
      : this.formatRepeatingDecimal(interval.low);
    const highDisplay = highIsTerminating
      ? highRepeating.substring(0, highRepeating.length - 2)
      : this.formatRepeatingDecimal(interval.high);

    let periodInfo = "";
    if (lowPeriod > 0 || highPeriod > 0) {
      const periodParts = [];
      if (lowPeriod > 0) periodParts.push(`low: ${lowPeriod}`);
      if (highPeriod > 0) periodParts.push(`high: ${highPeriod}`);
      periodInfo = ` {period: ${periodParts.join(", ")}}`;
    }

    switch (this.outputMode) {
      case "DECI":
        return `${lowDisplay}:${highDisplay}${periodInfo}`;
      case "RAT":
        return `${lowFraction}:${highFraction}`;
      case "BOTH":
        const decimalRange = `${lowDisplay}:${highDisplay}${periodInfo}`;
        const rationalRange = `${lowFraction}:${highFraction}`;
        if (decimalRange !== rationalRange) {
          return `${decimalRange} (${rationalRange})`;
        } else {
          return decimalRange;
        }
      default:
        return `${lowFraction}:${highFraction}`;
    }
  }

  addToOutput(input = null, output = null, isError = false) {
    const entry = document.createElement("div");
    entry.className = "output-entry";

    if (input) {
      const inputLine = document.createElement("div");
      inputLine.className = "input-line";
      inputLine.innerHTML = `<span class="prompt">></span><span>${this.escapeHtml(input)}</span><span class="reload-icon" title="Reload expression">↻</span>`;

      // Add click handler for reload
      inputLine.addEventListener("click", (e) => {
        if (
          e.target.classList.contains("reload-icon") ||
          e.currentTarget === inputLine
        ) {
          e.stopPropagation();
          this.reloadExpression(input);
        }
      });

      entry.appendChild(inputLine);
    }

    if (output) {
      const outputLine = document.createElement("div");
      outputLine.className = isError ? "error-line" : "output-line";

      if (!isError) {
        outputLine.innerHTML = `${this.escapeHtml(output)}<span class="inject-icon" title="Inject value">→</span>`;

        // Add click handler for inject
        outputLine.addEventListener("click", (e) => {
          if (
            e.target.classList.contains("inject-icon") ||
            e.currentTarget === outputLine
          ) {
            e.stopPropagation();
            const value = this.extractValue(output);
            this.injectValue(value);
          }
        });
      } else {
        outputLine.textContent = output;
      }

      entry.appendChild(outputLine);
    }

    this.outputHistoryElement.appendChild(entry);

    // Handle scrolling
    if (this.isMobile() && document.body.classList.contains("keypad-visible")) {
      // For mobile, wait for DOM update then ensure content stays above input
      requestAnimationFrame(() => {
        this.scrollToKeepAboveInput();
      });
    } else {
      // For desktop, normal scroll to bottom
      requestAnimationFrame(() => {
        this.outputHistoryElement.scrollTop =
          this.outputHistoryElement.scrollHeight;
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  displayWelcome() {
    const welcome = document.createElement("div");
    welcome.className = "output-entry";
    welcome.innerHTML = `
      <div class="output-line" style="color: #059669; font-weight: 600;">
        Welcome to Ratmath Calculator!
      </div>
      <div class="output-line" style="margin-top: 0.5rem;">
        Type mathematical expressions and press Enter to calculate.
      </div>
      <div class="output-line">
        Use the Help button or type HELP for detailed instructions.
      </div>
    `;
    this.outputHistoryElement.appendChild(welcome);
  }

  showHelp() {
    this.helpModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  hideHelp() {
    this.helpModal.style.display = "none";
    document.body.style.overflow = "auto";
    // Delay focus to ensure modal is fully hidden (except on mobile)
    if (!this.isMobile()) {
      setTimeout(() => this.inputElement.focus(), 100);
    }
  }

  clearHistory() {
    this.outputHistoryElement.innerHTML = "";
    this.outputHistory = [];
    this.currentEntry = null;
    this.displayWelcome();
    if (!this.isMobile()) {
      setTimeout(() => this.inputElement.focus(), 100);
    }
  }

  async copySession() {
    if (this.outputHistory.length === 0) {
      // Show feedback for empty session
      const originalText = this.copyButton.textContent;
      this.copyButton.textContent = "Nothing to copy";
      this.copyButton.style.background = "rgba(251, 146, 60, 0.9)";
      this.copyButton.style.color = "white";

      setTimeout(() => {
        this.copyButton.textContent = originalText;
        this.copyButton.style.background = "";
        this.copyButton.style.color = "";
        if (!this.isMobile()) {
          this.inputElement.focus();
        }
      }, 2000);
      return;
    }

    let text = "Ratmath Calculator Session\n";
    text += "=".repeat(30) + "\n\n";

    for (const entry of this.outputHistory) {
      if (entry.input) {
        text += `> ${entry.input}\n`;
        if (entry.output) {
          text += `${entry.output}\n`;
        }
        text += "\n";
      }
    }

    try {
      await navigator.clipboard.writeText(text);

      // Show feedback
      const originalText = this.copyButton.textContent;
      this.copyButton.textContent = "✓ Copied!";
      this.copyButton.style.background = "rgba(34, 197, 94, 0.9)";
      this.copyButton.style.color = "white";

      setTimeout(() => {
        this.copyButton.textContent = originalText;
        this.copyButton.style.background = "";
        this.copyButton.style.color = "";
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);

      // Mobile-friendly fallback: show text in a modal or new window
      if (this.isMobile()) {
        // Create a temporary textarea for mobile copy
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);

        try {
          document.execCommand("copy");
          const originalText = this.copyButton.textContent;
          this.copyButton.textContent = "✓ Copied!";
          this.copyButton.style.background = "rgba(34, 197, 94, 0.9)";
          this.copyButton.style.color = "white";

          setTimeout(() => {
            this.copyButton.textContent = originalText;
            this.copyButton.style.background = "";
            this.copyButton.style.color = "";
          }, 2000);
        } catch (fallbackError) {
          // Show text in a modal if all else fails
          alert(text);
        }

        document.body.removeChild(textarea);
      } else {
        // Desktop fallback: show the text in a new window/tab
        const newWindow = window.open("", "_blank");
        newWindow.document.write(`<pre>${text}</pre>`);
        newWindow.document.title = "Ratmath Calculator Session";
      }
    }
  }

  setupMobileKeypad() {
    // Check if already setup to prevent duplicate listeners
    if (this.mobileKeypadSetup) {
      // Just show the keypad and update display
      this.mobileKeypad.classList.add("show");
      document.body.classList.add("keypad-visible");
      this.updateMobileDisplay();
      this.scrollToKeepAboveInput();
      return;
    }
    this.mobileKeypadSetup = true;

    // Show keypad by default on mobile
    this.mobileKeypad.classList.add("show");
    document.body.classList.add("keypad-visible");

    // Show the input prompt immediately
    setTimeout(() => {
      this.updateMobileDisplay();
      this.scrollToKeepAboveInput();
    }, 50);

    // Setup keypad buttons
    const keypadButtons = document.querySelectorAll(".keypad-btn[data-key]");
    keypadButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = button.getAttribute("data-key");
        this.insertAtCursor(key);
      });
    });

    // Setup action buttons
    const actionButtons = document.querySelectorAll(".keypad-btn[data-action]");
    actionButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = button.getAttribute("data-action");
        if (action === "backspace") {
          this.handleBackspace();
        } else if (action === "clear") {
          if (this.isMobile()) {
            this.mobileInput = "";
            this.updateMobileDisplay();
          } else {
            this.inputElement.value = "";
            this.inputElement.focus();
          }
        } else if (action === "enter") {
          this.processInput();
        } else if (action === "help") {
          this.showHelp();
        } else if (action === "command") {
          this.showCommandPanel();
        }
      });
    });

    // Setup command panel
    this.closeCommandPanel.addEventListener("click", () => {
      this.hideCommandPanel();
    });

    // Setup command buttons
    const cmdButtons = document.querySelectorAll(".command-btn");
    cmdButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cmd = button.getAttribute("data-command");
        if (this.isMobile()) {
          this.mobileInput = cmd;
          this.hideCommandPanel();
          if (cmd !== "LIMIT ") {
            this.processExpression(cmd);
            this.mobileInput = "";
          } else {
            this.updateMobileDisplay();
          }
        } else {
          this.inputElement.value = cmd;
          this.hideCommandPanel();
          if (cmd !== "LIMIT ") {
            this.processInput();
          } else {
            this.inputElement.focus();
            this.inputElement.setSelectionRange(6, 6);
          }
        }
      });
    });

    // Prevent keyboard from showing on input focus when keypad is active
    this.inputElement.addEventListener("focus", (e) => {
      if (this.isMobile() && this.mobileKeypad.classList.contains("show")) {
        e.preventDefault();
        this.inputElement.blur();
      }
    });

    // Add scroll listener to enforce boundary
    this.outputHistoryElement.addEventListener("scroll", () => {
      if (document.body.classList.contains("keypad-visible")) {
        requestAnimationFrame(() => this.enforceScrollBoundary());
      }
    });
  }

  updateMobileDisplay() {
    if (this.isMobile()) {
      // Show current input in a temporary div at bottom of calculator
      let tempDiv = document.getElementById("mobileInputDisplay");

      // Always show the prompt when on mobile
      if (!tempDiv) {
        tempDiv = document.createElement("div");
        tempDiv.id = "mobileInputDisplay";
        // Remove inline styles - let CSS handle it
        const calculator = document.querySelector(".calculator");
        if (calculator) {
          calculator.appendChild(tempDiv);
        }
      }

      // Update the content
      tempDiv.innerHTML = `<span style="color: #059669; font-weight: bold; font-size: 0.95rem; margin-right: 6px;">></span> <span style="font-size: 0.9rem;">${this.escapeHtml(this.mobileInput || "")}</span>`;

      // Ensure visibility when keypad is visible
      if (document.body.classList.contains("keypad-visible")) {
        tempDiv.style.display = "flex";
        // Auto-scroll to bottom when typing
        this.scrollToKeepAboveInput();
      } else {
        tempDiv.style.display = "none";
      }
    }
  }

  scrollToKeepAboveInput() {
    // Simple scroll to bottom - flexbox layout handles the rest
    this.outputHistoryElement.scrollTop =
      this.outputHistoryElement.scrollHeight;
  }

  enforceScrollBoundary() {
    // Get the mobile input display
    const inputDisplay = document.getElementById("mobileInputDisplay");
    if (!inputDisplay) return;

    // Immediately call scrollToKeepAboveInput to fix any issues
    this.scrollToKeepAboveInput();
  }

  reloadExpression(expression) {
    if (this.isMobile()) {
      this.mobileInput = expression;
      this.updateMobileDisplay();
    } else {
      this.inputElement.value = expression;
      this.inputElement.focus();
    }
  }

  injectValue(value) {
    if (this.isMobile()) {
      this.mobileInput += value;
      this.updateMobileDisplay();
    } else {
      this.insertAtCursor(value);
    }
  }

  extractValue(output) {
    // Extract numeric value from output string
    const match = output.match(/^([\d\/.:\-]+)/);
    return match ? match[1] : "";
  }

  insertAtCursor(text) {
    if (this.isMobile()) {
      this.mobileInput += text;
      this.updateMobileDisplay();
    } else {
      const start = this.inputElement.selectionStart;
      const end = this.inputElement.selectionEnd;
      const value = this.inputElement.value;
      this.inputElement.value =
        value.substring(0, start) + text + value.substring(end);
      this.inputElement.selectionStart = this.inputElement.selectionEnd =
        start + text.length;
      this.inputElement.focus();
    }
  }

  handleBackspace() {
    if (this.isMobile()) {
      if (this.mobileInput.length > 0) {
        this.mobileInput = this.mobileInput.slice(0, -1);
        this.updateMobileDisplay();
      }
    } else {
      const start = this.inputElement.selectionStart;
      const end = this.inputElement.selectionEnd;
      const value = this.inputElement.value;

      if (start !== end) {
        // Delete selection
        this.inputElement.value =
          value.substring(0, start) + value.substring(end);
        this.inputElement.selectionStart = this.inputElement.selectionEnd =
          start;
      } else if (start > 0) {
        // Delete character before cursor
        this.inputElement.value =
          value.substring(0, start - 1) + value.substring(start);
        this.inputElement.selectionStart = this.inputElement.selectionEnd =
          start - 1;
      }
      this.inputElement.focus();
    }
  }

  showCommandPanel() {
    this.commandPanel.classList.add("show");
  }

  hideCommandPanel() {
    this.commandPanel.classList.remove("show");
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    new WebCalculator();
  });
}

export { WebCalculator };
