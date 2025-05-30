# Website Analyzer

A powerful tool that analyzes business websites by scraping Google Maps listings and generating comprehensive reports on their web presence. This tool helps identify businesses with suboptimal web presence and provides detailed analysis reports.

## Features

- 🔍 **Google Maps Integration**: Automatically scrapes business listings from Google Maps
- 📊 **Website Analysis**: Evaluates websites based on multiple criteria:
  - Performance and loading speed
  - Mobile responsiveness
  - SEO optimization
  - User experience
  - Technical implementation
- 📸 **Screenshot Capture**: Takes screenshots of business websites for visual reference
- 📑 **Report Generation**: Creates detailed HTML reports including:
  - Website scores and issues
  - Competitor analysis
  - Screenshots
  - Improvement recommendations
- 🏆 **Competitor Analysis**: Compares businesses against top-performing competitors
- ⚡ **Batch Processing**: Processes multiple businesses in batches for efficiency

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Deba97/WebsiteAnlayzer.git
cd WebsiteAnlayzer
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Basic Usage

Run the analyzer with default parameters:
```bash
node website-analyzer.js "business type" "location"
```

Example:
```bash
node website-analyzer.js "home care agencies" "Palm Springs, CA"
```

### Configuration

Key constants in `website-analyzer.js`:
- `QUALITY_THRESHOLD`: Score threshold for generating reports (default: 70)
- `BATCH_SIZE`: Number of businesses to process before generating reports (default: 20)

### Output

Reports are generated in the `analysis_reports` directory. Two types of reports are created:
1. Individual reports for businesses scoring below the quality threshold
2. Batch reports comparing multiple businesses

## Project Structure

- `website-analyzer.js`: Main script for scraping and analysis
- `website-evaluator.js`: Website evaluation logic
- `report-generator.js`: HTML report generation
- `test-report.js`: Test script for report generation

## Dependencies

- Puppeteer: Web scraping and screenshot capture
- Cheerio: HTML parsing
- Lighthouse: Website performance analysis

## Error Handling

The tool includes comprehensive error handling for:
- SSL certificate errors
- Protocol timeouts
- Website loading failures
- Screenshot capture issues
- Report generation errors

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details. 