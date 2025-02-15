# 2Captcha Demo Bot

This bot demonstrates how to solve reCAPTCHA v2 challenges using Puppeteer and 2captcha service.

## Prerequisites

- Node.js (v14 or higher)
- A 2captcha API key (get it from https://2captcha.com)

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your 2captcha API key:
   ```
   CAPTCHA_API_KEY=your_api_key_here
   ```

## Usage

Run the bot:
```bash
npm start
```

The bot will:
1. Visit the 2captcha demo page
2. Locate the reCAPTCHA
3. Solve it using the 2captcha service
4. Submit the form

## Note

This is for demonstration purposes only. Please ensure you comply with the terms of service of any websites you interact with. # 2captcha-demo
