# DevLM

AI chat platform that lets you build a personal knowledge base and chat over it. Index documents, websites, GitHub repos, and YouTube videos, then query them through a streaming AI assistant with built-in web search.

## Architecture

![Architecture of Application](https://i.ibb.co/0RRJGsqs/lip.png)

## Stack

- Next.js 16, React 19, Tailwind CSS 4
- PostgreSQL with Prisma
- Better Auth for email/password auth with OTP and magic links
- Qdrant for vector storage
- Groq for LLM inference
- Google Gemini for embeddings
- Tavily for web search
- UploadThing for file uploads

## Run

```bash
git clone https://github.com/Devendraxp/devlm
cd devlm
pnpm install
cp .env.example .env.local
pnpm dev
```

Server starts on http://localhost:3000.

## Environment Variables

```
QDRANT_URL=
QDRANT_API_KEY=
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GROQ_API_KEY=
GOOGLE_API_KEY=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=
SMTP_FROM_EMAIL=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
UPLOADTHING_TOKEN=
TAVILY_API_KEY=
GITHUB_ACCESS_TOKEN=
```

## Features

**Chat with RAG** — Streaming AI chat powered by Groq. Each thread maintains its own document context. Queries are enhanced with HyDE (hypothetical document embeddings) before retrieval to improve result relevance.

**Document indexing** — Index content into a thread's knowledge base from multiple sources: PDF, DOCX, PPTX, plain text files, web URLs, crawled websites, GitHub repositories, and YouTube videos (via transcript). Indexed chunks are embedded with Gemini and stored in Qdrant.

**Web search** — The assistant can search the web via Tavily and extract full page content when needed, grounding responses in current information.

**Thread management** — Conversations are organized into threads. Each thread has its own document scope. Messages and thread state are persisted in PostgreSQL.

**Auth** — Email/password login with required email verification. Also supports OTP and magic link sign-in. Admin role available for user management.

## API

```
# Chat
POST   /api/chat                              stream a chat response

# Document indexing
POST   /api/process-document                  upload file (PDF, DOCX, PPTX, TXT)
POST   /api/process-document/url              index a URL
POST   /api/process-document/crawl            crawl and index a website
POST   /api/process-document/github           index a GitHub repository
POST   /api/process-document/youtube          index a YouTube video

# Threads
GET    /api/threads                           list threads
POST   /api/threads                           create thread
GET    /api/threads/[threadId]/messages       get messages
GET    /api/threads/[threadId]/documents      list indexed documents

# Auth
GET/POST /api/auth/[...all]                   Better Auth handler
GET    /api/auth/check-user                   check if user exists

# Uploads
POST   /api/uploadthing                       UploadThing file upload handler
```

## Project Structure

```
app/
  api/          route handlers
  chat/         chat UI page
  login/        auth pages (login, signup, forgot/reset password)
  profile/      user profile
components/
  chat/         chat sidebar, thread view, data index panel
  assistant-ui/ streaming message renderer with markdown and tool fallback
lib/
  auth.ts       Better Auth configuration
  prisma.ts     Prisma client
  email.ts      SMTP email sender
rag/
  chat.ts       query enhancement, HyDE, RAG retrieval
  vectorStore.ts Qdrant vector store wrapper
  *Indexing.ts  per-source indexing pipelines
tools/
  websearch.ts  Tavily web search tool
  extractWebPage.ts page content extractor
  crawlWebsite.ts site crawler
```
