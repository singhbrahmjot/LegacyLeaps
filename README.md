# LegacyLeap AS/400 Modernization Assistant

A modern web application that helps transform legacy AS/400 data into modern, cloud-ready microservices with REST APIs, database schemas, and data visualizations.

## Features

- **File Upload**: Upload AS/400 data files for processing
- **Multi-Agent Processing**: AI-powered modernization pipeline
- **Data Transformation**: Convert legacy data to modern JSON format
- **Database Schema Generation**: Create PostgreSQL schemas
- **REST API Generation**: Generate Next.js API endpoints
- **Data Visualizations**: Interactive charts and analytics
- **Microservices Architecture**: Recommendations for scalable architecture
- **Download Ready**: Get deployable application packages

## Technology Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js
- **File Processing**: JSZip, FileSaver
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/thehaniyaakhtar/LegacyLeap-Beta.git
cd LegacyLeap-Beta
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload File**: Select an AS/400 data file using the upload interface
2. **Process**: Click "Modernize Now" to start the AI-powered transformation
3. **Review Results**: View the processing timeline and generated outputs
4. **Analyze Data**: Explore data visualizations and insights
5. **Download**: Get the complete modernized application as a ZIP file

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── modernize/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
└── ...
```

## API Endpoints

- `POST /api/modernize` - Process uploaded AS/400 files

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Deploy automatically on every push to main branch
3. Environment variables are handled automatically

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub.