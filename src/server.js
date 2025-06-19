const express = require('express');
const cors = require('cors');
const path = require('path');
const NodeCache = require('node-cache');
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

// Cache setup - TTL in seconds
const cache = new NodeCache({ 
  stdTTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Better performance for JSON objects
});

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
  const { pageId, pageIds, theme = 'light', compact = 'false' } = req.query;
  
  // Check for default page IDs if none provided
  const defaultPageIds = process.env.DEFAULT_PAGE_IDS;
  
  if (!pageId && !pageIds && !defaultPageIds) {
    return res.status(400).send('Page ID is required or set DEFAULT_PAGE_IDS in .env');
  }
  
  res.sendFile(path.join(__dirname, '../public/embed.html'));
});

// Get default configuration
app.get('/api/config/defaults', (req, res) => {
  res.json({
    pageIds: process.env.DEFAULT_PAGE_IDS ? process.env.DEFAULT_PAGE_IDS.split(',').map(id => id.trim()) : [],
    autoRefresh: parseInt(process.env.AUTO_REFRESH_DEFAULT) || 0,
    maxDepth: parseInt(process.env.MAX_DEPTH_DEFAULT) || 3
  });
});

// API endpoints
app.get('/api/tree/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { maxDepth = 3, _cb } = req.query; // _cb for cache busting
    
    // Handle multiple page IDs (comma-separated)
    const pageIds = pageId.includes(',') ? pageId.split(',') : [pageId];
    
    // Return mock data for testing
    if (pageIds.includes('mock') || pageIds.includes('sample')) {
      if (pageIds.length === 1) {
        res.json(mockTreeData);
        return;
      }
      // For multiple roots including mock, create a virtual root
      const multiRootData = {
        id: 'multi-root',
        title: 'Multiple Pages',
        type: 'virtual',
        children: [mockTreeData]
      };
      res.json(multiRootData);
      return;
    }
    
    if (pageIds.length === 1) {
      // Single page - existing logic
      const cacheKey = `tree:${pageId}:${maxDepth}`;
      
      // Check cache first (unless cache busting is requested)
      if (!_cb) {
        const cachedTree = cache.get(cacheKey);
        if (cachedTree) {
          res.set('X-Cache', 'HIT');
          res.json(cachedTree);
          return;
        }
      }
      
      // Fetch fresh data
      const tree = await notionClient.getPageTree(pageId, parseInt(maxDepth));
      
      // Cache the result
      cache.set(cacheKey, tree);
      res.set('X-Cache', 'MISS');
      res.json(tree);
    } else {
      // Multiple pages - create virtual root
      const cacheKey = `multi-tree:${pageIds.join(',')}:${maxDepth}`;
      
      // Check cache first (unless cache busting is requested)
      if (!_cb) {
        const cachedTree = cache.get(cacheKey);
        if (cachedTree) {
          res.set('X-Cache', 'HIT');
          res.json(cachedTree);
          return;
        }
      }
      
      // Fetch all trees in parallel
      const treePromises = pageIds.map(id => 
        notionClient.getPageTree(id.trim(), parseInt(maxDepth))
      );
      
      const trees = await Promise.all(treePromises);
      
      // Create virtual root containing all trees
      const multiTree = {
        id: 'multi-root',
        title: 'Multiple Pages',
        type: 'virtual',
        children: trees
      };
      
      // Cache the result
      cache.set(cacheKey, multiTree);
      res.set('X-Cache', 'MISS');
      res.json(multiTree);
    }
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

// Cache management endpoints
app.get('/api/cache/stats', (req, res) => {
  res.json({
    keys: cache.keys().length,
    stats: cache.getStats(),
    size: cache.keys().length
  });
});

app.post('/api/cache/clear/:pageId?', (req, res) => {
  const { pageId } = req.params;
  
  if (pageId) {
    // Clear specific page cache
    const keysToDelete = cache.keys().filter(key => key.includes(`tree:${pageId}`));
    cache.del(keysToDelete);
    res.json({ cleared: keysToDelete.length, pageId });
  } else {
    // Clear all cache
    const keyCount = cache.keys().length;
    cache.flushAll();
    res.json({ cleared: keyCount, all: true });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats()
    },
    endpoints: {
      config: `http://localhost:${PORT}/`,
      test: `http://localhost:${PORT}/test`,
      embed: `http://localhost:${PORT}/embed?pageId=mock`,
      api: `http://localhost:${PORT}/api/tree/mock`,
      cacheStats: `http://localhost:${PORT}/api/cache/stats`
    }
  });
});

// Documentation page
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/docs.html'));
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