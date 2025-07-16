const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function htmlToPdf(url, outputPath) {
  console.log(`Converting ${url} to PDF...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport for consistent rendering
  await page.setViewport({ width: 1200, height: 800 });
  
  // Navigate to the URL
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // Generate PDF with print-like settings
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });
  
  await browser.close();
  
  // Save PDF to file
  fs.writeFileSync(outputPath, pdf);
  console.log(`PDF saved to ${outputPath}`);
  
  return outputPath;
}

// Command line usage
if (require.main === module) {
  const url = process.argv[2];
  const outputPath = process.argv[3] || 'output.pdf';
  
  if (!url) {
    console.error('Usage: node html-to-pdf.js <url> [output-path]');
    process.exit(1);
  }
  
  htmlToPdf(url, outputPath)
    .then(() => console.log('Conversion complete!'))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { htmlToPdf };