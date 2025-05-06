const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

/**
 * Evaluate a website and return a score and issues
 * @param {string} url - The website URL to evaluate
 * @returns {Promise<Object>} - Website score and issues
 */
async function evaluateWebsite(url) {
  if (!url) return { score: 0, issues: ['No website URL provided'] };
  
  // Make sure URL has correct format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  console.log(`Evaluating website: ${url}`);
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1366, height: 768 },
    timeout: 60000
  });
  
  let score = 100; // Start with perfect score
  const issues = [];
  
  try {
    const page = await browser.newPage();
    
    // Set timeout for navigation to handle slow or non-responsive sites
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    }).catch(err => {
      issues.push(`Failed to load website: ${err.message}`);
      score -= 30;
      return null;
    });
    
    if (!response) {
      await browser.close();
      return { score: Math.max(0, score), issues };
    }
    
    // Check HTTP status
    const status = response.status();
    if (status >= 400) {
      issues.push(`Website returned HTTP error: ${status}`);
      score -= 30;
    }
    
    // Check if mobile-friendly
    const isMobile = await page.evaluate(() => {
      return window.matchMedia('(max-width: 768px)').matches || 
             document.querySelector('meta[name="viewport"]') !== null;
    });
    
    if (!isMobile) {
      issues.push('Website is not mobile-friendly');
      score -= 15;
    }
    
    // Check page load time
    const performanceTiming = await page.evaluate(() => {
      return {
        loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
        domContentLoaded: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart
      };
    });
    
    if (performanceTiming.loadTime > 3000) {
      issues.push(`Slow page load time: ${(performanceTiming.loadTime / 1000).toFixed(2)}s`);
      score -= 10;
    }
    
    // Check for SSL
    const isSecure = url.startsWith('https://');
    if (!isSecure) {
      issues.push('Website is not secure (no SSL/HTTPS)');
      score -= 15;
    }
    
    // Check for responsive design
    await page.setViewport({ width: 375, height: 667 }); // Mobile viewport
    await waitFor(1000);
    
    const isMobileResponsive = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return body.scrollWidth <= window.innerWidth;
    });
    
    if (!isMobileResponsive) {
      issues.push('Website is not responsive on mobile devices');
      score -= 15;
    }
    
    // Restore viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Check for basic SEO elements
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Check title
    const title = $('title').text().trim();
    if (!title || title.length < 10 || title.length > 60) {
      issues.push('Title tag is missing, too short, or too long');
      score -= 5;
    }
    
    // Check meta description
    const metaDescription = $('meta[name="description"]').attr('content');
    if (!metaDescription || metaDescription.length < 50 || metaDescription.length > 160) {
      issues.push('Meta description is missing, too short, or too long');
      score -= 5;
    }
    
    // Check for headings
    const h1Count = $('h1').length;
    if (h1Count === 0) {
      issues.push('No H1 heading found');
      score -= 5;
    } else if (h1Count > 1) {
      issues.push('Multiple H1 headings found');
      score -= 3;
    }
    
    // Check for images with alt text
    const images = $('img').toArray();
    const imagesWithoutAlt = images.filter(img => !$(img).attr('alt'));
    if (imagesWithoutAlt.length > 0 && images.length > 0) {
      const percentage = Math.round((imagesWithoutAlt.length / images.length) * 100);
      if (percentage > 30) {
        issues.push(`${percentage}% of images are missing alt text`);
        score -= 5;
      }
    }
    
    // Check for social media presence
    const hasSocialLinks = $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]').length > 0;
    if (!hasSocialLinks) {
      issues.push('No social media links found');
      score -= 5;
    }
    
    // Check for contact information
    const hasPhone = page.evaluate(() => {
      const text = document.body.innerText;
      return /(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(text) || 
             /\d{3}-\d{3}-\d{4}/.test(text);
    });
    
    const hasEmail = page.evaluate(() => {
      const text = document.body.innerText;
      return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
    });
    
    const hasContactForm = $('form').length > 0;
    
    if (!hasPhone && !hasEmail && !hasContactForm) {
      issues.push('No contact information (phone, email or contact form) found');
      score -= 10;
    }
    
    // Check for copyright date
    const copyrightText = $('.footer, footer, .copyright, [class*="copyright"]').text();
    if (copyrightText) {
      const currentYear = new Date().getFullYear();
      const copyrightYear = copyrightText.match(/\b(19|20)\d{2}\b/g);
      if (copyrightYear && Math.max(...copyrightYear) < currentYear - 1) {
        issues.push(`Outdated copyright year: ${Math.max(...copyrightYear)}`);
        score -= 5;
      }
    }
    
    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.complete || !img.naturalWidth).length;
    });
    
    if (brokenImages > 0) {
      issues.push(`${brokenImages} broken images found`);
      score -= 5;
    }
    
    // Calculate final score
    score = Math.max(0, score);
    
    // Give user a moment to see the final page
    await waitFor(2000);
    
  } catch (error) {
    console.error(`Error evaluating website: ${error.message}`);
    issues.push(`Error evaluating website: ${error.message}`);
    score = Math.max(0, score - 30);
  } finally {
    await browser.close();
  }
  
  return {
    score: Math.max(0, score),
    issues
  };
}

// Helper function to wait for a given time
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// If run directly (not imported)
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL to evaluate');
    process.exit(1);
  }
  
  evaluateWebsite(url)
    .then(result => {
      console.log('\nWebsite Evaluation Results:');
      console.log('------------------------');
      console.log(`Score: ${result.score}/100`);
      console.log('Issues:');
      result.issues.forEach(issue => console.log(`- ${issue}`));
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { evaluateWebsite }; 