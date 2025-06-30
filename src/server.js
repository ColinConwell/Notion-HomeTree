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

// Initialize Notion client only if API key is provided
const notionClient = process.env.NOTION_API_KEY 
  ? new NotionTreeClient(process.env.NOTION_API_KEY)
  : null;

// Cache setup - TTL in seconds
const cache = new NodeCache({ 
  stdTTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Better performance for JSON objects
});

// Storage for saved embeds and page IDs (in production, use a database)
const savedEmbeds = new Map();
const savedPageIds = new Map();

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
  
  // Allow empty embeds - they'll show the empty state with add button
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

// Helper to normalize Notion page IDs (remove hyphens, ensure 32 hex chars)
function normalizePageId(id) {
  if (!id) return null;
  // Remove hyphens
  const clean = id.replace(/-/g, '');
  // Only return if 32 hex chars
  return /^[a-f0-9]{32}$/i.test(clean) ? clean : null;
}

// API endpoints
app.get('/api/tree/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { maxDepth = 3, _cb } = req.query; // _cb for cache busting
    
    // Handle multiple page IDs (comma-separated)
    const pageIds = pageId.includes(',') ? pageId.split(',') : [pageId];
    const normalizedPageIds = pageIds.map(id => normalizePageId(id.trim())).filter(Boolean);
    if (normalizedPageIds.length === 0) {
      return res.status(400).json({ error: 'Invalid page ID(s) provided.' });
    }
    
    // Return mock data for testing
    if (normalizedPageIds.includes('mock') || normalizedPageIds.includes('sample')) {
      if (normalizedPageIds.length === 1) {
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
    
    if (normalizedPageIds.length === 1) {
      // Single page - existing logic
      const cacheKey = `tree:${normalizedPageIds[0]}:${maxDepth}`;
      
      // Check cache first (unless cache busting is requested)
      if (!_cb) {
        const cachedTree = cache.get(cacheKey);
        if (cachedTree) {
          res.set('X-Cache', 'HIT');
          res.json(cachedTree);
          return;
        }
      }
      
      // Check if Notion client is available
      if (!notionClient) {
        return res.status(500).json({ 
          error: 'Notion API key not configured. Set NOTION_API_KEY environment variable.' 
        });
      }
      
      // Fetch fresh data
      const tree = await notionClient.getPageTree(normalizedPageIds[0], parseInt(maxDepth));
      
      // Cache the result
      cache.set(cacheKey, tree);
      res.set('X-Cache', 'MISS');
      res.json(tree);
    } else {
      // Multiple pages - create virtual root
      const cacheKey = `multi-tree:${normalizedPageIds.join(',')}:${maxDepth}`;
      
      // Check cache first (unless cache busting is requested)
      if (!_cb) {
        const cachedTree = cache.get(cacheKey);
        if (cachedTree) {
          res.set('X-Cache', 'HIT');
          res.json(cachedTree);
          return;
        }
      }
      
      // Check if Notion client is available
      if (!notionClient) {
        return res.status(500).json({ 
          error: 'Notion API key not configured. Set NOTION_API_KEY environment variable.' 
        });
      }
      
      // Fetch all trees in parallel
      const treePromises = normalizedPageIds.map(id => 
        notionClient.getPageTree(id, parseInt(maxDepth))
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
    notion: {
      apiConfigured: !!notionClient,
      apiKey: process.env.NOTION_API_KEY ? 'Set' : 'Not Set'
    },
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats()
    },
    endpoints: {
      home: `http://localhost:${PORT}/`,
      config: `http://localhost:${PORT}/config`,
      docs: `http://localhost:${PORT}/docs`,
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

// Helper function to verify API key
function verifyApiKey(apiKey) {
  return apiKey && process.env.NOTION_API_KEY && apiKey === process.env.NOTION_API_KEY;
}

// API key verification endpoint
app.post('/api/verify-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!process.env.NOTION_API_KEY) {
      return res.status(500).json({ error: 'Server API key not configured' });
    }
    
    const isValid = verifyApiKey(apiKey);
    
    res.json({ 
      valid: isValid,
      message: isValid ? 'API key verified' : 'API key does not match'
    });
  } catch (error) {
    console.error('API key verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Save embed configuration
app.post('/api/embeds/save', (req, res) => {
  try {
    const { apiKey, embed } = req.body;
    
    if (!verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (!embed || !embed.name) {
      return res.status(400).json({ error: 'Embed configuration and name are required' });
    }
    
    const embedId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const embedData = {
      id: embedId,
      name: embed.name,
      description: embed.description || '',
      config: embed.config,
      pageIds: embed.pageIds || [],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    
    savedEmbeds.set(embedId, embedData);
    
    res.json({ 
      success: true, 
      embedId,
      message: 'Embed saved successfully' 
    });
  } catch (error) {
    console.error('Save embed error:', error);
    res.status(500).json({ error: 'Failed to save embed' });
  }
});

// Get saved embeds
app.post('/api/embeds/list', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const embeds = Array.from(savedEmbeds.values()).map(embed => ({
      ...embed,
      config: { ...embed.config, url: undefined } // Don't send full URLs in list
    }));
    
    res.json({ embeds });
  } catch (error) {
    console.error('List embeds error:', error);
    res.status(500).json({ error: 'Failed to get embeds' });
  }
});

// Delete saved embed
app.delete('/api/embeds/:embedId', (req, res) => {
  try {
    const { embedId } = req.params;
    const { apiKey } = req.body;
    
    if (!verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (savedEmbeds.has(embedId)) {
      savedEmbeds.delete(embedId);
      res.json({ success: true, message: 'Embed deleted' });
    } else {
      res.status(404).json({ error: 'Embed not found' });
    }
  } catch (error) {
    console.error('Delete embed error:', error);
    res.status(500).json({ error: 'Failed to delete embed' });
  }
});

// Save page ID
app.post('/api/pages/save', (req, res) => {
  try {
    const { apiKey, pageData } = req.body;
    
    if (!verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (!pageData || !pageData.name || !pageData.pageId) {
      return res.status(400).json({ error: 'Page name and ID are required' });
    }
    
    const savedPageData = {
      id: pageData.pageId,
      name: pageData.name,
      description: pageData.description || '',
      url: pageData.url || '',
      savedAt: new Date().toISOString()
    };
    
    savedPageIds.set(pageData.pageId, savedPageData);
    
    res.json({ 
      success: true, 
      message: 'Page ID saved successfully' 
    });
  } catch (error) {
    console.error('Save page ID error:', error);
    res.status(500).json({ error: 'Failed to save page ID' });
  }
});

// Get saved page IDs
app.post('/api/pages/list', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const pages = Array.from(savedPageIds.values());
    res.json({ pages });
  } catch (error) {
    console.error('List pages error:', error);
    res.status(500).json({ error: 'Failed to get pages' });
  }
});

// Root page - Direct embed with defaults
app.get('/', (req, res) => {
  // If no default page IDs configured, redirect to config
  if (!process.env.DEFAULT_PAGE_IDS) {
    return res.redirect('/config');
  }
  
  // Serve embed with defaults (same as /embed but with automatic defaults)
  res.sendFile(path.join(__dirname, '../public/embed.html'));
});

// Configuration interface
app.get('/config', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/config.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Notion HomeTree server running on port ${PORT}`);
  console.log(`🏠 Home embed: http://localhost:${PORT}`);
  console.log(`📝 Config page: http://localhost:${PORT}/config`);
  console.log(`📚 Documentation: http://localhost:${PORT}/docs`);
  console.log(`🧪 Test page: http://localhost:${PORT}/test`);
  console.log(`🔗 Sample embed: http://localhost:${PORT}/embed?pageId=mock`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});