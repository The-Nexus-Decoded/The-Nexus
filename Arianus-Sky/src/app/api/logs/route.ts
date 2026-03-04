
import { promises as fs } from 'fs';

export async function GET() {
  try {
    const logFilePath = '/data/repos/Pryan-Fire/hughs-forge/services/trade-executor/trade_executor_audit.log';
    const logContent = await fs.readFile(logFilePath, 'utf-8');
    
    // Parse the log content for trade signals
    const tradeSignals = logContent.split('\n').filter(line => line.includes('Strategy Engine emitted signal:')).map(line => {
      try {
        // Extract the dictionary-like string (Python style)
        const dictMatch = line.match(/signal: ({.*})/);
        if (!dictMatch) return null;
        
        let dictStr = dictMatch[1];
        // Convert Python single quotes to JSON double quotes
        dictStr = dictStr.replace(/'/g, '"');
        
        const signal = JSON.parse(dictStr);
        
        // Extract timestamp from the start of the line
        const timestamp = line.substring(0, 23);
        return { ...signal, timestamp };
      } catch (parseError) {
        console.error('Error parsing log line:', line, parseError);
        return null;
      }
    }).filter(signal => signal !== null);

    return new Response(JSON.stringify(tradeSignals), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reading log file:', error);
    return new Response(JSON.stringify({ error: 'Failed to read log file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
