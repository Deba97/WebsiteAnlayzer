const puppeteer = require('puppeteer');

// Helper function to wait for a given time
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to find selectors
async function findSelector(page, defaultSelector, backupSelector) {
  try {
    const element = await page.$(defaultSelector);
    if (element) return defaultSelector;
    
    const backupElement = await page.$(backupSelector);
    if (backupElement) return backupSelector;
    
    return 'Not found';
  } catch (error) {
    return 'Error finding selector';
  }
}

// Main function to find selectors
async function findSelectors(searchQuery) {
  console.log(`Starting selector finder for query: ${searchQuery}`);
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for visual confirmation
    defaultViewport: { width: 1366, height: 768 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to appear more like a real browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Navigate to Google Maps
    await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });
    console.log('Loaded Google Maps');
    
    // Wait for and click on the search input
    await page.waitForSelector('#searchboxinput', { visible: true });
    await page.click('#searchboxinput');
    
    // Type the search query
    await page.type('#searchboxinput', searchQuery);
    await page.keyboard.press('Enter');
    console.log('Entered search query');
    
    // Wait for results to load
    await waitFor(5000);
    
    // Find and log the selectors we need
    console.log('\n==== SELECTORS IDENTIFIED ====\n');
    
    // Identify listing elements
    const listingSelector = await findSelector(page, 'div[role="article"]', '.Nv2PK');
    console.log(`Business listing selector: ${listingSelector}`);
    
    // Business name selector
    const nameSelector = await findSelector(page, 'h3', '.qBF1Pd');
    console.log(`Business name selector: ${nameSelector}`);
    
    // Business rating selector
    const ratingSelector = await findSelector(page, 'span[aria-hidden="true"]', '.MW4etd');
    console.log(`Business rating selector: ${ratingSelector}`);
    
    // Business website link selector
    const websiteLinkSelector = await findSelector(page, 'a[data-item-id="authority"]', 'a[data-item-id="authority"]');
    console.log(`Business website link selector: ${websiteLinkSelector}`);
    
    // Business phone selector
    const phoneSelector = await findSelector(page, 'button[data-item-id="phone:tel"]', 'button[data-item-id="phone:tel"]');
    console.log(`Business phone selector: ${phoneSelector}`);
    
    console.log('\nTesting clicking on a result...');
    // Click on the first result to check for more details
    const firstResult = await page.$(`${listingSelector}:first-child`);
    if (firstResult) {
      await firstResult.click();
      console.log('Clicked on first result');
      
      await waitFor(3000);
      
      // More detailed selectors inside the business details panel
      const detailsNameSelector = await findSelector(page, 'h1', 'h1.DUwDvf');
      console.log(`Business details name selector: ${detailsNameSelector}`);
      
      const detailsAddressSelector = await findSelector(page, 'button[data-item-id="address"]', 'button[data-item-id="address"]');
      console.log(`Business details address selector: ${detailsAddressSelector}`);
      
      const detailsPhoneSelector = await findSelector(page, 'button[data-item-id^="phone:"]', 'button[data-item-id^="phone:"]');
      console.log(`Business details phone selector: ${detailsPhoneSelector}`);
      
      const detailsWebsiteSelector = await findSelector(page, 'a[data-item-id="authority"]', 'a[data-item-id="authority"]');
      console.log(`Business details website selector: ${detailsWebsiteSelector}`);
      
      const detailsRatingSelector = await findSelector(page, '.F7nice', '.F7nice');
      console.log(`Business details rating selector: ${detailsRatingSelector}`);
    }
    
    // Test scrolling
    console.log('\nTesting scrolling...');
    const scrollContainer = await findSelector(page, '.m6QErb[aria-label]', '.m6QErb[aria-label]');
    console.log(`Scroll container selector: ${scrollContainer}`);
    
    // Test next page button
    console.log('\nTesting next page button...');
    const nextPageSelector = await findSelector(page, 'button[aria-label="Next page"]', 'button[aria-label="Next page"]');
    console.log(`Next page button selector: ${nextPageSelector}`);
    
    console.log('\n==== SELECTOR FINDER COMPLETED ====');
    console.log('You can now use these selectors in your main script.');
    
  } catch (error) {
    console.error('Error finding selectors:', error);
  } finally {
    // Keep browser open for a while so user can see the results
    console.log('\nKeeping browser open for 30 seconds for you to inspect...');
    await waitFor(30000);
    await browser.close();
  }
}

// Get search query from command line arguments
const searchQuery = process.argv[2] || 'restaurants in New York';

// Run the selector finder
findSelectors(searchQuery)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

module.exports = { findSelectors }; 