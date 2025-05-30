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
    headless: 'new',
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
      issues.push(`Website completely inaccessible - ${err.message.includes('SSL') ? 'SSL certificate error prevents access' : 'server not responding or domain issues'}`);
      score = 10; // Set very low score for completely inaccessible websites
      return null;
    });
    
    if (!response) {
      await browser.close();
      return { score: Math.max(0, score), issues };
    }
    
    // Check HTTP status
    const status = response.status();
    if (status >= 400) {
      issues.push(`Website returns error ${status} - server configuration problems preventing access`);
      score = 15; // Very low score for HTTP errors
    }
    
    // Check if mobile-friendly
    const isMobile = await page.evaluate(() => {
      return window.matchMedia('(max-width: 768px)').matches || 
             document.querySelector('meta[name="viewport"]') !== null;
    });
    
    if (!isMobile) {
      issues.push('Mobile users cannot properly view your website - losing 60% of potential customers');
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
      issues.push(`Website loads too slowly (${(performanceTiming.loadTime / 1000).toFixed(2)}s) - visitors leave after 3 seconds`);
      score -= 10;
    }
    
    // Check for SSL
    const isSecure = response.securityDetails() !== null;
    const finalUrl = response.url(); // Get the final URL after any redirects
    
    if (!isSecure || !finalUrl.startsWith('https://')) {
      issues.push('Website lacks security certificate - Google penalizes unsecure sites in search rankings');
      score -= 15;
    } else {
      // Additional SSL checks
      const security = await response.securityDetails();
      if (security) {
        const validFrom = security.validFrom();
        const validTo = security.validTo();
        const now = Date.now() / 1000; // Convert to seconds to match Puppeteer's timestamp
        const daysUntilExpiry = Math.floor((validTo - now) / (60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          issues.push(`Security certificate expired ${Math.abs(daysUntilExpiry)} days ago - major security risk`);
          score -= 15;
        } else if (daysUntilExpiry < 30) {
          issues.push(`Security certificate expires in ${daysUntilExpiry} days - needs immediate renewal`);
          score -= 5;
        }
      }
    }

    // Check for mixed content
    const mixedContent = await page.evaluate(() => {
      return {
        insecureImages: Array.from(document.querySelectorAll('img[src^="http:"]')).length,
        insecureScripts: Array.from(document.querySelectorAll('script[src^="http:"]')).length,
        insecureLinks: Array.from(document.querySelectorAll('link[href^="http:"]')).length
      };
    });

    if (mixedContent.insecureImages > 0 || mixedContent.insecureScripts > 0 || mixedContent.insecureLinks > 0) {
      issues.push('Website has security vulnerabilities that browsers warn users about');
      score -= 5;
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
      issues.push('Website breaks on mobile devices - 70% of users will immediately leave');
      score -= 15;
    }
    
    // Restore viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Check for basic SEO elements
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Initialize SEO issues array
    const seoIssues = [];
    let seoScore = 100;
    
    // Check title
    const title = $('title').text().trim();
    if (!title) {
      seoIssues.push('Missing page title - invisible to Google search results');
      seoScore -= 10;
    } else if (title.length < 10) {
      seoIssues.push(`Page title too short (${title.length} chars) - poor Google search visibility`);
      seoScore -= 5;
    } else if (title.length > 60) {
      seoIssues.push(`Page title too long (${title.length} chars) - gets cut off in Google search`);
      seoScore -= 3;
    }
    
    // Check meta description
    const metaDescription = $('meta[name="description"]').attr('content');
    if (!metaDescription) {
      seoIssues.push('Missing meta description - no preview text in Google search results');
      seoScore -= 8;
    } else if (metaDescription.length < 50) {
      seoIssues.push(`Meta description too short (${metaDescription.length} chars) - wasted Google search space`);
      seoScore -= 4;
    } else if (metaDescription.length > 160) {
      seoIssues.push(`Meta description too long (${metaDescription.length} chars) - gets cut off in Google`);
      seoScore -= 3;
    }
    
    // Check for headings hierarchy
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    
    if (h1Count === 0) {
      seoIssues.push('No main heading (H1) - Google cannot understand page topic');
      seoScore -= 8;
    } else if (h1Count > 1) {
      seoIssues.push(`Multiple main headings (${h1Count}) confuse Google about page focus`);
      seoScore -= 5;
    }
    
    if (h2Count === 0) {
      seoIssues.push('No section headings (H2) - poor content structure for Google');
      seoScore -= 3;
    }
    
    // Check for canonical URL
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) {
      seoIssues.push('Missing canonical URL - Google may penalize for duplicate content');
      seoScore -= 3;
    }
    
    // Check for robots meta tag
    const robotsMeta = $('meta[name="robots"]').attr('content');
    if (!robotsMeta) {
      seoIssues.push('Missing robots directive - unclear Google indexing instructions');
      seoScore -= 2;
    } else if (robotsMeta.includes('noindex') || robotsMeta.includes('nofollow')) {
      seoIssues.push(`Website blocked from Google search results: ${robotsMeta}`);
      seoScore -= 10;
    }
    
    // Check for structured data
    const structuredData = $('script[type="application/ld+json"]');
    if (structuredData.length === 0) {
      seoIssues.push('Missing business schema markup - reduced Google search features');
      seoScore -= 5;
    }
    
    // Check for Open Graph tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    
    if (!ogTitle || !ogDescription || !ogImage) {
      seoIssues.push('Poor social media sharing - no preview images or text on Facebook/LinkedIn');
      seoScore -= 3;
    }
    
    // Check for mobile viewport
    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport) {
      seoIssues.push('Missing mobile viewport - Google penalizes non-mobile-friendly sites');
      seoScore -= 5;
    }
    
    // Add SEO category to issues
    if (seoIssues.length > 0) {
      seoIssues.forEach(issue => {
        issues.push(issue);
      });
      
      // Impact overall score proportionally
      score -= Math.min(20, (100 - seoScore) / 4); // Max 20 point penalty on overall score
    }
    
    // Check for images with alt text
    const images = $('img').toArray();
    const imagesWithoutAlt = images.filter(img => !$(img).attr('alt'));
    if (imagesWithoutAlt.length > 0 && images.length > 0) {
      const percentage = Math.round((imagesWithoutAlt.length / images.length) * 100);
      if (percentage > 30) {
        issues.push(`${percentage}% of images lack descriptions - hurting Google image search rankings`);
        score -= 5;
      }
    }
    
    // Check for social media presence
    const hasSocialLinks = $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]').length > 0;
    if (!hasSocialLinks) {
      issues.push('No social media links - missing opportunities for customer engagement and referrals');
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
      issues.push('No clear contact method - potential customers cannot reach you easily');
      score -= 10;
    }
    
    // Check for copyright date
    const copyrightText = $('.footer, footer, .copyright, [class*="copyright"]').text();
    if (copyrightText) {
      const currentYear = new Date().getFullYear();
      const copyrightYear = copyrightText.match(/\b(19|20)\d{2}\b/g);
      if (copyrightYear && Math.max(...copyrightYear) < currentYear - 1) {
        issues.push(`Outdated copyright (${Math.max(...copyrightYear)}) makes business appear inactive or abandoned`);
        score -= 5;
      }
    }
    
    // Check for broken images
    const brokenImages = await page.evaluate(async () => {
      // Helper function to check if an image URL is valid
      const isValidImageUrl = (url) => {
        if (!url) return false;
        // Check if URL is relative
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
          const a = document.createElement('a');
          a.href = url;
          url = a.href; // Convert to absolute URL
        }
        return url;
      };

      // Wait a bit for images to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get all images
      const images = Array.from(document.querySelectorAll('img'));
      const brokenCount = {
        total: 0,
        reasons: []
      };

      // Check each image
      for (const img of images) {
        const src = img.getAttribute('src');
        
        // Skip if no src
        if (!src) {
          brokenCount.total++;
          brokenCount.reasons.push('Image missing src attribute');
          continue;
        }
        
        // Skip SVG images and data URLs as they don't have natural dimensions
        if (src.toLowerCase().endsWith('.svg') || src.startsWith('data:')) {
          continue;
        }
        
        // Skip tracking pixels and tiny images
        if (img.width <= 1 || img.height <= 1) {
          continue;
        }
        
        // Check if image failed to load
        if (!img.complete) {
          brokenCount.total++;
          brokenCount.reasons.push(`Image failed to load: ${src}`);
          continue;
        }

        // Only check dimensions for images that should have them
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          // Double check if it's really broken by creating a test image
          const testImg = new Image();
          testImg.src = src;
          if (testImg.complete && testImg.naturalWidth > 0) {
            continue; // Image is actually fine
          }
          brokenCount.total++;
          brokenCount.reasons.push(`Image has no dimensions: ${src}`);
        }
      }

      return brokenCount;
    });
    
    if (brokenImages.total > 0) {
      const uniqueReasons = [...new Set(brokenImages.reasons)];
      issues.push(`${brokenImages.total} broken images create unprofessional appearance and hurt credibility`);
      score -= Math.min(15, brokenImages.total * 3); // Cap the penalty at 15 points
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