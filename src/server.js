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

// Mock data for testing
const mockTreeData = {
  id: 'mock-page-id',
  title: 'Sample Home Page',
  type: 'page',
  children: [
    {
      id: 'mock-child-1',
      title: 'Projects',
      type: 'page',
      children: [
        {
          id: 'mock-grandchild-1',
          title: 'Web Development',
          type: 'page',
          children: [
            { id: 'mock-ggchild-1', title: 'React Components', type: 'page', children: [] },
            { id: 'mock-ggchild-2', title: 'API Integration', type: 'page', children: [] }
          ]
        },
        {
          id: 'mock-grandchild-2',
          title: 'Mobile Apps',
          type: 'page',
          children: [
            { id: 'mock-ggchild-3', title: 'iOS Development', type: 'page', children: [] },
            { id: 'mock-ggchild-4', title: 'Flutter Apps', type: 'page', children: [] }
          ]
        }
      ]
    },
    {
      id: 'mock-child-2',
      title: 'Team Database',
      type: 'database',
      children: []
    },
    {
      id: 'mock-child-3',
      title: 'Documentation',
      type: 'page',
      children: [
        { id: 'mock-grandchild-3', title: 'Setup Guide', type: 'page', children: [] },
        { id: 'mock-grandchild-4', title: 'API Reference', type: 'page', children: [] },
        { id: 'mock-grandchild-5', title: 'Troubleshooting', type: 'page', children: [] }
      ]
    },
    {
      id: 'mock-child-4',
      title: 'Resources',
      type: 'page',
      children: [
        { id: 'mock-grandchild-6', title: 'Links & Bookmarks', type: 'page', children: [] },
        { id: 'mock-grandchild-7', title: 'Templates', type: 'database', children: [] }
      ]
    }
  ]
};

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
    
    // Return mock data for testing
    if (pageId === 'mock' || pageId === 'sample') {
      res.json(mockTreeData);
      return;
    }
    
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

// Test endpoint
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../test.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    endpoints: {
      config: `http://localhost:${PORT}/`,
      test: `http://localhost:${PORT}/test`,
      embed: `http://localhost:${PORT}/embed?pageId=mock`,
      api: `http://localhost:${PORT}/api/tree/mock`
    }
  });
});

// Main configuration page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Notion HomeTree server running on port ${PORT}`);
  console.log(`📝 Config page: http://localhost:${PORT}`);
  console.log(`🧪 Test page: http://localhost:${PORT}/test`);
  console.log(`🔗 Sample embed: http://localhost:${PORT}/embed?pageId=mock`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});