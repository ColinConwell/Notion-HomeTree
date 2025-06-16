const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const NotionTreeClient = require('./notion-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for iframe embedding
app.use(cors({
  origin: ['https://www.notion.so', 'https://notion.so'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Set headers for iframe embedding
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://www.notion.so https://notion.so");
  next();
});

const notionClient = new NotionTreeClient(process.env.NOTION_API_KEY);

// Embeddable widget endpoint
app.get('/embed', (req, res) => {
  const { pageId, theme = 'light', compact = 'false' } = req.query;
  
  if (!pageId) {
    return res.status(400).send('Page ID is required');
  }
  
  res.sendFile(path.join(__dirname, '../public/embed.html'));
});

// API endpoints
app.get('/api/tree/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { maxDepth = 3 } = req.query;
    const tree = await notionClient.getPageTree(pageId, parseInt(maxDepth));
    res.json(tree);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch page tree' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q: query, pageId } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const results = await notionClient.searchPages(query, pageId);
    res.json(results);
  } catch (error) {
    console.error('Search API Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Main configuration page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Notion HomeTree server running on port ${PORT}`);
  console.log(`Embed URL: http://localhost:${PORT}/embed?pageId=YOUR_PAGE_ID`);
  console.log(`Config URL: http://localhost:${PORT}`);
});