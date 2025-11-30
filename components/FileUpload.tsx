import React, { useState, useRef, useEffect } from 'react';
import { FileCodeIcon } from './icons/FileCodeIcon.tsx';
import type { FileAnalysisReport } from '../types.ts';
import { MAX_FILE_SIZE_BYTES } from '../constants.ts';
import { ColumnDetectionError } from '../utils/csvParser.ts';


type Segment = 'start' | 'middle' | 'end';

interface ParseOptions {
    manualFreqIndex?: number;
    manualPowerIndex?: number;
    manualTimeIndex?: number;
}

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  onRunFileAnalysis: (file: File | Blob, options?: ParseOptions) => void;
  uploadedFile: File | null;
  analysisReport: FileAnalysisReport | null;
  analysisError: Error | string | null;
}

const ReportStat: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between items-baseline">
        <p className="text-text-secondary">{label}:</p>
        <p className="font-semibold text-text-main">{value}</p>
    </div>
);

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, onRunFileAnalysis, uploadedFile, analysisReport, analysisError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [manualFreqIndex, setManualFreqIndex] = useState<number | string>('');
  const [manualPowerIndex, setManualPowerIndex] = useState<number | string>('');
  const [manualTimeIndex, setManualTimeIndex] = useState<number | string>('');


  useEffect(() => {
    // When a file is uploaded or error is cleared, reset manual selection
    if (!analysisError || !uploadedFile) {
        setManualFreqIndex('');
        setManualPowerIndex('');
        setManualTimeIndex('');
    }
  }, [analysisError, uploadedFile]);

  useEffect(() => {
    if (uploadedFile) {
      setIsLargeFile(uploadedFile.size > MAX_FILE_SIZE_BYTES);
      if (uploadedFile.size <= MAX_FILE_SIZE_BYTES) {
        onRunFileAnalysis(uploadedFile);
      }
    } else {
      setIsLargeFile(false);
    }
  }, [uploadedFile]);

  const handleFileChangeInternal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    onFileChange(file);
  };
  
  const handleAnalyzeSegment = (segment: Segment) => {
    if (!uploadedFile) return;

    let start = 0;
    let end = MAX_FILE_SIZE_BYTES;

    if (segment === 'middle') {
        start = Math.max(0, Math.floor(uploadedFile.size / 2) - (MAX_FILE_SIZE_BYTES / 2));
        end = start + MAX_FILE_SIZE_BYTES;
    } else if (segment === 'end') {
        start = Math.max(0, uploadedFile.size - MAX_FILE_SIZE_BYTES);
        end = uploadedFile.size;
    }
    
    const fileSlice = uploadedFile.slice(start, end);
    const slicedFile = new File([fileSlice], `${uploadedFile.name} [${segment}]`, { type: uploadedFile.type });
    onRunFileAnalysis(slicedFile);
  };

  const handleConfirmSelection = () => {
    if (uploadedFile && manualFreqIndex !== '' && manualPowerIndex !== '') {
        onRunFileAnalysis(uploadedFile, {
            manualFreqIndex: Number(manualFreqIndex),
            manualPowerIndex: Number(manualPowerIndex),
            manualTimeIndex: manualTimeIndex !== '' ? Number(manualTimeIndex) : undefined
        });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) {
      onFileChange(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = event.dataTransfer.files;
      }
    }
  };

  const handleClick = () => {
    if (!uploadedFile && !analysisError) {
        fileInputRef.current?.click();
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from triggering file input
    onFileChange(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const baseClasses = "border border-dashed rounded-md p-4 text-center transition-all duration-300";
  const idleClasses = "cursor-pointer bg-base-100/50 border-secondary";
  const dragClasses = isDragOver ? 'border-primary-amber scale-105' : 'border-secondary';
  
  const renderContent = () => {
      if (analysisError instanceof ColumnDetectionError) {
            const headers = analysisError.headers;
            const selectedIndices = [manualFreqIndex, manualPowerIndex, manualTimeIndex].filter(i => i !== '').map(Number);
            const hasDuplicates = new Set(selectedIndices).size !== selectedIndices.length;

            return (
                <div className={`${baseClasses} border-amber-500/80 text-left animate-fade-in`}>
                     <div className="flex justify-between items-center mb-3">
                        <p className="font-semibold text-amber-400 text-sm uppercase">Manual Column Selection</p>
                        <button onClick={handleClearFile} className="text-xs text-text-secondary hover:text-red-400">&times; Clear</button>
                    </div>
                    <p className="text-xs text-text-secondary mb-3">
                        We couldn't automatically detect all columns. Please select them below.
                    </p>
                    <div className="space-y-4">
                        <div>
                             <label className="block text-sm font-medium text-text-secondary mb-1">Frequency Column</label>
                             <select
                                 value={manualFreqIndex}
                                 onChange={(e) => setManualFreqIndex(e.target.value)}
                                 className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main"
                             >
                                 <option value="" disabled>Select a column...</option>
                                 {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                             </select>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-text-secondary mb-1">Power Column</label>
                             <select
                                 value={manualPowerIndex}
                                 onChange={(e) => setManualPowerIndex(e.target.value)}
                                 className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main"
                             >
                                  <option value="" disabled>Select a column...</option>
                                 {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-text-secondary mb-1">Timestamp Column (Optional)</label>
                             <select
                                 value={manualTimeIndex}
                                 onChange={(e) => setManualTimeIndex(e.target.value)}
                                 className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main"
                             >
                                  <option value="">None</option>
                                 {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                             </select>
                        </div>
                    </div>
                    <button
                        onClick={handleConfirmSelection}
                        disabled={manualFreqIndex === '' || manualPowerIndex === '' || hasDuplicates}
                        className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm & Analyze
                    </button>
                    {hasDuplicates && (
                        <p className="text-xs text-center text-red-400 mt-2">Each column selection must be unique.</p>
                    )}
                </div>
            );
      }

      if (analysisError) {
        return (
            <div className={`${baseClasses} border-red-500/80 text-left animate-fade-in`}>
                <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-red-400 text-sm uppercase">File Analysis Error</p>
                    <button onClick={handleClearFile} className="text-xs text-text-secondary hover:text-red-400">&times; Clear</button>
                </div>
                <div className="space-y-2 text-xs font-mono bg-red-900/30 p-3 rounded-md text-red-300">
                    <p>{typeof analysisError === 'string' ? analysisError : analysisError.message}</p>
                </div>
                <p className="text-xs text-text-secondary/70 mt-3 text-center">
                    Please upload a different file or check the file format.
                </p>
            </div>
        );
      }
      
      if (analysisReport) {
        return (
            <div className={`${baseClasses} border-primary-amber text-left animate-fade-in`}>
                <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-primary-amber text-sm uppercase">Pre-Analysis Report</p>
                    <button onClick={handleClearFile} className="text-xs text-text-secondary hover:text-red-400">&times; Clear</button>
                </div>
                <div className="space-y-2 text-xs font-mono bg-base-300/50 p-3 rounded-md">
                    <ReportStat label="File" value={analysisReport.fileName} />
                    {analysisReport.timeStats && <ReportStat label="Duration" value={`${analysisReport.timeStats.durationSeconds.toFixed(1)}s`} />}
                    <ReportStat label="Rows" value={analysisReport.rowCount.toLocaleString()} />
                    <ReportStat label="Columns" value={analysisReport.columnCount} />
                    <hr className="border-secondary/20 my-2" />
                    <ReportStat label="Freq Range (MHz)" value={`${analysisReport.stats.frequency.min.toFixed(2)} - ${analysisReport.stats.frequency.max.toFixed(2)}`} />
                    <ReportStat label="Power Range (dBm)" value={`${analysisReport.stats.power.min.toFixed(2)} - ${analysisReport.stats.power.max.toFixed(2)}`} />
                    <ReportStat label="Avg Power (dBm)" value={analysisReport.stats.power.avg.toFixed(2)} />
                </div>
                <p className="text-xs text-text-secondary/70 mt-3 text-center">
                    A summary of this data will be sent to the AI for analysis.
                </p>
            </div>
        );
      }
      
      if (uploadedFile && isLargeFile) {
        const fileSizeMB = (uploadedFile.size / 1024 / 1024).toFixed(1);
        return (
            <div className={`${baseClasses} border-amber-500/80 text-left animate-fade-in`}>
                <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-amber-400 text-sm uppercase">Large File Detected</p>
                    <button onClick={handleClearFile} className="text-xs text-text-secondary hover:text-red-400">&times; Clear</button>
                </div>
                <p className="text-xs text-center text-text-secondary mb-3">File size is {fileSizeMB} MB. Please select a 50 MB segment to analyze.</p>
                <div className="flex flex-col space-y-2">
                    <button onClick={() => handleAnalyzeSegment('start')} className="btn-secondary text-sm w-full">Analyze First 50 MB (Ingress)</button>
                    <button onClick={() => handleAnalyzeSegment('middle')} className="btn-secondary text-sm w-full">Analyze Middle 50 MB (Mid-Mission)</button>
                    <button onClick={() => handleAnalyzeSegment('end')} className="btn-secondary text-sm w-full">Analyze Last 50 MB (Egress)</button>
                </div>
            </div>
        );
      }

      return (
        <div
            className={`${baseClasses} ${idleClasses} ${dragClasses}`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ minHeight: '180px' }}
        >
            <div className="flex flex-col items-center justify-center space-y-2 text-text-secondary h-full">
                <FileCodeIcon className="w-8 h-8 mb-1" />
                <div>
                <p>
                    <span className="font-semibold text-primary-amber">UPLOAD FILE</span> or drag & drop
                </p>
                <p className="text-xs text-text-secondary/70">.csv & .txt files only</p>
                </div>
            </div>
        </div>
      );
  };
  
  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChangeInternal}
        className="hidden"
        accept=".csv,.txt"
      />
      {renderContent()}
    </div>
  );
};