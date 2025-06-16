# Notion-HomeTree
A Notion integration for generating an automatically populated tree-like directory structure of Notion content.

## Features

- 🌳 **Interactive Tree View**: Visualize your Notion page hierarchy as an expandable tree
- 🔍 **Smart Search**: Filter or highlight content with real-time search
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **Easy Setup**: Simple configuration with Notion API

## MVP Features

- ✅ Add tree structure intuitively in web interface
- ✅ Filter tree content with search (hide non-matching items)
- ✅ Highlight matching content in tree view
- ✅ Collapsible tree nodes for better navigation

## Setup

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

## File Structure

```
src/
├── notion-client.js    # Notion API integration
└── server.js          # Express server

public/
├── index.html         # Main interface
├── styles.css         # Styling
└── tree-component.js  # Tree functionality
```
