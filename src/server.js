const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const NotionTreeClient = require('./notion-client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const notionClient = new NotionTreeClient(process.env.NOTION_API_KEY);

app.get('/api/tree/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const tree = await notionClient.getPageTree(pageId);
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Notion HomeTree server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the integration`);
});