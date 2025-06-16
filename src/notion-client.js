const { Client } = require('@notionhq/client');

class NotionTreeClient {
  constructor(apiKey) {
    this.notion = new Client({ auth: apiKey });
  }

  async getPageTree(pageId) {
    try {
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      const children = await this.getPageChildren(pageId);
      
      return {
        id: pageId,
        title: this.extractTitle(page),
        type: 'page',
        children: children
      };
    } catch (error) {
      console.error('Error fetching page tree:', error);
      throw error;
    }
  }

  async getPageChildren(pageId) {
    try {
      const response = await this.notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
      });

      const children = [];
      
      for (const block of response.results) {
        if (block.type === 'child_page') {
          const childTree = await this.getPageTree(block.id);
          children.push(childTree);
        } else if (block.type === 'child_database') {
          const database = await this.notion.databases.retrieve({ 
            database_id: block.id 
          });
          children.push({
            id: block.id,
            title: this.extractTitle(database),
            type: 'database',
            children: []
          });
        }
      }

      return children;
    } catch (error) {
      console.error('Error fetching page children:', error);
      return [];
    }
  }

  extractTitle(pageOrDatabase) {
    if (pageOrDatabase.properties && pageOrDatabase.properties.title) {
      const titleProperty = pageOrDatabase.properties.title;
      if (titleProperty.title && titleProperty.title.length > 0) {
        return titleProperty.title[0].plain_text;
      }
    }
    
    if (pageOrDatabase.properties && pageOrDatabase.properties.Name) {
      const nameProperty = pageOrDatabase.properties.Name;
      if (nameProperty.title && nameProperty.title.length > 0) {
        return nameProperty.title[0].plain_text;
      }
    }

    if (pageOrDatabase.title && pageOrDatabase.title.length > 0) {
      return pageOrDatabase.title[0].plain_text;
    }

    return 'Untitled';
  }

  async searchPages(query, pageId = null) {
    try {
      const searchParams = {
        query: query,
        page_size: 100,
        filter: {
          property: 'object',
          value: 'page'
        }
      };

      const response = await this.notion.search(searchParams);
      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        type: 'page',
        url: page.url
      }));
    } catch (error) {
      console.error('Error searching pages:', error);
      return [];
    }
  }
}

module.exports = NotionTreeClient;