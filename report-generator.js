const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor(searchQuery) {
    this.searchQuery = searchQuery ? searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'general';
    this.outputDir = path.join(process.cwd(), 'analysis_reports', this.searchQuery);
  }

  async initialize() {
    await fs.mkdir(this.outputDir, { recursive: true }).catch(console.error);
  }

  async copyScreenshotToReport(screenshot, businessName) {
    if (!screenshot) return null;
    try {
      // Convert to base64
      const base64Image = screenshot.toString('base64');
      // Return data URL
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error(`Error processing screenshot for ${businessName}:`, error);
      return null;
    }
  }

  async generateReport(businessInfo, websiteAnalysis, competitors, heroDataUrl) {
    console.log(`Generating report for ${businessInfo.name}...`);
    
    // Generate the report HTML
    const reportHtml = this.generateReportHtml(businessInfo, websiteAnalysis, competitors, heroDataUrl);
    
    // Save the report
    const reportPath = path.join(
      this.outputDir, 
      `${businessInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.html`
    );
    
    await fs.writeFile(reportPath, reportHtml);
    return { reportPath };
  }

  generateReportHtml(businessInfo, websiteAnalysis, competitors, heroDataUrl) {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Format website analysis details
    let websiteScoreDetails = '';
    if (websiteAnalysis) {
      // Remove category labels in square brackets from issues
      const formattedIssues = websiteAnalysis.issues.map(issue => {
        // Remove the category label in square brackets
        return issue.replace(/^\[.*?\]\s*/, '');
      });
      
      const issuesList = formattedIssues.map(issue => `<li>${issue}</li>`).join('');
      websiteScoreDetails = `
        <div class="score-container">
          <div class="score-circle ${websiteAnalysis.score >= 80 ? 'high' : websiteAnalysis.score >= 60 ? 'medium' : 'low'}">
            ${websiteAnalysis.score}
          </div>
          <div class="score-details">
            <h3>Areas for Improvement:</h3>
            <ul class="issues-list">
              ${issuesList}
            </ul>
          </div>
        </div>
      `;
    }

    // Format competitors with their scores and strengths - limit to top 3
    const topCompetitors = competitors.slice(0, 3);
    const competitorsHtml = `
      <div class="competitors-row">
        ${topCompetitors.map(competitor => {
          const domain = new URL(competitor.url).hostname;
          return `
            <div class="competitor-card">
              <h3>${competitor.name} <span class="competitor-domain">(${domain})</span></h3>
              <div class="competitor-content">
                ${competitor.heroDataUrl ? 
                  `<div class="screenshot-container">
                    <img src="${competitor.heroDataUrl}" alt="${competitor.name} Screenshot" />
                  </div>` : 
                  '<p class="no-screenshot">Screenshot unavailable</p>'
                }
                <div class="competitor-score">
                  <div class="score-badge high">${competitor.score}</div>
                  <div class="competitor-strengths">
                    <h4>Why They Rank High:</h4>
                    <ul>
                      <li>Modern, responsive design</li>
                      <li>Clear calls-to-action</li>
                      <li>Fast loading times</li>
                      ${competitor.score > 90 ? '<li>Excellent user experience</li>' : ''}
                      ${competitor.score > 85 ? '<li>Strong SEO foundation</li>' : ''}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Generate personalized section with social proof
    const businessNiche = businessInfo.category;
    const city = businessInfo.location.split(',')[0].trim();
    
    // Create the custom "Why This Matters" section with a more attractive design
    const whyThisMattersSection = `
      <div class="section why-matters-section">
        <h2>Why This Matters</h2>
        <div class="impact-cards">
          <div class="impact-card">
            <div class="card-icon"><i class="fas fa-tachometer-alt"></i></div>
            <div class="card-content">
              <h3>If your site is slow, you're invisible.</h3>
              <p>Google buries sluggish, unoptimized websites. Speed matters.</p>
            </div>
          </div>
          <div class="impact-card">
            <div class="card-icon"><i class="fas fa-search"></i></div>
            <div class="card-content">
              <h3>SEO isn't luck. It's strategy.</h3>
              <p>We build websites that rank and convert—because pretty isn't enough.</p>
            </div>
          </div>
          <div class="impact-card">
            <div class="card-icon"><i class="fas fa-chart-line"></i></div>
            <div class="card-content">
              <h3>Your website should close deals, not collect dust.</h3>
              <p>We helped a ${businessInfo.category} business in ${city} add $20K in sales last month. You're next.</p>
            </div>
          </div>
          <div class="impact-card">
            <div class="card-icon"><i class="fas fa-trophy"></i></div>
            <div class="card-content">
              <h3>Stop handing customers to your competitors.</h3>
              <p>Modern design + smart SEO = more traffic, more trust, more revenue.</p>
            </div>
          </div>
          <div class="impact-card highlight-card">
            <div class="card-icon"><i class="fas fa-question-circle"></i></div>
            <div class="card-content">
              <h3>Why us?</h3>
              <p>We fuse high-converting design with proven marketing tactics—so your site doesn't just look good, it works hard.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create a new service packages section with your pricing
    const servicesHtml = `
      <div class="services-section">
        <div class="service-card">
          <div class="service-badge">Most Popular</div>
          <h3>Website Redesign</h3>
          <div class="price">$899</div>
          <div class="price-detail">One-Time</div>
          <ul>
            <li>Modern, responsive design</li>
            <li>Mobile optimization</li>
            <li>SEO foundation setup</li>
            <li>Contact forms & lead capture</li>
            <li>Custom branding integration</li>
          </ul>
          <a href="https://buy.stripe.com/4gM8wQ1I56s2dNk23b0oM02" class="button primary">Get Started Now</a>
        </div>
        <div class="service-card premium">
          <div class="service-badge">Best Value</div>
          <h3>Digital Marketing & Lead Generation</h3>
          <div class="price">$1,300</div>
          <div class="price-detail">Monthly</div>
          <ul>
            <li>Targeted ad campaigns</li>
            <li>Content creation & management</li>
            <li>SEO optimization</li>
            <li>Lead nurturing sequences</li>
            <li>Performance analytics</li>
          </ul>
          <a href="https://buy.stripe.com/28E5kE72pcQq4cKePX0oM01" class="button primary">Get Started Now</a>
        </div>
        <div class="consultation-link">
          <a href="https://calendly.com/njobaseki97/30min" class="button primary">Schedule a Free Consultation</a>
        </div>
      </div>
    `;

    // Generate the full report HTML using the original structure and new colors
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Digital Presence Report: ${businessInfo.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
        <style>
          :root {
            --primary-color: #0D3B66; /* Navy blue from logo */
            --secondary-color: #F39C12; /* Orange from logo */
            --light-bg: #f8f9fa;
            --text-color: #333;
            --light-text: #fff;
            --border-color: #eee;
            --shadow: 0 3px 10px rgba(0,0,0,0.1);
          }
          
          body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            color: var(--text-color);
            background-color: #f5f5f5;
            line-height: 1.6;
          }
          .page-container {
            max-width: 850px;
            margin: 20px auto;
            background: white;
            box-shadow: var(--shadow);
            border-radius: 8px;
            overflow: hidden;
          }
          .report-header {
            background: var(--primary-color);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .logo-container {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          .logo {
            max-width: 200px;
            height: auto;
          }
          .report-header h1 {
            font-family: 'Poppins', sans-serif;
            font-size: 32px;
            margin: 0;
            font-weight: 700;
            position: relative;
          }
          .report-header p {
            margin: 10px 0 0;
            font-size: 16px;
            opacity: 0.9;
            position: relative;
          }
          .section {
            padding: 30px;
            border-bottom: 1px solid var(--border-color);
          }
          .section:last-child {
            border-bottom: none;
          }
          h2 {
            font-family: 'Poppins', sans-serif;
            color: var(--primary-color);
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--secondary-color);
          }
          h3 {
            font-family: 'Poppins', sans-serif;
            color: var(--primary-color);
            font-size: 18px;
            margin: 20px 0 15px;
          }
          
          /* Score display styling */
          .score-container {
            display: flex;
            align-items: flex-start;
            margin-bottom: 25px;
            padding: 20px;
            background-color: var(--light-bg);
            border-radius: 8px;
          }
          .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-right: 25px;
            flex-shrink: 0;
          }
          .score-circle.high {
            background-color: #4CAF50;
          }
          .score-circle.medium {
            background-color: #FFC107;
          }
          .score-circle.low {
            background-color: #F44336;
          }
          .score-details {
            flex-grow: 1;
          }
          .issues-list {
            margin: 10px 0 0;
            padding-left: 20px;
          }
          .issues-list li {
            margin-bottom: 8px;
          }
          
          /* Competitor card styling */
          .competitor-score {
            display: flex;
            padding: 15px;
          }
          .score-badge {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
            background-color: #4CAF50;
            color: white;
            margin-right: 15px;
          }
          .screenshot-container {
            width: 100%;
            overflow: hidden;
          }
          .screenshot-container img {
            width: 100%;
            height: auto;
            display: block;
          }
          
          /* Why This Matters section */
          .why-matters-section {
            background-color: var(--light-bg);
            padding: 40px 30px;
          }
          .impact-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
          }
          .impact-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: var(--shadow);
            display: flex;
            align-items: flex-start;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border-top: 4px solid var(--secondary-color);
          }
          .impact-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          }
          .highlight-card {
            background: var(--primary-color);
            color: white;
            grid-column: 1 / -1;
          }
          .highlight-card h3, .highlight-card p {
            color: white;
          }
          .card-icon {
            background: var(--secondary-color);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            flex-shrink: 0;
          }
          .highlight-card .card-icon {
            background: white;
            color: var(--primary-color);
          }
          .card-icon i {
            font-size: 20px;
          }
          .card-content h3 {
            margin: 0 0 10px;
            font-size: 18px;
            line-height: 1.3;
          }
          .card-content p {
            margin: 0;
            font-size: 15px;
          }
          
          /* Competitors section */
          .competitors-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
          }
          .competitor-card {
            margin-bottom: 25px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
            transition: box-shadow 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }
          .competitor-card:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          .competitor-card h3 {
            margin: 0;
            padding: 15px;
            background-color: var(--light-bg);
            border-bottom: 1px solid var(--border-color);
            color: var(--primary-color);
          }
          .competitor-domain {
            font-size: 14px;
            font-weight: normal;
            opacity: 0.7;
          }
          .competitor-content {
            display: flex;
            flex-direction: column;
          }
          .competitor-strengths {
            flex-grow: 1;
          }
          .competitor-strengths h4 {
            margin: 0 0 10px;
            font-size: 16px;
            color: var(--primary-color);
          }
          .competitor-strengths ul {
            margin: 0;
            padding-left: 20px;
          }
          .competitor-strengths li {
            margin-bottom: 5px;
            font-size: 14px;
          }
          
          /* Services section styling */
          .services-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 20px;
            margin-bottom: 30px;
          }
          .service-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: var(--shadow);
            position: relative;
            border: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .service-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          }
          .service-card.premium {
            border-top: 4px solid var(--secondary-color);
          }
          .service-badge {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--secondary-color);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
          }
          .service-card h3 {
            text-align: center;
            margin-top: 15px;
            margin-bottom: 20px;
            font-size: 22px;
          }
          .price {
            font-size: 36px;
            font-weight: 700;
            text-align: center;
            color: var(--primary-color);
            margin-bottom: 5px;
          }
          .price-detail {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
          }
          .service-card ul {
            margin: 0 0 25px;
            padding-left: 20px;
            flex-grow: 1;
          }
          .service-card li {
            margin-bottom: 10px;
          }
          
          /* Consultation link styling */
          .consultation-link {
            grid-column: 1 / -1;
            text-align: center;
            margin-top: 20px;
            padding: 20px;
            background: var(--light-bg);
            border-radius: 8px;
          }
          
          /* Button styles */
          .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: var(--secondary-color);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: all 0.3s;
            text-align: center;
            box-shadow: 0 3px 8px rgba(0,0,0,0.1);
            font-size: 16px;
          }
          .button:hover {
            background-color: var(--primary-color);
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.15);
          }
          .buttons-container {
            text-align: center;
            margin-top: 30px;
          }
          
          /* Footer */
          .footer {
            text-align: center;
            padding: 30px 20px;
            background-color: var(--primary-color);
            color: white;
            font-size: 14px;
          }
          
          @media (max-width: 768px) {
            .impact-cards {
              grid-template-columns: 1fr;
            }
            .section {
              padding: 20px;
            }
            .services-section {
              grid-template-columns: 1fr;
            }
            .competitors-row {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="report-header">
            <h1>Digital Presence Analysis</h1>
            <p>Prepared exclusively for: ${businessInfo.name}</p>
          </div>
          
          <div class="section">
            <h2>Your Current Digital Presence</h2>
            ${heroDataUrl ? `
              <div class="screenshot-container">
                <img src="${heroDataUrl}" alt="${businessInfo.name} Website Screenshot" />
              </div>
            ` : '<p style="text-align:center;"><em>No website screenshot available</em></p>'}
            
            ${websiteAnalysis ? websiteScoreDetails : `
              <p>No website was found for your business. This presents a significant opportunity to establish a strong online presence and gain a competitive advantage in your market.</p>
            `}
          </div>
          
          ${whyThisMattersSection}
          
          <div class="section">
            <h2>Top Performing Competitors</h2>
            ${competitors.length > 0 ? competitorsHtml : `
              <p>We weren't able to find strong competitors in your area. This means you have a unique opportunity to become the digital leader in your local market.</p>
            `}
          </div>
          
          <div class="section">
            <h2>Our Services</h2>
            <p>Based on our analysis, here are the recommended services to improve your digital presence and generate more leads for your business:</p>
            ${servicesHtml}
          </div>
          
          <div class="footer">
            Report generated on ${currentDate} | © ${new Date().getFullYear()} New Hope Solutions - Website Analysis & Optimization
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = ReportGenerator; 