import type { FileAnalysisReport, SpectrumDataPoint } from '../types';

/**
 * A custom error to signal that automatic column detection failed and manual selection is needed.
 */
export class ColumnDetectionError extends Error {
    headers: string[];
    sampleData: string[][];

    constructor(message: string, headers: string[], sampleData: string[][]) {
        super(message);
        this.name = 'ColumnDetectionError';
        this.headers = headers;
        this.sampleData = sampleData;
    }
}

/**
 * Checks if a string looks like a number, handling thousands separators.
 */
const isNumeric = (str: string): boolean => {
    if (typeof str !== 'string' || str.trim() === '') return false;
    const numStr = str.replace(/,/g, '');
    return !isNaN(parseFloat(numStr)) && isFinite(Number(numStr));
};


/**
 * Cleans a string value and converts it to a float. Handles thousands separators and units.
 * @param value The string value from a cell.
 * @returns A number, or NaN if parsing fails.
 */
const cleanAndParseFloat = (value: string | undefined): number => {
    if (!value) return NaN;
    const cleanedValue = value
        .trim()
        .replace(/,/g, '') // Remove thousands separators
        .toLowerCase()
        .replace(/(mhz|khz|ghz|hz|dbm|db|mw|pwr)$/i, '')
        .trim();
    if (cleanedValue === '') return NaN;
    return parseFloat(cleanedValue);
};

/**
 * Attempts to parse a string into a Unix timestamp (milliseconds).
 * Handles ISO 8601, common date strings, and numeric epoch (seconds or ms).
 * @param value The string value to parse.
 * @returns A Unix timestamp in milliseconds, or null if parsing fails.
 */
const parseTimestamp = (value: string | undefined): number | null => {
    if (!value) return null;
    const trimmedValue = value.trim();

    // Check if it's a numeric value (likely epoch)
    if (isNumeric(trimmedValue)) {
        const num = Number(trimmedValue);
        // Heuristic: If it's a large number, it's likely ms. If it's smaller, assume seconds.
        // A date around year 2286 is 10^13 ms. A date in 1970 is 10^9 s.
        if (num > 1000000000000) { // Likely milliseconds
            return num;
        } else { // Likely seconds
            return num * 1000;
        }
    }
    
    // Attempt to parse as a date string
    const date = new Date(trimmedValue);
    if (!isNaN(date.getTime())) {
        return date.getTime();
    }

    return null;
}

interface ParseOptions {
    manualFreqIndex?: number;
    manualPowerIndex?: number;
    manualTimeIndex?: number;
}


/**
 * Reads a File or Blob object, parses its CSV/TXT content, and generates a statistical report.
 * @param file The file or blob to analyze.
 * @param options Optional manual overrides for column indices.
 * @returns A promise that resolves to a FileAnalysisReport.
 */
export const parseAndAnalyzeCsv = (file: File | Blob, options: ParseOptions = {}): Promise<FileAnalysisReport> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) {
                     throw new Error("File is empty or could not be read.");
                }
                
                const lines = text.trim().split(/\r\n?|\n/).filter(line => line.trim() !== '');
                if (lines.length < 1) {
                    throw new Error("File must contain at least one data row.");
                }

                const detectDelimiter = (sampleLines: string[]): string => {
                    const delimiters = [',', ';', '\t'];
                    const stats = delimiters.map(d => {
                        const counts = sampleLines.map(l => l.split(d).length).filter(c => c > 1);
                        if (counts.length < Math.min(sampleLines.length, 5) * 0.5) return { d, avg: 0, stddev: Infinity, valid: false };
                
                        const avg = counts.reduce((a, b) => a + b) / counts.length;
                        const stddev = Math.sqrt(counts.map(c => Math.pow(c - avg, 2)).reduce((a, b) => a + b) / counts.length);
                        
                        return { d, avg, stddev, valid: true };
                    });

                    const candidates = stats.filter(s => s.valid && s.stddev < 0.5);
                    if (candidates.length > 0) {
                        candidates.sort((a, b) => a.stddev - b.stddev);
                        return candidates[0].d;
                    }
                    return ' ';
                };

                const delimiter = detectDelimiter(lines.slice(0, 50));
                
                const parseCsvRow = (row: string): string[] => {
                    if (delimiter === ' ') {
                        return row.trim().split(/\s+/);
                    }
                    return row.split(delimiter).map(s => s.trim());
                };

                let headerValues: string[] = [];
                let dataLines: string[];
                let freqIndex = options.manualFreqIndex ?? -1;
                let powerIndex = options.manualPowerIndex ?? -1;
                let timeIndex = options.manualTimeIndex ?? -1;

                let dataStartIndex = 0;
                for (let i = 0; i < Math.min(10, lines.length); i++) {
                    const cols = parseCsvRow(lines[i]);
                    // A data row likely starts with a number.
                    if (cols.length >= 2 && (isNumeric(cols[0]) || parseTimestamp(cols[0]) !== null)) {
                        dataStartIndex = i;
                        // Check if the line *before* this is a non-numeric header
                        if (i > 0) {
                            const prevCols = parseCsvRow(lines[i - 1]);
                            if (prevCols.length === cols.length && prevCols.some(val => !isNumeric(val))) {
                                dataStartIndex = i - 1;
                            }
                        }
                        break;
                    }
                }

                const relevantLines = lines.slice(dataStartIndex);
                 if (relevantLines.length < 1) {
                    throw new Error("No valid data rows found.");
                }

                const firstLineValues = parseCsvRow(relevantLines[0]);
                const hasHeader = firstLineValues.some(val => val !== '' && !isNumeric(val) && parseTimestamp(val) === null);

                if (hasHeader) {
                    headerValues = firstLineValues;
                    dataLines = relevantLines.slice(1);
                } else {
                    dataLines = relevantLines;
                    const numColumns = firstLineValues.length;
                    headerValues = Array.from({ length: numColumns }, (_, i) => `Column ${i + 1}`);
                }
                
                if (options.manualFreqIndex === undefined || options.manualPowerIndex === undefined) {
                    const lowerCaseHeaders = headerValues.map(h => h.toLowerCase().trim());
                    
                    const freqKeywords = ['freq', 'frequency', 'mhz', 'khz', 'ghz', 'hertz', 'hz', 'channel', 'band', 'freq.', 'f(mhz)'];
                    const powerKeywords = ['power', 'dbm', 'db', 'level', 'amplitude', 'rssi', 'signal', 'strength', 'intensity', 'sig_str', 'pwr'];
                    const timeKeywords = ['time', 'timestamp', 'date', 'datetime', 'epoch'];
                    
                    const scoreHeader = (header: string, keywords: string[]): number => {
                        if (keywords.includes(header)) return 10;
                        return keywords.reduce((acc, kw) => acc + (header.includes(kw) ? 1 : 0), 0);
                    }

                    const candidates = lowerCaseHeaders.map((h, i) => ({
                        index: i,
                        freqScore: scoreHeader(h, freqKeywords),
                        powerScore: scoreHeader(h, powerKeywords),
                        timeScore: scoreHeader(h, timeKeywords)
                    }));

                    const findBestUniqueIndex = (
                        primaryCandidates: typeof candidates,
                        ...otherIndices: number[]
                    ): number => {
                        return primaryCandidates.find(c => !otherIndices.includes(c.index))?.index ?? -1;
                    };
                    
                    const freqCandidates = candidates.filter(c => c.freqScore > 0).sort((a,b) => b.freqScore - a.freqScore);
                    const powerCandidates = candidates.filter(c => c.powerScore > 0).sort((a,b) => b.powerScore - a.powerScore);
                    const timeCandidates = candidates.filter(c => c.timeScore > 0).sort((a,b) => b.timeScore - a.timeScore);

                    freqIndex = findBestUniqueIndex(freqCandidates);
                    powerIndex = findBestUniqueIndex(powerCandidates, freqIndex);
                    // if freq and power conflicted, re-evaluate freq
                    if (powerIndex === -1) {
                        powerIndex = findBestUniqueIndex(powerCandidates);
                        freqIndex = findBestUniqueIndex(freqCandidates, powerIndex);
                    }
                    timeIndex = findBestUniqueIndex(timeCandidates, freqIndex, powerIndex);
                }

                if (freqIndex === -1 || powerIndex === -1) {
                    const sampleData = dataLines.slice(0, 5).map(line => parseCsvRow(line));
                    const errorMsg = "Could not automatically detect Frequency and Power columns.";
                    throw new ColumnDetectionError(errorMsg, headerValues, sampleData);
                }
                
                if (dataLines.length === 0) {
                     throw new Error("File contains a header but no data rows.");
                }

                const allData: SpectrumDataPoint[] = [];
                let powerSum = 0;
                let minTimestamp = Infinity;
                let maxTimestamp = -Infinity;

                for (const line of dataLines) {
                    const values = parseCsvRow(line);
                    if (values.length > Math.max(freqIndex, powerIndex)) {
                        const frequency = cleanAndParseFloat(values[freqIndex]);
                        const power = cleanAndParseFloat(values[powerIndex]);
                        const timestamp = timeIndex !== -1 ? parseTimestamp(values[timeIndex]) : null;

                        if (!isNaN(frequency) && !isNaN(power)) {
                            const dataPoint: SpectrumDataPoint = { frequency, power };
                            if (timestamp !== null) {
                                dataPoint.timestamp = timestamp;
                                minTimestamp = Math.min(minTimestamp, timestamp);
                                maxTimestamp = Math.max(maxTimestamp, timestamp);
                            }
                            allData.push(dataPoint);
                            powerSum += power;
                        }
                    }
                }

                if (allData.length === 0) {
                    throw new Error("No valid numerical data found. Please ensure columns are correctly formatted and delimited (e.g., comma, space, tab).");
                }
                
                const sortedByPower = [...allData].sort((a, b) => b.power - a.power);
                const sortedByFreq = [...allData].sort((a, b) => a.frequency - b.frequency); 

                const stats = {
                    frequency: {
                        min: sortedByFreq[0].frequency,
                        max: sortedByFreq[sortedByFreq.length - 1].frequency,
                    },
                    power: {
                        min: sortedByPower[sortedByPower.length - 1].power,
                        max: sortedByPower[0].power,
                        avg: powerSum / allData.length,
                    },
                };
                
                const peakPowerRows = sortedByPower.slice(0, 10);

                const report: FileAnalysisReport = {
                    fileName: (file instanceof File) ? file.name : 'File Segment',
                    rowCount: dataLines.length,
                    columnCount: headerValues.length,
                    headers: headerValues,
                    stats,
                    samples: {
                        firstRows: allData.slice(0, 10),
                        lastRows: allData.slice(-10),
                        peakPowerRows: peakPowerRows
                    },
                };
                
                if (isFinite(minTimestamp) && isFinite(maxTimestamp)) {
                    report.timeStats = {
                        start: minTimestamp,
                        end: maxTimestamp,
                        durationSeconds: (maxTimestamp - minTimestamp) / 1000
                    };
                }

                resolve(report);

            } catch (error) {
                if (error instanceof ColumnDetectionError) {
                    reject(error);
                } else {
                    console.error("CSV Parsing Error:", error);
                    reject(error instanceof Error ? error : new Error("An unknown error occurred during file parsing."));
                }
            }
        };

        reader.onerror = (error) => {
            console.error("File Reading Error:", error);
            reject(new Error("Failed to read the file."));
        };

        reader.readAsText(file);
    });
};
