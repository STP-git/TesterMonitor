import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { SlotData, TesterData, Tester, ScrapingOptions } from "./types";

const DEFAULT_OPTIONS: ScrapingOptions = {
  timeout: 10000,
  retries: 3,
  retryDelay: 2000
};

export class WebScraper {
  private options: ScrapingOptions;

  constructor(options: Partial<ScrapingOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async scrapeTesterData(tester: Tester): Promise<TesterData> {
    const timestamp = new Date().toISOString();
    
    try {
      const html = await this.fetchHtml(tester.url);
      const slots = this.extractSlotData(html);
      const summary = this.calculateSummary(slots);
      const status = this.determineOverallStatus(summary);

      return {
        testerId: tester.id,
        status,
        timestamp,
        slots,
        summary
      };
    } catch (error) {
      console.error(`Error scraping tester ${tester.id}:`, error);
      throw error;
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        console.log(`Fetching HTML from ${url} (attempt ${attempt})`);
        
        const response: AxiosResponse<string> = await axios.get(url, {
          timeout: this.options.timeout,
          headers: {
            'User-Agent': 'Tester-Monitoring-System/1.0.0'
          }
        });

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.options.retries) {
          console.log(`Retrying in ${this.options.retryDelay}ms...`);
          await this.delay(this.options.retryDelay);
        }
      }
    }

    throw new Error(`Failed to fetch HTML after ${this.options.retries} attempts: ${lastError?.message}`);
  }

  private extractSlotData(html: string): SlotData[] {
    const $ = cheerio.load(html);
    const slots: SlotData[] = [];
    const seenSlotIds = new Set<string>();
    
    // Find all slot cards - adjust selector based on actual page structure
    $('.panel').each((index, element) => {
      try {
        const $panel = $(element);
        
        // Extract slot heading data
        const slotId = this.extractText($panel.find('.panel-heading .chassisname'));
        const slotSn = this.extractText($panel.find('.panel-heading .slot-sn'));
        const status = this.extractText($panel.find('.panel-heading .chassisstatus'));
        const testTime = this.extractText($panel.find('.panel-heading .testtime'));
        
        // Extract slot body data
        const serialNumber = this.extractText($panel.find('.panel-body .slot-sn'));
        
        // Extract slot footer data
        const footerElements = $panel.find('.panel-footer .slot-sn.fw-bold');
        const production = this.extractText($(footerElements[0]));
        const project = this.extractText($(footerElements[1]));
        
        // Only add slot if we have essential data and haven't seen this ID before
        if (slotId && !seenSlotIds.has(slotId.trim())) {
          seenSlotIds.add(slotId.trim());
          slots.push({
            slotId: slotId.trim(),
            status: this.normalizeStatus(status),
            sn: slotSn.trim(),
            testTime: testTime.trim(),
            serialNumber: serialNumber.trim(),
            production: production.trim(),
            project: project.trim()
          });
        }
      } catch (error) {
        console.error(`Error extracting slot data at index ${index}:`, error);
      }
    });
    
    // If no panels found, try alternative selectors
    if (slots.length === 0) {
      console.log('No panels found, trying alternative selectors...');
      
      // Try to find elements with specific class patterns
      $('[class*="panel"], [class*="slot"], [class*="chassis"]').each((index, element) => {
        try {
          const $element = $(element);
          
          // Look for slot ID in various places
          const slotId = this.extractText($element.find('[class*="chassisname"], [class*="slot-id"], [class*="slot-number"]'))
                        || this.extractText($element).match(/(SLOT\d+|CHAMBER\d+)/i)?.[1];
          
          if (slotId && !seenSlotIds.has(slotId.trim())) {
            seenSlotIds.add(slotId.trim());
            const status = this.extractText($element.find('[class*="status"], [class*="state"]'));
            const sn = this.extractText($element.find('[class*="sn"], [class*="serial"]'));
            const testTime = this.extractText($element.find('[class*="time"], [class*="duration"]'));
            const serialNumber = this.extractText($element).match(/\d{12,}/)?.[0] || '';
            const production = this.extractText($element.find('[class*="production"], [class*="mode"]'));
            const project = this.extractText($element).match(/[A-Z]+\d+_\d{4}\.\d{2}\.\d{2}-\d+/)?.[0] || '';
            
            slots.push({
              slotId: slotId.trim(),
              status: this.normalizeStatus(status),
              sn: sn.trim(),
              testTime: testTime.trim(),
              serialNumber: serialNumber.trim(),
              production: production.trim(),
              project: project.trim()
            });
          }
        } catch (error) {
          console.error(`Error extracting alternative slot data at index ${index}:`, error);
        }
      });
    }
    
    console.log(`Extracted ${slots.length} unique slots from HTML`);
    return slots;
  }

  private extractText(element: cheerio.Cheerio<any>): string {
    if (!element || element.length === 0) return '';
    return element.text().trim();
  }

  private normalizeStatus(status: string): string {
    if (!status) return 'AVAILABLE';
    
    const normalized = status.toLowerCase().trim();
    
    // Map various status values to standard ones
    if (normalized.includes('pass')) return 'PASSED';
    if (normalized.includes('fail')) return 'FAILED';
    if (normalized.includes('test')) return 'TESTING';
    if (normalized.includes('run')) return 'TESTING';
    if (normalized.includes('abort')) return 'ABORTED';
    if (normalized.includes('error')) return 'FAILED';
    if (normalized.includes('complete')) return 'PASSED';
    if (normalized.includes('done')) return 'PASSED';
    if (normalized.includes('idle')) return 'AVAILABLE';
    if (normalized.includes('wait')) return 'TESTING';
    if (normalized.includes('pending')) return 'TESTING';
    if (normalized.includes('available')) return 'AVAILABLE';
    if (normalized.includes('free')) return 'AVAILABLE';
    if (normalized.includes('ready')) return 'AVAILABLE';
    if (normalized.includes('unknown')) return 'AVAILABLE';
    
    // Return original status in uppercase if no mapping found
    return status.toUpperCase();
  }

  private calculateSummary(slots: SlotData[]) {
    const summary = {
      testing: 0,
      failing: 0,
      passed: 0,
      failed: 0,
      aborted: 0,
      available: 0
    };

    slots.forEach(slot => {
      switch (slot.status) {
        case 'TESTING':
          summary.testing++;
          break;
        case 'FAILING':
          summary.failing++;
          break;
        case 'PASSED':
          summary.passed++;
          break;
        case 'FAILED':
          summary.failed++;
          break;
        case 'ABORTED':
          summary.aborted++;
          break;
        case 'AVAILABLE':
          summary.available++;
          break;
      }
    });

    return summary;
  }

  private determineOverallStatus(summary: ReturnType<typeof this.calculateSummary>): string {
    // Priority order for status determination
    if (summary.failed > 0 || summary.aborted > 0) return 'FAILED';
    if (summary.failing > 0) return 'FAILING';
    if (summary.testing > 0) return 'TESTING';
    if (summary.passed > 0 && summary.testing === 0) return 'PASSED';
    if (summary.available > 0 && summary.testing === 0 && summary.passed === 0) return 'AVAILABLE';
    
    return 'AVAILABLE';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeMultipleTesters(testers: Tester[]): Promise<TesterData[]> {
    const results: TesterData[] = [];
    const errors: { tester: Tester; error: Error }[] = [];

    // Process testers concurrently with a limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(testers, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (tester) => {
        try {
          const data = await this.scrapeTesterData(tester);
          results.push(data);
        } catch (error) {
          errors.push({ tester, error: error as Error });
          console.error(`Failed to scrape ${tester.id}:`, error);
        }
      });

      await Promise.all(promises);
    }

    if (errors.length > 0) {
      console.error(`${errors.length} testers failed to scrape:`);
      errors.forEach(({ tester, error }) => {
        console.error(`- ${tester.id}: ${error.message}`);
      });
    }

    return results;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const webScraper = new WebScraper();