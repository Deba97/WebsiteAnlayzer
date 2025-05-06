const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { evaluateWebsite } = require('./website-evaluator');
const readline = require('readline');

// Helper function to wait for a given time
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Define the top business categories to target based on research
const BUSINESS_CATEGORIES = [
  { category: 'restaurants', location: 'local' },
  { category: 'plumbers', location: 'local' },
  { category: 'lawyers', location: 'local' },
  { category: 'dentists', location: 'local' },
  { category: 'real estate agents', location: 'local' },
  { category: 'home services', location: 'local' },
  { category: 'construction companies', location: 'local' },
  { category: 'accountants', location: 'local' },
  { category: 'small wineries', location: 'local' },
  { category: 'local bakeries', location: 'local' }
];

// Define top locations to target based on research
// Targeting smaller cities and areas that are likely to have businesses with outdated websites
const TOP_LOCATIONS = [
  "Greensboro, NC",
  "Greenville, SC",
  "Columbia, SC",
  "Charleston, SC",
  "Boise, ID",
  "McAllen, TX",
  "Fort Myers, FL",
  "Cedar City, UT",
  "St. George, UT",
  "Raleigh, NC",
  "Augusta, GA",
  "Bedford-Stuyvesant, NY",
  "Bensonhurst, NY",
  "Astoria, NY",
  "Bayside, NY",
  "Elmhurst, NY",
  "Flushing, NY",
  "Dunedin, FL",
  "Albuquerque, NM",
  "Las Cruces, NM"
];

// Website quality threshold - businesses with scores below this will be added to the CSV
const QUALITY_THRESHOLD = 60;

// Maximum number of businesses to collect per category/location pair
const MAX_BUSINESSES = 100;

// Main function to scrape businesses
async function scrapeBusinesses(category, location, qualityThreshold = 60, maxBusinesses = 100) {
  console.log(`Scraping businesses for: ${category} in ${location}`);
  console.log(`Will collect up to ${maxBusinesses} businesses with a website quality score below ${qualityThreshold}`);
  
  const businesses = [];
  const businessesWithoutWebsites = [];
  // Track processed websites to avoid duplicates
  const processedWebsites = new Set();
  // Track processed businesses to avoid revisiting after scroll
  const processedBusinessNames = new Set();
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for visual confirmation
    defaultViewport: { width: 1366, height: 768 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to appear more like a real browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Navigate to Google Maps
    await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Loaded Google Maps');
    
    // Wait for and click on the search input
    await page.waitForSelector('#searchboxinput', { visible: true, timeout: 60000 });
    await page.click('#searchboxinput');
    
    // Type the search query
    const searchQuery = `${category} in ${location}`;
    await page.type('#searchboxinput', searchQuery);
    await page.keyboard.press('Enter');
    console.log(`Entered search query: ${searchQuery}`);
    
    // Wait for results to load
    await waitFor(5000);
    
    // Scrape businesses until we reach maxBusinesses
    let collectedBusinesses = 0;
    let needScrolling = true;
    let scrollCount = 0;
    
    while (needScrolling && collectedBusinesses < maxBusinesses) {
      // Check if there's a loader indicating more results are being loaded
      const isLoading = await page.evaluate(() => {
        return document.querySelector('.YtfLV') !== null;
      });
      
      if (isLoading) {
        await waitFor(2000);
        continue;
      }
      
      // Get all the business listings that are currently visible
      const businessElements = await page.$$('.Nv2PK');
      console.log(`Found ${businessElements.length} business elements on page`);
      
      for (const element of businessElements) {
        if (collectedBusinesses >= maxBusinesses) break;
        
        try {
          // Get business info from listing
          const nameElement = await element.$('.qBF1Pd');
          if (!nameElement) continue;
          
          const name = await page.evaluate(el => el.textContent, nameElement);
          
          // Skip if we've already processed this business
          if (processedBusinessNames.has(name)) {
            console.log(`${name} - Already processed, skipping...`);
            continue;
          }
          
          // Add to processed businesses
          processedBusinessNames.add(name);
          
          // Click on the listing to show details
          await nameElement.click();
          await waitFor(3000);
          
          // Get website URL from the business details panel
          const websiteElement = await page.$('a[data-item-id="authority"]');
          
          // Get phone number from the business details panel
          let phoneNumber = '';
          const phoneElement = await page.$('button[data-item-id^="phone:"]');
          if (phoneElement) {
            phoneNumber = await page.evaluate(el => {
              return el.textContent.replace(/\\s+/g, '');
            }, phoneElement);
          }
          
          // Get rating from the business details panel
          let rating = '';
          const ratingElement = await page.$('.F7nice');
          if (ratingElement) {
            rating = await page.evaluate(el => el.textContent, ratingElement);
          }
          
          // Get address from the business details panel
          let address = '';
          const addressElement = await page.$('button[data-item-id="address"]');
          if (addressElement) {
            address = await page.evaluate(el => el.textContent, addressElement);
          }
          
          // Check if business has a website
          if (!websiteElement) {
            console.log(`${name} - No website found, adding to no-website list`);
            // Add to no-website businesses list
            businessesWithoutWebsites.push({
              name,
              category,
              location,
              address,
              phoneNumber,
              rating
            });
            
            // Go back to the list
            await page.keyboard.press('Escape');
            await waitFor(1000);
            continue;
          }
          
          const websiteUrl = await page.evaluate(el => el.href, websiteElement);
          
          // Check if we've already processed this website
          if (processedWebsites.has(websiteUrl)) {
            console.log(`${name} - Already evaluated website ${websiteUrl}, skipping...`);
            // Go back to the list
            await page.keyboard.press('Escape');
            await waitFor(1000);
            continue;
          }
          
          // Add to processed websites
          processedWebsites.add(websiteUrl);
          
          console.log(`Evaluating website for: ${name} (${websiteUrl})`);
          
          // Evaluate the website quality
          const evaluation = await evaluateWebsite(websiteUrl);
          
          console.log(`${name} - Website Score: ${evaluation.score}/100`);
          
          // If website quality is below threshold, add to our list
          if (evaluation.score <= qualityThreshold) {
            console.log(`${name} - Added to potential clients list (Score: ${evaluation.score})`);
            businesses.push({
              name,
              category,
              location,
              address,
              phoneNumber,
              rating,
              websiteUrl,
              websiteScore: evaluation.score,
              issues: evaluation.issues.join('; ')
            });
            
            collectedBusinesses++;
          }
          
          // Go back to the list
          await page.keyboard.press('Escape');
          await waitFor(1000);
          
        } catch (error) {
          console.error(`Error processing business: ${error.message}`);
          // Try to go back to the list if we got stuck in a detail view
          try {
            await page.keyboard.press('Escape');
            await waitFor(1000);
          } catch (e) {}
        }
      }
      
      // Check if we need to scroll for more results
      if (collectedBusinesses < maxBusinesses) {
        // Scroll down to load more results
        const scrollContainer = await page.$('div[role="feed"]');
        if (scrollContainer) {
          await page.evaluate(container => {
            container.scrollTop = container.scrollHeight;
          }, scrollContainer);
          
          console.log(`Scrolled down to load more businesses (${++scrollCount})`);
          await waitFor(3000);
          
          // Check if we've reached the end
          const endReached = await page.evaluate(() => {
            const container = document.querySelector('div[role="feed"]');
            if (!container) return true;
            
            // Check if we're near the bottom
            return container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
          });
          
          if (endReached) {
            console.log('Reached the end of the list');
            needScrolling = false;
          }
        } else {
          // Try the alternate selector that also worked
          const altScrollContainer = await page.$('.m6QErb[aria-label]');
          if (altScrollContainer) {
            await page.evaluate(container => {
              container.scrollTop = container.scrollHeight;
            }, altScrollContainer);
            
            console.log(`Scrolled down using alternate selector (${++scrollCount})`);
            await waitFor(3000);
            
            // Check if we've reached the end
            const endReached = await page.evaluate(() => {
              const container = document.querySelector('.m6QErb[aria-label]');
              if (!container) return true;
              
              // Check if we're near the bottom
              return container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            });
            
            if (endReached) {
              console.log('Reached the end of the list with alternate selector');
              needScrolling = false;
            }
          } else {
            needScrolling = false;
          }
        }
        
        // Check for "Next page" button
        const nextPageButton = await page.$('button[aria-label="Next page"]');
        if (nextPageButton && !needScrolling) {
          const isDisabled = await page.evaluate(button => button.disabled, nextPageButton);
          if (!isDisabled) {
            console.log('Moving to next page');
            await nextPageButton.click();
            await waitFor(3000);
            needScrolling = true;
          } else {
            console.log('Next page button is disabled, no more pages');
            needScrolling = false;
          }
        }
      } else {
        needScrolling = false;
      }
    }
    
  } catch (error) {
    console.error('Error scraping businesses:', error);
  } finally {
    await browser.close();
  }
  
  console.log(`Collected ${businesses.length} businesses with website quality below threshold`);
  console.log(`Collected ${businessesWithoutWebsites.length} businesses without websites`);
  return { businesses, businessesWithoutWebsites };
}

// Function to write businesses to CSV
async function writeToCSV(businesses, category, location, suffix = 'prospects') {
  if (businesses.length === 0) {
    console.log(`No businesses to write to CSV for ${suffix}`);
    return;
  }
  
  const filename = `${category.replace(/\\s+/g, '-')}_${location.replace(/\\s+/g, '-')}_${suffix}.csv`;
  
  const headers = [
    { id: 'name', title: 'Business Name' },
    { id: 'category', title: 'Category' },
    { id: 'location', title: 'Location' },
    { id: 'address', title: 'Address' },
    { id: 'phoneNumber', title: 'Phone Number' },
    { id: 'rating', title: 'Rating' }
  ];
  
  // Add website-specific headers if not writing no-website businesses
  if (suffix !== 'no-website') {
    headers.push(
      { id: 'websiteUrl', title: 'Website URL' },
      { id: 'websiteScore', title: 'Website Score' },
      { id: 'issues', title: 'Issues' }
    );
  }
  
  const csvWriter = createCsvWriter({
    path: filename,
    header: headers
  });
  
  await csvWriter.writeRecords(businesses);
  console.log(`CSV file written successfully: ${filename}`);
  return filename;
}

// Function to randomly select a category and location
function getRandomTarget() {
  const randomCategory = BUSINESS_CATEGORIES[Math.floor(Math.random() * BUSINESS_CATEGORIES.length)];
  const randomLocation = TOP_LOCATIONS[Math.floor(Math.random() * TOP_LOCATIONS.length)];
  
  return {
    category: randomCategory.category,
    location: randomLocation
  };
}

// Main execution function - fully automated
async function main() {
  console.log('==== Business Website Evaluator ====');
  console.log('This tool will scrape Google Maps for businesses and evaluate their websites.\n');
  
  // Display the categories and locations we're targeting
  console.log('Target Business Categories:');
  BUSINESS_CATEGORIES.forEach((item, index) => {
    console.log(`${index + 1}. ${item.category}`);
  });
  
  console.log('\nTarget Locations:');
  TOP_LOCATIONS.forEach((location, index) => {
    console.log(`${index + 1}. ${location}`);
  });
  
  console.log('\nSelecting a random category and location...');
  
  // Get a random category and location
  const target = getRandomTarget();
  
  console.log('\nStarting scraping process...');
  console.log(`Category: ${target.category}`);
  console.log(`Location: ${target.location}`);
  console.log(`Website quality threshold: ${QUALITY_THRESHOLD}`);
  console.log(`Maximum businesses to collect: ${MAX_BUSINESSES}`);
  
  const { businesses, businessesWithoutWebsites } = await scrapeBusinesses(target.category, target.location, QUALITY_THRESHOLD, MAX_BUSINESSES);
  
  // Write businesses with poor websites to CSV
  if (businesses.length > 0) {
    const csvFilename = await writeToCSV(businesses, target.category, target.location, 'prospects');
    console.log(`\nFound ${businesses.length} businesses with website score below ${QUALITY_THRESHOLD}.`);
    console.log(`Results saved to: ${csvFilename}`);
    console.log('You can now reach out to these businesses and offer your web design improvement services!');
  } else {
    console.log('\nNo businesses found with poor website quality. Try a different category or location.');
  }
  
  // Write businesses without websites to CSV
  if (businessesWithoutWebsites.length > 0) {
    const noWebsiteCsvFilename = await writeToCSV(businessesWithoutWebsites, target.category, target.location, 'no-website');
    console.log(`\nFound ${businessesWithoutWebsites.length} businesses without websites.`);
    console.log(`Results saved to: ${noWebsiteCsvFilename}`);
    console.log('You can now reach out to these businesses and offer to build them a new website!');
  } else {
    console.log('\nNo businesses found without websites. Try a different category or location.');
  }
}

// If run directly (not imported)
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { scrapeBusinesses, writeToCSV }; 