# Canva Presentation Analyzer

A powerful web application that captures, extracts, and analyzes Canva presentations using AI. Built with Next.js, Playwright, and Claude AI.

## Features

- 📸 Captures full-resolution screenshots of Canva presentations
- 📝 Extracts text content from presentation slides using GPT-4 (cheaper vision than anthropic)
- 🤖 Provides comprehensive presentation analysis using Claude AI (openai doesn't do PDF vision. Gemini does, but I just like claude better)
- 🎯 Generates executive summaries, key themes, and insights
- ⚡ Processes multiple slides in parallel for faster results

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A BrowserBase account and API key
- OpenAI API key
- Anthropic (Claude) API key

## Environment Setup

Create a `.env` file in the root directory with:

```env
BROWSERBASE_API_KEY=your_browserbase_key
BROWSERBASE_PROJECT_ID=your_project_id
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Installation

```bash
# Clone the repository
git clone [your-repo-url]

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage

1. Navigate to `http://localhost:3000`
2. Paste a Canva presentation URL into the input field
3. Click "Process" to capture and extract text from the slides
4. Click "Analyze with Claude" to generate a comprehensive analysis

## API Endpoints

- `/api/browse` - Coordinates the capture of all presentation slides
- `/api/capture-page` - Captures individual slide screenshots
- `/api/extract` - Extracts text content using GPT-4
- `/api/analyze-pdf` - Generates presentation analysis using Claude
- `/api/page-count` - Determines the total number of slides

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Browser Automation**: Playwright
- **AI Services**: 
  - OpenAI GPT-4 (text extraction)
  - Anthropic Claude (presentation analysis)
- **Infrastructure**: BrowserBase (browser automation service)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
