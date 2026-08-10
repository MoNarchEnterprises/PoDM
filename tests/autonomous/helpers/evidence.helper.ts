/**
 * PoDM Autonomous QA Test Suite — Evidence Helper
 * Collects and formats diagnostic evidence for every scenario
 */

import { EvidenceRecord } from '../types';

export class EvidenceCollector {
  private records: EvidenceRecord[] = [];
  private logs: string[] = [];

  public log(msg: string): void {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${msg}`);
  }

  public recordApi(
    method: string,
    url: string,
    reqBody?: any,
    reqHeaders?: Record<string, string>,
    respStatus?: number,
    respBody?: any,
    respHeaders?: Record<string, string>
  ): void {
    this.records.push({
      timestamp: new Date().toISOString(),
      request: {
        method,
        url,
        headers: reqHeaders,
        body: reqBody,
      },
      response: respStatus
        ? {
            statusCode: respStatus,
            headers: respHeaders,
            body: respBody,
          }
        : undefined,
      logs: [...this.logs],
    });
  }

  public recordBlockchain(data: {
    network: string;
    contractAddress?: string;
    txHash?: string;
    receiptStatus?: string | number;
    gasSupplier?: string;
    paymasterUsed?: boolean;
    feeSplit?: {
      platformFee: string;
      creatorAmount: string;
      referralFee: string;
      referrer: string;
    };
  }): void {
    this.records.push({
      timestamp: new Date().toISOString(),
      blockchain: data,
      logs: [...this.logs],
    });
  }

  public recordDbState(table: string, state: Record<string, any>): void {
    this.records.push({
      timestamp: new Date().toISOString(),
      dbState: { table, state },
      logs: [...this.logs],
    });
  }

  public recordError(errorMessage: string): void {
    this.records.push({
      timestamp: new Date().toISOString(),
      errorMessage,
      logs: [...this.logs],
    });
  }

  public getEvidence(): EvidenceRecord[] {
    if (this.records.length === 0 && this.logs.length > 0) {
      return [
        {
          timestamp: new Date().toISOString(),
          logs: [...this.logs],
        },
      ];
    }
    return this.records;
  }

  public clear(): void {
    this.records = [];
    this.logs = [];
  }
}
