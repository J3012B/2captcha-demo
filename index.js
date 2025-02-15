import puppeteer from 'puppeteer';
import { Solver } from '2captcha';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

const solver = new Solver(process.env.CAPTCHA_API_KEY);
const pageUrl = 'https://2captcha.com/demo/recaptcha-v2';

async function waitForRecaptchaLoad(page) {
	try {
		await page.waitForFunction(() => {
			return typeof window.___grecaptcha_cfg !== 'undefined' && 
				   Object.keys(window.___grecaptcha_cfg.clients).length > 0;
		}, { timeout: 60000 });
		return true;
	} catch (error) {
		console.error('Timeout waiting for reCAPTCHA to initialize');
		return false;
	}
}

async function findRecaptchaClients(page) {
	return page.evaluate(`function findRecaptchaClients() {
		if (typeof (___grecaptcha_cfg) !== 'undefined') {
			return Object.entries(___grecaptcha_cfg.clients).map(([cid, client]) => {
				const data = { id: cid, version: cid >= 10000 ? 'V3' : 'V2' };
				const objects = Object.entries(client).filter(([_, value]) => value && typeof value === 'object');

				objects.forEach(([toplevelKey, toplevel]) => {
					const found = Object.entries(toplevel).find(([_, value]) => (
						value && typeof value === 'object' && 'sitekey' in value && 'size' in value
					));

					if (typeof toplevel === 'object' && toplevel instanceof HTMLElement && toplevel['tagName'] === 'DIV') {
						data.pageurl = toplevel.baseURI;
					}

					if (found) {
						const [sublevelKey, sublevel] = found;

						data.sitekey = sublevel.sitekey;
						const callbackKey = data.version === 'V2' ? 'callback' : 'promise-callback';
						const callback = sublevel[callbackKey];
						if (!callback) {
							data.callback = null;
							data.function = null;
						} else {
							data.function = callback;
							const keys = [cid, toplevelKey, sublevelKey, callbackKey].map((key) => \`['\${key}']\`).join('');
							data.callback = \`___grecaptcha_cfg.clients\${keys}\`;
						}
					}
				});
				return data;
			});
		}
		return [];
	}
	
	findRecaptchaClients()`);
}

async function solveCaptcha(page) {
	// Get all reCAPTCHA clients from the page
	const clients = await findRecaptchaClients(page);
	
	if (clients.length === 0) {
		console.error('No reCAPTCHA clients found on the page');
		return false;
	}

	// Use the first V2 captcha found
	const captcha = clients.find(client => client.version === 'V2');
	
	if (!captcha) {
		console.error('No V2 reCAPTCHA found on the page');
		return false;
	}

	console.log('Found reCAPTCHA:', {
		version: captcha.version,
		sitekey: captcha.sitekey,
		hasCallback: !!captcha.callback
	});

	try {
		const result = await solver.recaptcha(
			captcha.sitekey,
			pageUrl,
		);

		console.log('Captcha solved:', result.id);

		// Insert the solution and execute callback if available
		await page.evaluate(({ token, callback }) => {
			// Set the response in textarea
			document.querySelector('textarea[name="g-recaptcha-response"]').value = token;
			
			// Execute callback if available
			if (callback) {
				const callbackFn = new Function(`return ${callback}`)();
				if (typeof callbackFn === 'function') {
					console.log('Executing reCAPTCHA callback');
					callbackFn(token);
				}
			}
		}, { 
			token: result.data, 
			callback: captcha.callback 
		});

		return true;
	} catch (error) {
		console.error('Failed to solve captcha:', error);
		return false;
	}
}

async function main() {
	try {
		// Launch browser
		const browser = await puppeteer.launch({
			headless: false,
			defaultViewport: { width: 1280, height: 800 }
		});

		const page = await browser.newPage();

		// Navigate to the demo page
		console.log('Navigating to 2captcha demo page...');
		await page.goto(pageUrl, { waitUntil: 'networkidle0' });

		// Wait for reCAPTCHA to initialize
		const recaptchaLoaded = await waitForRecaptchaLoad(page);
		if (!recaptchaLoaded) {
			throw new Error('reCAPTCHA failed to initialize');
		}
		console.log('reCAPTCHA initialized');

		// Solve the captcha
		const success = await solveCaptcha(page);

		if (success) {
			console.log('Captcha solved successfully!');

			await setTimeout(1000);

			// Click the submit button
			await page.click('text/Check');
			console.log('Form submitted');

			// Wait to see the result
			await setTimeout(15000);
		}

		// Close browser
		await browser.close();

	} catch (error) {
		console.error('An error occurred:', error);
		process.exit(1);
	}
}

// Run the bot
main(); 