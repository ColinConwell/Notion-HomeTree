# Testing Notion HomeTree Integration

## 🧪 Testing Methods

### 1. Local Development Testing

**Start the server:**
```bash
npm run dev
```

**Test endpoints directly:**
- Configuration UI: http://localhost:3000
- Embed widget: http://localhost:3000/embed?pageId=YOUR_PAGE_ID
- API endpoint: http://localhost:3000/api/tree/YOUR_PAGE_ID

### 2. Mock Data Testing

Create test data without requiring actual Notion API access:

**Test with sample data:**
```bash
# Test the embed with mock data
curl http://localhost:3000/embed?pageId=mock
```

### 3. iframe Testing

Test the embed in isolation by creating a simple HTML page:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Embed Test</title>
</head>
<body>
    <h1>Testing Notion HomeTree Embed</h1>
    <iframe 
        src="http://localhost:3000/embed?pageId=YOUR_PAGE_ID&compact=true&showSearch=true" 
        width="400" 
        height="300" 
        frameborder="1"
        style="border: 1px solid #ccc;">
    </iframe>
</body>
</html>
```

### 4. API Testing

Test the Notion API integration directly:

```bash
# Test tree endpoint
curl "http://localhost:3000/api/tree/YOUR_PAGE_ID?maxDepth=2"

# Test with cache busting (refresh functionality)
curl "http://localhost:3000/api/tree/YOUR_PAGE_ID?maxDepth=2&_cb=$(date +%s)"
```

### 5. Configuration Testing

Test different embed configurations:

- Basic: `http://localhost:3000/embed?pageId=PAGE_ID`
- Compact: `http://localhost:3000/embed?pageId=PAGE_ID&compact=true`
- No Search: `http://localhost:3000/embed?pageId=PAGE_ID&showSearch=false`
- Auto-expand: `http://localhost:3000/embed?pageId=PAGE_ID&autoExpand=true`
- Max Depth: `http://localhost:3000/embed?pageId=PAGE_ID&maxDepth=5`

## 🎯 Quick Test Page

Use the configuration page at http://localhost:3000 to:
1. Enter any Notion page ID
2. Adjust settings
3. See live preview
4. Copy embed URL for testing

## 🔍 Troubleshooting

**Common issues:**
- **CORS errors**: Check iframe embedding headers
- **API errors**: Verify Notion API key and page sharing
- **Empty tree**: Ensure page has child pages/databases
- **Loading issues**: Check network tab for failed requests

**Debug mode:**
Open browser DevTools in the embed iframe to see console logs and network requests.