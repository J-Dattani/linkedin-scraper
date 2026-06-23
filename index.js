import { createClient } from '@vercel/kv';
import puppeteer from 'puppeteer';

// This is the main function that runs our scraper
async function runScraper() {
  // Check if the required secret is available from GitHub Actions
  if (!process.env.KV_URL) {
    console.error('FATAL: KV_URL secret is not available in the GitHub Actions environment.');
    process.exit(1); // Exit with an error
  }

  // Create the database client using the secret
  const kv = createClient({
    url: process.env.KV_URL,
    token: process.env.KV_TOKEN // Vercel KV now requires a token as well
  });

  console.log('Scraping process started...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.linkedin.com/in/jaymin-dattani-ba6695294/', { waitUntil: 'networkidle2' });

    console.log('Page loaded. Extracting data...');

    const data = await page.evaluate(() => {
      const getCleanText = (element) => element?.innerText.trim() || '';

      const profilePicture = document.querySelector('.pv-top-card-profile-picture__image')?.src || '';
      const aboutText = document.querySelector('.pv-about-section .inline-show-more-text')?.innerText.trim() || '';

      const experienceItems = [];
      document.querySelectorAll('#experience ~ .pvs-list__outer-container > ul > li.artdeco-list__item').forEach(item => {
        const title = getCleanText(item.querySelector('.mr1.t-bold > span[aria-hidden="true"]'));
        const companyAndDuration = getCleanText(item.querySelector('.t-14.t-normal > span[aria-hidden="true"]'));
        const description = getCleanText(item.querySelector('.pv-shared-text-with-see-more .inline-show-more-text'));
        
        if (title) {
            experienceItems.push({ title, companyAndDuration, description });
        }
      });

      const certificationItems = [];
      document.querySelectorAll('#licenses_and_certifications ~ .pvs-list__outer-container > ul > li.artdeco-list__item').forEach(item => {
        const title = getCleanText(item.querySelector('.mr1.t-bold > span[aria-hidden="true"]'));
        const issuer = getCleanText(item.querySelector('.t-14.t-normal > span[aria-hidden="true"]'));
        const image = item.querySelector('.pvs-entity__logo img')?.src || '';

        if (title) {
            certificationItems.push({ title, issuer, image });
        }
      });

      return {
        profilePicture,
        about: aboutText,
        experience: experienceItems,
        certifications: certificationItems,
        lastScraped: new Date().toISOString(),
      };
    });

    console.log('Data extracted. Saving to KV store...');
    await kv.set('linkedin-profile-data', data);

    console.log('Scraping process finished successfully.');

  } catch (error) {
    console.error('An error occurred during scraping:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the scraper
runScraper();
