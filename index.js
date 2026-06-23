import 'dotenv/config';
import { createClient } from '@vercel/kv';
import puppeteer from 'puppeteer';

// Immediately-invoked function to run the scraper
(async () => {
  // Check for the required environment variable
  if (!process.env.KV_URL) {
    console.error('FATAL: KV_URL environment variable is not defined.');
    process.exit(1); // Exit with an error code
  }

  const kv = createClient({ url: process.env.KV_URL });

  console.log('Scraping process started...');

  try {
    const browser = await puppeteer.launch({
      headless: "new", // Use the new headless mode
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

    await browser.close();
    console.log('Scraping process finished successfully.');

  } catch (error) {
    console.error('An error occurred during scraping:', error);
    process.exit(1); // Exit with an error code
  }
})();
