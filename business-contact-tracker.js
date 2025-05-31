const fs = require('fs').promises;
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

class BusinessContactTracker {
  constructor(searchQuery) {
    this.searchQuery = searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    this.csvDir = path.join(process.cwd(), 'business-csvs');
    this.csvPath = path.join(this.csvDir, `${this.searchQuery}_contacts.csv`);
  }

  async initialize() {
    await fs.mkdir(this.csvDir, { recursive: true }).catch(console.error);
    
    this.csvWriter = createObjectCsvWriter({
      path: this.csvPath,
      header: [
        { id: 'name', title: 'Business Name' },
        { id: 'phoneNumber', title: 'Phone Number' },
        { id: 'address', title: 'Address' },
        { id: 'websiteScore', title: 'Website Score' },
        { id: 'reportPath', title: 'Report Path' },
        { id: 'category', title: 'Category' },
        { id: 'location', title: 'Location' },
        { id: 'websiteUrl', title: 'Website URL' }
      ]
    });
  }

  async addBusinesses(businesses) {
    const records = businesses.map(business => ({
      name: business.name || '',
      phoneNumber: business.phoneNumber || '',
      address: business.address || '',
      websiteScore: business.websiteScore || 'N/A',
      reportPath: business.reportPath || '',
      category: business.category || '',
      location: business.location || '',
      websiteUrl: business.websiteUrl || ''
    }));

    await this.csvWriter.writeRecords(records);
    console.log(`CSV file updated: ${this.csvPath}`);
  }
}

module.exports = BusinessContactTracker; 