# Web Scraping Specification

## Target HTML Structure

Based on the requirements, we need to extract data from tester pages with the following HTML structure:

### Slot Card Structure

Each slot card consists of three main sections:

#### 1. Slot Heading
```html
<div class="panel-heading">
  <a href="/status/1/SLOT01" class="chassisname">SLOT01</a>
  <span class="slot-sn">SFT</span>
  <span class="chassisstatus">passed</span>
  <span class="testtime">1:19:45</span>
</div>
```

#### 2. Slot Body
```html
<div class="panel-body">
  <a href="/status/SLOT01" class="slot-sn">332404254207449</a>
</div>
```

#### 3. Slot Footer
```html
<div class="panel-footer">
  <span class="slot-sn fw-bold">Production</span>
  <span class="slot-sn fw-bold">AZ3324_2025.10.08-01</span>
</div>
```

## CSS Selectors for Data Extraction

### Slot ID
- **Selector**: `.panel-heading .chassisname`
- **Example**: "SLOT01"
- **Type**: Text content

### Slot SN (Short Name)
- **Selector**: `.panel-heading .slot-sn`
- **Example**: "SFT"
- **Type**: Text content

### Slot Status
- **Selector**: `.panel-heading .chassisstatus`
- **Example**: "passed"
- **Type**: Text content

### Test Time
- **Selector**: `.panel-heading .testtime`
- **Example**: "1:19:45"
- **Type**: Text content

### Serial Number
- **Selector**: `.panel-body .slot-sn`
- **Example**: "332404254207449"
- **Type**: Text content

### Production Type
- **Selector**: `.panel-footer .slot-sn.fw-bold:first-child`
- **Example**: "Production"
- **Type**: Text content

### Project Name
- **Selector**: `.panel-footer .slot-sn.fw-bold:last-child`
- **Example**: "AZ3324_2025.10.08-01"
- **Type**: Text content

## Cheerio Implementation Example

```typescript
import * as cheerio from 'cheerio';

export function extractSlotData(html: string): SlotData[] {
  const $ = cheerio.load(html);
  const slots: SlotData[] = [];
  
  // Find all slot cards (adjust selector based on actual page structure)
  $('.panel').each((index, element) => {
    const $panel = $(element);
    
    // Extract slot heading data
    const slotId = $panel.find('.panel-heading .chassisname').text().trim();
    const slotSn = $panel.find('.panel-heading .slot-sn').text().trim();
    const status = $panel.find('.panel-heading .chassisstatus').text().trim();
    const testTime = $panel.find('.panel-heading .testtime').text().trim();
    
    // Extract slot body data
    const serialNumber = $panel.find('.panel-body .slot-sn').text().trim();
    
    // Extract slot footer data
    const footerElements = $panel.find('.panel-footer .slot-sn.fw-bold');
    const production = $(footerElements[0]).text().trim();
    const project = $(footerElements[1]).text().trim();
    
    slots.push({
      slotId,
      status,
      sn: slotSn,
      testTime,
      serialNumber,
      production,
      project
    });
  });
  
  return slots;
}
```

## Data Transformation

### Status Mapping
Map status values to standardized format:
- "passed" → "PASSED"
- "failed" → "FAILED"
- "testing" → "TESTING"
- "failing" → "FAILING"
- "aborted" → "ABORTED"

### Summary Calculation
Calculate summary statistics from all slots:
```typescript
function calculateSummary(slots: SlotData[]) {
  return {
    testing: slots.filter(s => s.status.toLowerCase() === 'testing').length,
    failing: slots.filter(s => s.status.toLowerCase() === 'failing').length,
    passed: slots.filter(s => s.status.toLowerCase() === 'passed').length,
    failed: slots.filter(s => s.status.toLowerCase() === 'failed').length,
    aborted: slots.filter(s => s.status.toLowerCase() === 'aborted').length
  };
}
```

## Error Handling

### Network Errors
- Implement retry logic with exponential backoff
- Log failed requests for debugging
- Return appropriate error status to frontend

### Parsing Errors
- Handle missing elements gracefully
- Provide default values for missing data
- Log parsing errors for investigation

### Timeouts
- Set appropriate timeout for requests (e.g., 10 seconds)
- Handle timeout errors specifically
- Implement circuit breaker pattern for repeated failures

## Performance Considerations

### Concurrent Requests
- Use Promise.all() for parallel fetching
- Limit concurrent requests to avoid overwhelming servers
- Implement request queuing if needed

### Caching
- Cache responses for short periods (e.g., 5 seconds)
- Implement conditional requests if possible
- Use in-memory caching for frequently accessed data

### Rate Limiting
- Respect rate limits of target servers
- Implement delays between requests if necessary
- Monitor request patterns to avoid blocking