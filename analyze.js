const WebsiteAnalyzer = require('./website-analyzer');
const BusinessContactTracker = require('./business-contact-tracker');

async function main() {
  // Get search query and location from command line arguments
  const searchQuery = process.argv[2];
  const location = process.argv[3];

  if (!searchQuery || !location) {
    console.log('Usage: node analyze.js "<search query>" "<location>"');
    console.log('Example: node analyze.js "restaurants" "New York, NY"');
    process.exit(1);
  }

  const analyzer = new WebsiteAnalyzer(searchQuery);
  const contactTracker = new BusinessContactTracker(searchQuery);

  try {
    console.log(`Initializing analysis for ${searchQuery} in ${location}...`);
    await analyzer.initialize();
    await contactTracker.initialize();
    
    const results = await analyzer.searchAndAnalyze(searchQuery, location);
    
    console.log('\nAnalysis Summary:');
    console.log('----------------');
    console.log(`Total businesses found: ${results.length}`);
    
    const lowScoring = results.filter(b => b.websiteScore <= 70);
    console.log(`Businesses needing improvement: ${lowScoring.length}`);
    
    // Add all businesses to CSV
    await contactTracker.addBusinesses(results);
    
    if (lowScoring.length > 0) {
      console.log('\nReports generated for:');
      lowScoring.forEach(business => {
        console.log(`- ${business.name} (Score: ${business.websiteScore})`);
      });
    }

    console.log(`\nCSV file generated at: ${contactTracker.csvPath}`);
    console.log(`Reports saved in: ${analyzer.reportGenerator.outputDir}`);
  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await analyzer.close();
  }
}

main(); 