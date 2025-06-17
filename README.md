# Notion-HomeTree
A Notion integration for generating **embeddable** tree-like directory structures that can be added directly to Notion pages as blocks.

## ✨ What This Is

This creates an **embeddable widget** that you can add to any Notion page (just like adding a table, calendar, or other block). The tree automatically displays the hierarchy of child pages and databases.

## 🚀 Quick Start

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

4. **Run the application:**
   ```bash
   npm run dev
   ```

5. **Access the interface:**
   - Open http://localhost:3000
   - Enter your Notion page ID or URL
   - Click "Load Tree" to visualize the structure

## Usage

1. **Get Page ID**: Copy the page ID from your Notion page URL or use the full URL
2. **Load Tree**: Paste the ID/URL and click "Load Tree"
3. **Search**: Use the search box to filter or highlight content
4. **Navigate**: Click arrow buttons to expand/collapse tree nodes

## API Endpoints

- `GET /api/tree/:pageId` - Fetch tree structure for a page
- `GET /api/search?q=query` - Search pages (optional)

## 🧪 Testing

### Quick Test (No Notion API Required)
1. Start server: `npm run dev`
2. Visit: http://localhost:3000/test
3. Click "Load Mock Data" to see the tree in action

### Test Pages Available:
- **Config UI**: http://localhost:3000
- **Test Page**: http://localhost:3000/test (comprehensive testing interface)
- **Sample Embed**: http://localhost:3000/embed?pageId=mock
- **Health Check**: http://localhost:3000/health

### Testing Features:
- Mock data endpoint for testing without Notion API
- Responsive design testing at different sizes
- Direct API endpoint testing
- iframe embedding validation
- Refresh and search functionality testing

### With Real Notion Data:
1. Configure `.env` with your Notion API key
2. Share target pages with your integration
3. Use real page IDs in the config or test page

## File Structure

```
src/
├── notion-client.js    # Notion API integration
└── server.js          # Express server

public/
├── index.html         # Main config interface
├── embed.html         # Embeddable widget
├── styles.css         # Config page styling
├── embed-styles.css   # Widget styling
├── config.js          # Configuration logic
└── embed-component.js # Tree widget functionality

test.html              # Testing interface
test-setup.md          # Testing documentation
```
