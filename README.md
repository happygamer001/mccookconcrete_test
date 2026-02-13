# McCook Concrete - Mileage & Fuel Tracker

A professional web application for tracking truck mileage and fuel purchases with automatic synchronization to Notion databases.

## 🚀 Quick Deploy to Vercel

1. Push this code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

## 📋 Environment Variables Needed

Add these in Vercel Dashboard → Settings → Environment Variables:

```
NOTION_API_KEY=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
NOTION_MILEAGE_DB_ID=a199a033-861a-47aa-99b4-de17a55c4afa
NOTION_FUEL_DB_ID=b7228b6c-412d-4544-ae25-34b76393c2ac
```

## 📱 Features

- Driver authentication with 6 preset drivers + custom option
- 10 truck selection
- Mileage tracking by state (Nebraska/Kansas)
- Fuel purchase tracking with auto-calculated price per gallon
- Real-time Notion database sync
- Mobile-friendly responsive design
- PWA-ready (add to home screen)

## 🛠️ Tech Stack

- React 18
- Vercel Serverless Functions
- Notion API
- Create React App

## 📂 Project Structure

```
mileage-tracker/
├── api/              # Vercel serverless functions
│   ├── mileage.js   # Mileage submission endpoint
│   └── fuel.js      # Fuel submission endpoint
├── public/          # Static files
│   └── index.html
├── src/             # React application
│   ├── App.js       # Main app component
│   ├── App.css      # Styles
│   ├── index.js     # React entry point
│   └── index.css    # Base styles
├── .gitignore       # Git ignore rules
├── package.json     # Dependencies
├── vercel.json      # Vercel configuration
└── README.md        # This file
```

## 🚦 Local Development

```bash
npm install
npm start
```

App runs at http://localhost:3000

## 📱 Mobile Installation

### iOS:
Safari → Share → Add to Home Screen

### Android:
Chrome → Menu → Add to Home Screen

## 💰 Cost

Completely FREE with Vercel's hobby tier!

## 📄 License

© 2026 McCook Concrete Inc.
