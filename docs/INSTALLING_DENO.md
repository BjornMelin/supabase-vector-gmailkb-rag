# Installing Deno

Deno is a modern, secure JavaScript and TypeScript runtime. This guide explains how to install Deno on all major platforms.

---

## 🟢 Recommended: Official Installer Script (Linux/macOS/WSL)

Open your terminal and run:

```bash
curl -fsSL https://deno.land/install.sh | sh
```

This downloads and installs the latest Deno release to `~/.deno/bin/deno`.

### Add Deno to Your PATH

Add the following to your shell profile (e.g., `~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"
```

Reload your shell:

```bash
source ~/.bashrc   # or ~/.zshrc, ~/.profile, etc.
```

---

## 🟣 Homebrew (macOS/Linux)

```bash
brew install deno
```

---

## 🟠 Windows

- **Scoop:**
  
  ```powershell
  scoop install deno
  ```

- **Chocolatey:**

  ```powershell
  choco install deno
  ```

---

## 🟡 Verify Installation

Check your Deno version:

```bash
deno --version
```

You should see output like:

```plaintext
deno 1.42.1
v8 12.3.123.1
typescript 5.4.3
```

---

## 🔧 Troubleshooting

- If `deno` is not found, ensure your PATH is set correctly and restart your terminal.
- For WSL, follow the Linux instructions.
- For more help, see the [official Deno installation guide](https://deno.land/manual/getting_started/installation).

---

## 🔗 Resources

- [Deno Manual: Installation](https://deno.land/manual/getting_started/installation)
- [Deno Releases](https://github.com/denoland/deno/releases)

---

**Note:** This project uses Deno for Edge Functions and some scripts. Node.js is used for other tooling and tests.
