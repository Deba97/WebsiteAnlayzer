# Business Website Evaluator

This tool scrapes Google Maps to find businesses in specified categories, evaluates their websites, and generates a CSV file of potential clients for web design services.

## Features

- Includes 10 pre-researched business categories most likely to need website improvements
- Contains 20 targeted locations based on research of areas with businesses likely to have outdated websites
- Fully automated with no user input required - just run and go!
- Automatically scrapes business details including name, address, phone number, and website URL
- Evaluates website quality based on multiple factors:
  - Mobile-friendliness
  - Page load speed
  - HTTPS/SSL security
  - SEO elements (title, meta description, headings)
  - Responsive design
  - Contact information
  - Image optimization
  - Social media presence
  - Copyright date currency
- Generates a CSV file of businesses with websites that score below a quality threshold
- Perfect for web design agencies looking to find potential clients

## Project Structure

- **main.js** - Primary script that handles business scraping and CSV generation
- **website-evaluator.js** - Evaluates website quality using multiple criteria
- **selector-finder.js** - Helper script for identifying Google Maps selectors
- **scroll-analyzer.js** - Tool for analyzing and optimizing scrolling behavior

## Targeted Business Categories

The tool targets these business categories:
1. Restaurants
2. Plumbers
3. Lawyers
4. Dentists
5. Real estate agents
6. Home services
7. Construction companies
8. Accountants
9. Small wineries
10. Local bakeries

## Targeted Locations

Based on research, the tool targets smaller cities and areas that are more likely to have businesses with outdated websites:
1. Greensboro, NC
2. Greenville, SC
3. Columbia, SC
4. Charleston, SC
5. Boise, ID
6. McAllen, TX
7. Fort Myers, FL
8. Cedar City, UT
9. St. George, UT
10. Raleigh, NC
11. Augusta, GA
12. Bedford-Stuyvesant, NY
13. Bensonhurst, NY
14. Astoria, NY
15. Bayside, NY
16. Elmhurst, NY
17. Flushing, NY
18. Dunedin, FL
19. Albuquerque, NM
20. Las Cruces, NM

## Installation

1. Make sure you have Node.js installed (version 14 or higher)
2. Clone this repository
3. Install dependencies:
   ```
   npm install
   ```

## Usage

Simply run the main script to start the automated process:

```
npm start
```

To find the correct selectors for Google Maps:

```
npm run find-selectors "search query"
```

To analyze scrolling behavior:

```
node scroll-analyzer.js "search query"
```

## How it Works

1. **Scraping**: Uses Puppeteer to scrape Google Maps for businesses in the selected category and location
2. **Scrolling**: Implements advanced scrolling techniques to load more results (up to 100 businesses)
3. **Evaluation**: Analyzes each business's website using multiple criteria
4. **Filtering**: Identifies businesses with website scores below the quality threshold
5. **Reporting**: Generates a CSV file with potential clients for web design services

## Customization

You can modify the following in the `main.js` file:
- `BUSINESS_CATEGORIES`: Add or remove business categories
- `TOP_LOCATIONS`: Add or remove target locations
- `QUALITY_THRESHOLD`: Adjust the website quality threshold (default: 60)
- `MAX_BUSINESSES`: Change the maximum number of businesses to collect per category/location (default: 100)

## Legal Considerations

This tool is designed for legitimate business prospecting purposes only. Be aware that web scraping may be subject to legal restrictions. Always:

1. Respect website terms of service
2. Follow robots.txt rules
3. Implement rate limiting to avoid overloading servers
4. Ensure compliance with applicable laws and regulations
5. Obtain proper consent before contacting businesses

## License

This project is licensed under the MIT License - see the LICENSE file for details. 