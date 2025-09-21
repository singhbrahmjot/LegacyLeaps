import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs/promises';
import os from "os";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    // Save temp file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);


    const tempDir = os.tmpdir(); // gives correct tmp path on any OS
    const filePath = path.join(tempDir, file.name);

    await fs.writeFile(filePath, buffer);
    const content = await fs.readFile(filePath, "utf-8");

    const rows = content.trim().split('\n');
    const headers = rows[0].split(',').map(header => header.trim().replace(/"/g, '')); // Handle quoted fields if any
    const dataRows = rows.slice(1).filter(row => row.trim()).map(row => {
      const values = row.split(',').map(val => val.trim().replace(/"/g, '')); // Handle quoted fields
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {} as Record<string, string>);
    });
    const originalSample = rows.slice(0, 5).join('\n'); // Sample 5 rows or less

    // Clean up
    await fs.unlink(filePath);

    // Fallback: Basic JSON from parsed data (for demo if AI fails)
    const fallbackJson = dataRows;

    let aiOutput = '';
    try {
      console.log('Multi-Agent Chain Started...');

      // Agent 1: Parser Agent
      const parserResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-4',
        messages: [{
          role: 'user',
          content: `As Parser Agent: Infer JSON array from AS/400 CSV sample:\n${originalSample}\nOutput only valid JSON array of objects.`
        }],
        temperature: 0.1, // Low for accuracy
        max_tokens: 500,
      }, {
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      const parsedJson = JSON.parse(parserResponse.data.choices[0].message.content || '[]');
      console.log('Parser Agent Complete');

      // Agent 2: Schema Agent (uses output from Agent 1)
      const schemaResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-4',
        messages: [{
          role: 'user',
          content: `As Schema Agent: Generate PostgreSQL CREATE TABLE from this JSON data:\n${JSON.stringify(parsedJson.slice(0, 3))}\nInclude types, PRIMARY KEY. Output only SQL.`
        }],
        temperature: 0.2,
        max_tokens: 300,
      }, {
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      const dbSchema = schemaResponse.data.choices[0].message.content || '';
      console.log('Schema Agent Complete');

      // Agent 3: Optimizer Agent (uses outputs from Agents 1 & 2)
      const optimizerResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-4',
        messages: [{
          role: 'user',
          content: `As Optimizer Agent: Generate Next.js REST API route and a full deployable Node.js Express microservice app from JSON:\n${JSON.stringify(parsedJson)}\nAnd schema:\n${dbSchema}\nOutput as JSON object with: "apiCode" (Next.js GET route), "fullAppFiles" (object with keys: "app.js", "package.json", "data.js" as strings). Keep code concise but runnable.`
        }],
        temperature: 0.3,
        max_tokens: 2000,
      }, {
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      const optimizerOutput = JSON.parse(optimizerResponse.data.choices[0].message.content || '{}');
      const apiCode = optimizerOutput.apiCode || '';
      const fullAppFiles = optimizerOutput.fullAppFiles || {};
      console.log('Optimizer Agent Complete');

      // Compile outputs with agent logs
      aiOutput = JSON.stringify({
        jsonData: parsedJson,
        dbSchema,
        apiCode,
        fullAppFiles,
        agentSteps: [
          { agent: 'Parser', output: 'JSON inferred successfully', status: 'complete' },
          { agent: 'Schema', output: 'DB schema generated', status: 'complete' },
          { agent: 'Optimizer', output: 'API and full app generated', status: 'complete' }
        ]
      });

    } catch (aiError: unknown) {
      console.error('Multi-Agent Error:', {
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
        status: (aiError as any)?.response?.status,
        data: (aiError as any)?.response?.data,
        config: (aiError as any)?.config?.url
      });
      // Enhanced fallback for full app
      const fallbackAppFiles = {
        "app.js": `const express = require('express');\nconst app = express();\napp.use(express.json());\napp.get('/customers', (req, res) => res.json(${JSON.stringify(fallbackJson, null, 2)}));\napp.listen(3001, () => console.log('Microservice running on port 3001'));`,
        "package.json": JSON.stringify({ name: "modernized-microservice", version: "1.0.0", dependencies: { express: "^4.18.0" }, scripts: { start: "node app.js" } }),
        "data.js": `module.exports = ${JSON.stringify(fallbackJson, null, 2)};`
      };
      aiOutput = JSON.stringify({
        jsonData: fallbackJson,
        dbSchema: `CREATE TABLE customers (\n  ${headers.map(h => `  ${h.toLowerCase()} VARCHAR(255)`).join(',\n')}\n);`,
        apiCode: `// src/app/api/customers/route.ts\nimport { NextResponse } from 'next/server';\nexport async function GET() {\n  const data = ${JSON.stringify(fallbackJson, null, 2)};\n  return NextResponse.json(data);\n}`,
        fullAppFiles: fallbackAppFiles,
        agentSteps: [
          { agent: 'Parser', output: 'Fallback: Basic CSV parse', status: 'fallback' },
          { agent: 'Schema', output: 'Fallback: Simple schema', status: 'fallback' },
          { agent: 'Optimizer', output: 'Fallback: Basic code', status: 'fallback' }
        ]
      });
    }

    // Parse AI output
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(aiOutput);
    } catch {
      const parts = aiOutput.split('---').map((part: string) => part.trim().replace(/```[\w]*\n?|```/g, ''));
      parsedOutput = {
        jsonData: JSON.parse(parts[0] || '[]'),
        dbSchema: parts[1] || `CREATE TABLE customers (${headers.map(h => `${h.toLowerCase()} VARCHAR(255)`).join(', ')});`,
        apiCode: parts[2] || '// See fallback in logs',
        fullAppFiles: { "app.js": parts[3] || '', "package.json": '{}', "data.js": '' }, // Fallback structure
        agentSteps: [
          { agent: 'Parser', output: 'Fallback parse', status: 'fallback' },
          { agent: 'Schema', output: 'Fallback schema', status: 'fallback' },
          { agent: 'Optimizer', output: 'Fallback optimization', status: 'fallback' }
        ]
      };
    }

    return NextResponse.json({
      original: originalSample,
      jsonData: parsedOutput.jsonData,
      dbSchema: parsedOutput.dbSchema,
      apiCode: parsedOutput.apiCode,
      microservices: JSON.stringify(parsedOutput.fullAppFiles), // Legacy key for compatibility
      fullAppFiles: parsedOutput.fullAppFiles, // New key for ZIP
      agentSteps: parsedOutput.agentSteps,
    });
  } catch (error) {
    console.error('General Error:', error);
    return NextResponse.json({ error: `Processing failed: ${(error as Error).message}` }, { status: 500 });
  }
}