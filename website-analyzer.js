const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');
const { evaluateWebsite } = require('./website-evaluator');
const ReportGenerator = require('./report-generator');
const MarketAnalysis = require('./market-analysis');
const BusinessContactTracker = require('./business-contact-tracker');

// Helper functions from old code
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Store processed businesses to avoid duplicates
const processedBusinesses = new Set();

// Quality threshold for generating reports
const QUALITY_THRESHOLD = 70;
const BATCH_SIZE = 20;  // Changed back to 20 for production use

class WebsiteAnalyzer {
  constructor(searchQuery) {
    this.searchQuery = searchQuery;
    this.browser = null;
    this.page = null;
    this.outputDir = path.join(process.cwd(), 'analysis_reports');
    this.currentBatch = [];
    this.allBusinesses = [];
    this.lowScoringBusinesses = [];  // Store low scoring businesses here
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 1366, height: 768 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',  // Handle SSL certificate errors
        '--ignore-certificate-errors-spki-list'
      ],
      protocolTimeout: 60000  // Increase timeout to 60 seconds
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Create output directory if it doesn't exist
    await fs.mkdir(this.outputDir, { recursive: true });

    // Initialize report generator
    this.reportGenerator = new ReportGenerator(this.searchQuery);
    await this.reportGenerator.initialize();

    // Initialize contact tracker
    this.contactTracker = new BusinessContactTracker(this.searchQuery);
    await this.contactTracker.initialize();
  }

  async close() {
    if (this.browser) {
      // Save all businesses to CSV before closing
      if (this.allBusinesses.length > 0) {
        await this.contactTracker.addBusinesses(this.allBusinesses);
      }
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async findPageSelectors(url) {
    // Remove this method
  }

  async analyzeScrollBehavior(url) {
    // Remove this method
  }

  async evaluateWebsite(url) {
    // Remove this method
  }

  async runLighthouseAnalysis(url) {
    // Remove this method
  }

  getEmptyCategoryScores() {
    // Remove this method
  }

  async captureScreenshot(url) {
    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1366, height: 768 });
      
      // Set a reasonable timeout for page load
      const response = await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      }).catch(err => {
        console.error(`Failed to load ${url}: ${err.message}`);
        return null;
      });

      // If page failed to load, return null
      if (!response) {
        await page.close();
        return null;
      }

      // Wait for any lazy-loaded images
      await this.waitFor(2000);
      
      // Capture the hero section (top part of the page)
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        clip: { x: 0, y: 0, width: 1366, height: 768 }
      }).catch(err => {
        console.error(`Error taking screenshot for ${url}: ${err.message}`);
        return null;
      });
      
      await page.close();
      return screenshot;
    } catch (error) {
      console.error(`Error capturing screenshot for ${url}: ${error.message}`);
      return null;
    }
  }

  async searchAndAnalyze(searchQuery, location) {
    if (!this.browser || !this.page) {
      throw new Error('WebsiteAnalyzer not initialized. Call initialize() first.');
    }

    console.log(`Analyzing businesses for: ${searchQuery} in ${location}`);
    
    try {
      // Navigate to Google Maps
      await this.page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2', timeout: 60000 });
      await this.page.waitForSelector('#searchboxinput', { visible: true, timeout: 60000 });
      await this.page.click('#searchboxinput');
      
      // Enter search query
      const fullQuery = `${searchQuery} in ${location}`;
      await this.page.type('#searchboxinput', fullQuery);
      await this.page.keyboard.press('Enter');
      await this.waitFor(5000);

      // Process results
      const results = await this.scrapeResults(searchQuery, location);
      return results;
    } catch (error) {
      console.error('Error in searchAndAnalyze:', error);
      throw error;
    }
  }

  async scrapeResults(category, location) {
    let noNewResultsScrolls = 0;
    const maxNoNewResultsScrolls = 5;
    let pageBusinessNames = new Set();

    while (noNewResultsScrolls < maxNoNewResultsScrolls) {
      try {
        const businessElements = await this.page.$$('.Nv2PK');
        let foundNewBusiness = false;

        for (const element of businessElements) {
          try {
            const nameElement = await element.$('.qBF1Pd');
            if (!nameElement) continue;

            const name = await this.page.evaluate(el => el.textContent.trim().toLowerCase(), nameElement)
              .catch(() => null);
            if (!name || processedBusinesses.has(name)) continue;

            processedBusinesses.add(name);
            pageBusinessNames.add(name);
            foundNewBusiness = true;

            // Click on the listing to show details
            await nameElement.click().catch(err => {
              console.error(`Failed to click on ${name}: ${err.message}`);
              return;
            });
            await this.waitFor(3000);

            // Get business details
            const details = await this.extractBusinessDetails(category, location).catch(err => {
              console.error(`Failed to extract details for ${name}: ${err.message}`);
              return null;
            });
            
            if (details && details.websiteUrl) {
              try {
                // Evaluate website
                const evaluation = await evaluateWebsite(details.websiteUrl);
                console.log(`Evaluated: ${details.name} | Score: ${evaluation.score}/100`);
                
                const business = {
                  ...details,
                  websiteScore: evaluation.score,
                  issues: evaluation.issues || [],
                  screenshot: await this.captureScreenshot(details.websiteUrl)
                };

                this.allBusinesses.push(business);

                // Add to CSV immediately after analysis
                await this.contactTracker.addBusinesses([business]);

                // Store low scoring businesses for later report generation
                if (business.websiteScore <= QUALITY_THRESHOLD) {
                  this.lowScoringBusinesses.push(business);
                }

                // Generate reports for low scoring businesses if we have enough data
                if (this.allBusinesses.length >= BATCH_SIZE) {
                  await this.generateReportsForLowScoring();
                }
              } catch (err) {
                console.error(`Failed to process website for ${details.name}: ${err.message}`);
              }
            }

            await this.page.keyboard.press('Escape').catch(() => {});
            await this.waitFor(1000);
          } catch (businessError) {
            console.error('Error processing business:', businessError.message);
            continue;
          }
        }

        // Scroll logic
        try {
          const scrollContainer = await this.page.$('div[role="feed"]');
          if (scrollContainer) {
            await this.page.evaluate(container => {
              container.scrollTop = container.scrollHeight;
            }, scrollContainer).catch(() => {});
            await this.waitFor(3000);

            if (!foundNewBusiness) {
              noNewResultsScrolls++;
            } else {
              noNewResultsScrolls = 0;
            }
          } else {
            break;
          }
        } catch (scrollError) {
          console.error('Error during scroll:', scrollError.message);
          noNewResultsScrolls++;
        }
      } catch (error) {
        console.error('Error in main scraping loop:', error.message);
        noNewResultsScrolls++;
      }
    }

    // Generate any remaining reports at the end
    if (this.lowScoringBusinesses.length > 0) {
      await this.generateReportsForLowScoring().catch(err => {
        console.error('Error generating final reports:', err.message);
      });
    }

    return this.allBusinesses;
  }

  async extractBusinessDetails(category, location) {
    const details = {
      name: '',
      address: '',
      phoneNumber: '',
      rating: '',
      websiteUrl: null,
      category: category || 'Business',  // Default category if none provided
      location: location || 'Unknown Location'  // Default location if none provided
    };

    // Get name
    const nameElement = await this.page.$('h1.DUwDvf');
    if (nameElement) {
      details.name = await this.page.evaluate(el => el.textContent.trim(), nameElement);
    }

    // Get address
    const addressElement = await this.page.$('button[data-item-id="address"]');
    if (addressElement) {
      details.address = await this.page.evaluate(el => el.textContent.trim(), addressElement);
    }

    // Get phone
    const phoneElement = await this.page.$('button[data-item-id^="phone:"]');
    if (phoneElement) {
      details.phoneNumber = await this.page.evaluate(el => el.textContent.replace(/\\s+/g, ''), phoneElement);
    }

    // Get rating
    const ratingElement = await this.page.$('.F7nice');
    if (ratingElement) {
      details.rating = await this.page.evaluate(el => el.textContent.trim(), ratingElement);
    }

    // Get website URL
    const websiteElement = await this.page.$('a[data-item-id="authority"]');
    if (websiteElement) {
      details.websiteUrl = await this.page.evaluate(el => el.href, websiteElement);
    }

    return details;
  }

  async generateBatchReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.outputDir, `batch_report_${timestamp}.html`);
    
    // Get top 3 competitors (highest scoring businesses)
    const competitors = [...this.allBusinesses]
      .sort((a, b) => b.websiteScore - a.websiteScore)
      .slice(0, 3);

    // Convert screenshots to data URLs
    const competitorScreenshots = await Promise.all(
      competitors.map(async comp => {
        if (comp.screenshot) {
          return `data:image/jpeg;base64,${comp.screenshot.toString('base64')}`;
        }
        return null;
      })
    );

    // Generate HTML for each business in the batch
    const businessReports = await Promise.all(
      this.currentBatch.map(async (business) => {
        const screenshotDataUrl = business.screenshot 
          ? `data:image/jpeg;base64,${business.screenshot.toString('base64')}`
          : null;

        // Safely handle issues whether they're undefined, string, or array
        const issuesList = business.issues 
          ? (Array.isArray(business.issues) 
              ? business.issues 
              : business.issues.split(';')
            ).map(issue => `<li>${issue.trim()}</li>`).join('')
          : '<li>No issues found</li>';

        return `
          <div class="business-report">
            <h2>${business.name}</h2>
            ${screenshotDataUrl ? `
              <div class="screenshot">
                <h3>Website Screenshot</h3>
                <img src="${screenshotDataUrl}" alt="${business.name} website" style="max-width: 100%; height: auto;">
              </div>
            ` : ''}
            <div class="score-section">
              <h3>Website Score: ${business.websiteScore}/100</h3>
              <div class="score-circle ${business.websiteScore >= 70 ? 'high' : business.websiteScore >= 50 ? 'medium' : 'low'}">
                ${business.websiteScore}
              </div>
            </div>
            <div class="details-section">
              <p><strong>Website:</strong> <a href="${business.websiteUrl}" target="_blank">${business.websiteUrl}</a></p>
              <p><strong>Address:</strong> ${business.address}</p>
              <p><strong>Phone:</strong> ${business.phoneNumber}</p>
              <p><strong>Rating:</strong> ${business.rating}</p>
            </div>
            <div class="issues-section">
              <h3>Issues Identified:</h3>
              <ul>
                ${issuesList}
              </ul>
            </div>
          </div>
        `;
      })
    );

    // Generate competitor section
    const competitorSection = `
      <div class="competitors-section">
        <h2>Top Performing Competitors</h2>
        <div class="competitor-grid">
          ${competitors.map((comp, i) => `
            <div class="competitor">
              <h3>${comp.name}</h3>
              ${competitorScreenshots[i] ? `
                <img src="${competitorScreenshots[i]}" alt="${comp.name} website" style="max-width: 100%; height: auto;">
              ` : ''}
              <p><strong>Score:</strong> ${comp.websiteScore}/100</p>
              <p><strong>Website:</strong> <a href="${comp.websiteUrl}" target="_blank">${comp.websiteUrl}</a></p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Website Analysis Batch Report</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
          .business-report { margin-bottom: 40px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          .score-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; margin: 20px 0; }
          .score-circle.high { background-color: #4CAF50; }
          .score-circle.medium { background-color: #FFC107; }
          .score-circle.low { background-color: #F44336; }
          .issues-section ul { padding-left: 20px; }
          .issues-section li { margin: 5px 0; }
          .screenshot { margin: 20px 0; }
          .competitor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
          .competitor { padding: 15px; border: 1px solid #eee; border-radius: 8px; }
          h1 { color: #333; }
          h2 { color: #444; margin-top: 30px; }
          h3 { color: #666; }
          a { color: #2196F3; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Website Analysis Batch Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        ${competitorSection}
        <h2>Analyzed Businesses</h2>
        ${businessReports.join('\n')}
      </body>
      </html>
    `;

    await fs.writeFile(reportPath, reportHtml);
    console.log(`Batch report generated: ${reportPath}`);
  }

  async waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateReport(business) {
    const reportPath = await this.reportGenerator.generateReport(
      business,
      {
        score: business.websiteScore,
        issues: Array.isArray(business.issues) ? business.issues : [business.issues]
      },
      [...this.allBusinesses]
        .filter(b => b.name !== business.name)
        .sort((a, b) => b.websiteScore - a.websiteScore)
        .slice(0, 3)
        .map(comp => ({
          url: comp.websiteUrl,
          score: comp.websiteScore,
          name: comp.name,
          heroDataUrl: comp.screenshot ? `data:image/jpeg;base64,${comp.screenshot.toString('base64')}` : null
        })),
      business.screenshot ? `data:image/jpeg;base64,${business.screenshot.toString('base64')}` : null
    );
    
    // Update the business object with the report path
    business.reportPath = reportPath.reportPath;
    console.log(`Report generated for ${business.name}: ${business.reportPath}`);
    
    // Update CSV after each report generation
    await this.contactTracker.addBusinesses([business]);
    
    return business.reportPath;
  }

  async generateReportsForLowScoring() {
    // Generate reports for each low scoring business that hasn't been reported yet
    for (const business of this.lowScoringBusinesses) {
      if (!business.reportGenerated) {  // Add a flag to track if report was generated
        await this.generateReport(business);
        business.reportGenerated = true;
      }
    }
  }
}

// Example usage
async function main() {
  const analyzer = new WebsiteAnalyzer(process.argv[2] || 'restaurants');
  
  try {
    await analyzer.initialize();
    const results = await analyzer.searchAndAnalyze(
      process.argv[2] || 'restaurants',
      process.argv[3] || 'New York, NY'
    );
    console.log(`Analysis complete. Found ${results.length} businesses.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await analyzer.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = WebsiteAnalyzer; 