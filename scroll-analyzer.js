const puppeteer = require('puppeteer');

// Helper function to wait for a given time
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeScroll(searchQuery) {
  console.log(`Starting scroll analysis for query: ${searchQuery}`);
  
  const browser = await puppeteer.launch({ 
    headless: false,
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
    
    // Get initial count of businesses
    let businessCount = await countBusinessListings(page);
    console.log(`Initial business count: ${businessCount}`);
    
    // Try different scroll selectors and methods
    const scrollSelectors = [
      '.m6QErb[aria-label]',
      '.m6QErb',
      '.m6QErb.DxyBCb',
      '.DxyBCb',
      'div[role="feed"]',
      '.section-layout',
      '.section-scrollbox'
    ];
    
    for (const selector of scrollSelectors) {
      console.log(`\nTrying to scroll using selector: ${selector}`);
      
      // Check if selector exists
      const exists = await page.evaluate((sel) => {
        return document.querySelector(sel) !== null;
      }, selector);
      
      if (!exists) {
        console.log(`Selector ${selector} does not exist on the page. Skipping...`);
        continue;
      }
      
      // Log information about the element
      const elementInfo = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          offsetHeight: el.offsetHeight,
          scrollTop: el.scrollTop,
          className: el.className,
          id: el.id,
          childrenCount: el.children.length
        };
      }, selector);
      
      console.log('Element info:', elementInfo);
      
      // Try scrolling with this selector
      for (let i = 0; i < 5; i++) {
        console.log(`Scroll attempt ${i+1} with ${selector}`);
        
        // Method 1: Using scrollTop
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        }, selector);
        
        await waitFor(2000);
        
        // Check if new business listings were loaded
        const newCount = await countBusinessListings(page);
        console.log(`After scrollTop method: ${newCount} businesses (${newCount - businessCount} new)`);
        
        if (newCount > businessCount) {
          console.log(`Success! Selector ${selector} works with scrollTop method`);
          businessCount = newCount;
        }
        
        // Method 2: Using scrollBy
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            element.scrollBy(0, 1000);
          }
        }, selector);
        
        await waitFor(2000);
        
        // Check again
        const newCount2 = await countBusinessListings(page);
        console.log(`After scrollBy method: ${newCount2} businesses (${newCount2 - businessCount} new)`);
        
        if (newCount2 > businessCount) {
          console.log(`Success! Selector ${selector} works with scrollBy method`);
          businessCount = newCount2;
        }
      }
    }
    
    // Try page-level scrolling
    console.log("\nTrying page-level scrolling");
    for (let i = 0; i < 5; i++) {
      console.log(`Page scroll attempt ${i+1}`);
      
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
      });
      
      await waitFor(2000);
      
      const newCount = await countBusinessListings(page);
      console.log(`After page scroll: ${newCount} businesses (${newCount - businessCount} new)`);
      
      if (newCount > businessCount) {
        console.log("Success! Page-level scrolling works");
        businessCount = newCount;
      }
    }
    
    // Try clicking "Show more results"
    console.log("\nLooking for 'Show more' or 'Next page' buttons");
    
    // List of possible button selectors
    const buttonSelectors = [
      'button[aria-label="Next page"]',
      'button[jsaction*="pane.paginationSection.nextPage"]',
      'button:contains("Next")',
      'button:contains("Show more")',
      'span:contains("Next")',
      'span:contains("Show more")',
      '[role="button"]:contains("Next")',
      '[role="button"]:contains("Show more")'
    ];
    
    for (const btnSelector of buttonSelectors) {
      console.log(`Checking for button with selector: ${btnSelector}`);
      
      const buttonExists = await page.evaluate((sel) => {
        // Handle :contains pseudo-selector
        if (sel.includes(":contains(")) {
          const parts = sel.match(/(.*):contains\("(.*)"\)(.*)/);
          if (parts) {
            const [_, prefix, text, suffix] = parts;
            const elements = document.querySelectorAll(prefix + suffix);
            return Array.from(elements).some(el => el.textContent.includes(text));
          }
          return false;
        }
        return document.querySelector(sel) !== null;
      }, btnSelector);
      
      if (buttonExists) {
        console.log(`Found button with selector: ${btnSelector}`);
        
        // Try to click the button
        try {
          // Handle :contains pseudo-selector for clicking
          if (btnSelector.includes(":contains(")) {
            await page.evaluate((sel) => {
              const parts = sel.match(/(.*):contains\("(.*)"\)(.*)/);
              if (parts) {
                const [_, prefix, text, suffix] = parts;
                const elements = document.querySelectorAll(prefix + suffix);
                const element = Array.from(elements).find(el => el.textContent.includes(text));
                if (element) element.click();
              }
            }, btnSelector);
          } else {
            await page.click(btnSelector);
          }
          
          console.log("Clicked on button");
          await waitFor(3000);
          
          const newCount = await countBusinessListings(page);
          console.log(`After clicking button: ${newCount} businesses (${newCount - businessCount} new)`);
          
          if (newCount > businessCount) {
            console.log(`Success! Button ${btnSelector} works for loading more results`);
            businessCount = newCount;
          }
        } catch (error) {
          console.log(`Error clicking button: ${error.message}`);
        }
      }
    }
    
    // Analyze the structure of the results
    console.log("\nAnalyzing DOM structure of results");
    
    const domAnalysis = await page.evaluate(() => {
      // Find all possible result containers
      const possibleContainers = [];
      
      // Look for divs with multiple children that might be results
      const allDivs = document.querySelectorAll('div');
      for (const div of allDivs) {
        if (div.children.length >= 5 && div.children.length <= 100) {
          // Check if children look like business listings
          const childrenWithRole = Array.from(div.children).filter(child => 
            child.getAttribute('role') === 'article' || 
            child.querySelector('[role="article"]')
          );
          
          if (childrenWithRole.length > 0) {
            possibleContainers.push({
              element: div,
              selector: getUniqueSelector(div),
              childCount: div.children.length,
              articleCount: childrenWithRole.length
            });
          }
        }
      }
      
      return possibleContainers.map(container => ({
        selector: container.selector,
        childCount: container.childCount,
        articleCount: container.articleCount
      }));
      
      // Helper function to get a unique selector for an element
      function getUniqueSelector(el) {
        if (el.id) return `#${el.id}`;
        
        let selector = el.tagName.toLowerCase();
        if (el.className) {
          const classes = el.className.split(/\s+/).filter(c => c);
          selector += '.' + classes.join('.');
        }
        
        // Add attributes that might help identify it
        if (el.getAttribute('role')) {
          selector += `[role="${el.getAttribute('role')}"]`;
        }
        
        // Add parent info if needed
        if (el.parentElement && !el.id) {
          const parentSelector = getSimpleSelector(el.parentElement);
          if (parentSelector) {
            selector = `${parentSelector} > ${selector}`;
          }
        }
        
        return selector;
      }
      
      function getSimpleSelector(el) {
        if (!el) return '';
        if (el.id) return `#${el.id}`;
        
        let selector = el.tagName.toLowerCase();
        if (el.className) {
          const classes = el.className.split(/\s+/).filter(c => c);
          if (classes.length > 0) {
            selector += '.' + classes.join('.');
          }
        }
        
        return selector;
      }
    });
    
    console.log("Possible result containers:");
    domAnalysis.forEach((container, i) => {
      console.log(`Container ${i+1}:`);
      console.log(`  Selector: ${container.selector}`);
      console.log(`  Child count: ${container.childCount}`);
      console.log(`  Article count: ${container.articleCount}`);
    });
    
    // Final results
    console.log(`\nFinal business count: ${businessCount}`);
    console.log("Keep browser open for 30 seconds to inspect manually...");
    await waitFor(30000);
    
  } catch (error) {
    console.error('Error during scroll analysis:', error);
  } finally {
    await browser.close();
  }
}

// Helper function to count business listings
async function countBusinessListings(page) {
  return page.evaluate(() => {
    // Try different selectors for business listings
    const selectors = [
      '.Nv2PK',
      'div[role="article"]',
      'a[href^="https://www.google.com/maps/place"]',
      '.hfpxzc'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return elements.length;
      }
    }
    
    return 0;
  });
}

// Get search query from command line arguments
const searchQuery = process.argv[2] || 'restaurants in Raleigh, NC';

// Run the analysis
analyzeScroll(searchQuery)
  .then(() => {
    console.log('Scroll analysis completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during analysis:', err);
    process.exit(1);
  }); 