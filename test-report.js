const WebsiteAnalyzer = require('./website-analyzer');

async function testReportGeneration() {
  const analyzer = new WebsiteAnalyzer();
  await analyzer.initialize();

  // Sample business data
  const sampleBusinesses = [
    {
      name: "Test Business 1",
      websiteUrl: "https://test1.com",
      websiteScore: 65,
      issues: ["Mobile not responsive", "Slow loading speed", "Missing meta tags"],
      address: "123 Test St",
      phoneNumber: "555-0123",
      rating: "4.5",
      category: "Restaurant",
      location: "New York, NY"
    },
    {
      name: "Test Business 2",
      websiteUrl: "https://test2.com",
      websiteScore: 85,
      issues: ["Minor SEO issues"],
      address: "456 Test Ave",
      phoneNumber: "555-0456",
      rating: "4.8",
      category: "Restaurant",
      location: "New York, NY"
    },
    {
      name: "Test Business 3",
      websiteUrl: "https://test3.com",
      websiteScore: 92,
      issues: ["No major issues"],
      address: "789 Test Blvd",
      phoneNumber: "555-0789",
      rating: "4.9",
      category: "Restaurant",
      location: "New York, NY"
    }
  ];

  // Add businesses to analyzer
  analyzer.allBusinesses = sampleBusinesses;
  analyzer.lowScoringBusinesses = [sampleBusinesses[0]]; // Only the one with score 65

  try {
    console.log("Testing report generation...");
    await analyzer.generateReportsForLowScoring();
    console.log("Test completed!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await analyzer.close();
  }
}

testReportGeneration(); 