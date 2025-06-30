# Notion-HomeTree

A Notion integration for generating **embeddable** tree-like directory structures that can be added directly to Notion pages as blocks.

## What This Is

This creates an **embeddable widget** that you can add to any Notion page (just like adding a table, calendar, or other block). The tree automatically displays the hierarchy of child pages and databases with dynamic configuration capabilities.

## Quick Start

### 1. Setup Server

Install dependencies:

```bash
npm install
```

Configure Notion API:

- Create a new integration at https://www.notion.so/my-integrations
- Copy the integration token
- Create `.env` file:

```
NOTION_API_KEY=your_notion_integration_token_here
PORT=3000
```

Start the server:

```bash
npm run dev
```

### 2. Generate Embed URL

1. Visit http://localhost:3000
2. Enter your Notion page ID or URL
3. Configure display options (depth, compact view, etc.)
4. Copy the generated embed URL

### 3. Add to Notion Page

1. In your Notion page, type `/embed`
2. Paste the embed URL
3. Press Enter
4. The tree will appear as an embedded block!

## Default Page Loading

The embed automatically loads default page IDs from your `.env` file when started. This means users can see your tree structure immediately without needing to configure anything.

### How It Works

1. **Configure `.env` file:**

   ```env
   DEFAULT_PAGE_IDS=abc123def456,def456ghi789
   ```
2. **Start the server:**

   ```bash
   npm run dev
   ```
3. **Open embed:** Visit `http://localhost:3000/embed` and the tree will automatically load with your default pages.

### Behavior Summary

| `DEFAULT_PAGE_IDS` Value | Embed Behavior |
|--------------------------|----------------|
| Has page IDs (e.g., `abc123,def456`) | Automatically loads tree with specified pages |
| `mock` | Shows sample tree data for testing |
| Empty (`DEFAULT_PAGE_IDS=`) | Shows empty state: "No pages configured" with + button |
| Not specified (omitted) | Shows empty state: "No pages configured" with + button |

### Examples

```env
# Single page
DEFAULT_PAGE_IDS=abc123def456

# Multiple pages (comma-separated)
DEFAULT_PAGE_IDS=abc123def456,def456ghi789,ghi789jkl012

# Use mock data for testing
DEFAULT_PAGE_IDS=mock

# Empty - shows "No pages configured" with + button
DEFAULT_PAGE_IDS=
# OR simply omit the line entirely
```

## Setup + Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```
2. **Configure Notion API:**

   - Create a new integration at https://www.notion.so/my-integrations
   - Copy the integration token
   - Create a `.env` file based on `.env.example`:
     ```
     NOTION_API_KEY=your_notion_integration_token_here
     PORT=3000
     ```
3. **Share your Notion page:**

   - Go to the Notion page you want to visualize
   - Click "Share" → "Invite" → Select your integration
4. **Configure defaults (optional):**

   ```env
   # Add to .env file for default pages that load automatically
   DEFAULT_PAGE_IDS=page1,page2,page3
   # Or use 'mock' for testing
   DEFAULT_PAGE_IDS=mock
   ```
5. **Run the application:**

   ```bash
   npm run dev
   ```
6. **Access the interface:**

   - Open http://localhost:3000
   - Generate embed URLs or test dynamic features

## Usage

### Basic Embed Creation

1. **Get Page ID**: Copy page ID from Notion URL or paste the full URL
2. **Configure Options**: Set compact view, search, auto-refresh, etc.
3. **Generate Embed**: Copy the generated embed URL
4. **Add to Notion**: Use `/embed` command in Notion and paste the URL

### Dynamic Tree Building

1. **Start Empty**: Create embed with no initial pages
2. **Add Pages**: Click + button to add Notion page URLs
3. **Multi-Page Trees**: Add multiple pages to create unified tree view
4. **Search & Navigate**: Use search box and expand/collapse controls

## API Endpoints

- `GET /api/tree/:pageId` - Fetch tree structure for a page (supports comma-separated IDs)
- `GET /api/config/defaults` - Get default configuration from server
- `GET /api/search?q=query` - Search pages (optional)
- `GET /api/cache/stats` - Cache statistics and performance metrics
- `POST /api/cache/clear/:pageId?` - Clear cache for specific page or all cache
- `GET /health` - Server health check and available endpoints

## 🌐 Hosting & Deployment

### Railway (Recommended)

1. **Connect Repository:**

   ```bash
   # Push your code to GitHub first
   git add .
   git commit -m "Deploy to Railway"
   git push origin main
   ```
2. **Deploy on Railway:**

   - Visit [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your Notion-HomeTree repository
   - Railway will auto-detect Node.js and deploy
3. **Configure Environment:**

   - In Railway dashboard, go to Variables tab
   - Add: `NOTION_API_KEY=your_notion_integration_token`
   - Add: `PORT=3000` (optional, Railway sets this automatically)
   - Add: `DEFAULT_PAGE_IDS=page1,page2` (optional)
4. **Get Your URL:**

   - Railway provides a public URL like `https://your-app.railway.app`
   - Use this URL for your embed: `https://your-app.railway.app/embed?pageId=...`

### Heroku

1. **Install Heroku CLI** and login:

   ```bash
   npm install -g heroku
   heroku login
   ```
2. **Create Heroku App:**

   ```bash
   heroku create your-notion-hometree
   ```
3. **Configure Environment:**

   ```bash
   heroku config:set NOTION_API_KEY=your_notion_integration_token
   heroku config:set DEFAULT_PAGE_IDS=page1,page2  # optional
   ```
4. **Deploy:**

   ```bash
   git push heroku main
   ```
5. **Open Your App:**

   ```bash
   heroku open
   ```

### Vercel

1. **Install Vercel CLI:**

   ```bash
   npm install -g vercel
   ```
2. **Deploy:**

   ```bash
   vercel --prod
   ```
3. **Configure Environment:**

   - In Vercel dashboard, go to Settings → Environment Variables
   - Add `NOTION_API_KEY` and optionally `DEFAULT_PAGE_IDS`

### Render

1. **Connect Repository:**

   - Visit [render.com](https://render.com)
   - Connect your GitHub repository
2. **Configure Build:**

   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Environment Variables:**

   - Add `NOTION_API_KEY` in Environment section
   - Add `DEFAULT_PAGE_IDS` if needed

### Docker (Self-Hosted)

1. **Create Dockerfile:**

   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --only=production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```
2. **Build and Run:**

   ```bash
   docker build -t notion-hometree .
   docker run -p 3000:3000 -e NOTION_API_KEY=your_token notion-hometree
   ```

### Environment Variables

For all hosting platforms, configure these environment variables:

```env
# Required
NOTION_API_KEY=your_notion_integration_token_here

# Optional
PORT=3000                           # Server port (auto-set by most platforms)
DEFAULT_PAGE_IDS=page1,page2,page3  # Default pages for empty embeds
CACHE_TTL=300                       # Cache duration in seconds
AUTO_REFRESH_DEFAULT=0              # Default auto-refresh rate
MAX_DEPTH_DEFAULT=3                 # Default tree depth limit
```

### Post-Deployment

1. **Test Your Deployment:**

   - Visit `https://your-domain.com/health` to verify server is running
   - Visit `https://your-domain.com/test` to test functionality
2. **Update Embed URLs:**

   - Replace `localhost:3000` with your hosted domain
   - Example: `https://your-app.railway.app/embed?pageId=mock`
3. **Configure CORS (if needed):**

   - The app is pre-configured for Notion embedding
   - No additional CORS setup required for standard use

## 🧪 Testing

### Quick Test (No Notion API Required)

1. Start server: `npm run dev`
2. Visit: http://localhost:3000/test
3. Click "Load Mock Data" to see the tree in action

### Test Pages Available:

- **Config UI**: http://localhost:3000
- **Test Page**: http://localhost:3000/test (comprehensive testing interface)
- **Documentation**: http://localhost:3000/docs
- **Sample Embed**: http://localhost:3000/embed?pageId=mock
- **Empty State**: http://localhost:3000/embed (test + button functionality)
- **Health Check**: http://localhost:3000/health

### Testing Features:

- **Mock Data**: Test without Notion API using sample data
- **Dynamic Configuration**: Test + button and modal functionality
- **Multi-Page Trees**: Test virtual root containers with multiple pages
- **Responsive Design**: Test at different screen sizes
- **API Endpoints**: Direct testing of all API endpoints
- **Cache Performance**: Test caching and refresh functionality
- **Default Config**: Test server-side default page loading

### Dynamic Feature Testing:

1. **Empty State**: Visit embed without pageId to test + button
2. **Add Pages**: Use modal to add Notion URLs and test parsing
3. **Multi-Root**: Test with `pageIds=mock,sample` parameter
4. **Default Loading**: Configure `DEFAULT_PAGE_IDS` in .env and test

### With Real Notion Data:

1. Configure `.env` with your Notion API key
2. Share target pages with your integration
3. Use real page IDs in the config or test page

## File Structure

```
src/
├── notion-client.js   # Notion API integration
└── server.js          # Express server

public/
├── index.html         # Main config interface
├── styles.css         # Main page styling
├── icons.js           # SVG icon templates
├── embed.html         # Embeddable widget
├── embed.css          # Embeddable widget styling
├── embed.js           # Embedable widget logic
├── docs.html          # Documentation page
├── config.js          # Configuration page logic
└── tree-component.js  # Tree widget functionality

test.html              # Testing interface
```
