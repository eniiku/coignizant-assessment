# AI Chat App

A simple chat interface powered by Google Gemini AI.

https://github.com/user-attachments/assets/9f6413f7-d981-4ce6-bf26-9e0e982920ce

## Setup

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy your API key

### 2. Configure Environment

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. Add your API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Type your message in the input field
2. Press **Enter** to send (or click the send button)
3. Use **Shift+Enter** for a new line
4. Create new chats with the **New Chat** button
5. Switch between conversations in the sidebar
