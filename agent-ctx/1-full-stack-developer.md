# Task 1: Fix Z-AI JSON Parsing Bug

## Agent: full-stack-developer

## Task
Fix Z-AI JSON parsing bug when AI returns plain text instead of JSON

## Work Done

### Problem
The Z-AI provider sometimes returns plain text like `"Generated SQL: SELECT COUNT(*) AS total_emergencias..."` instead of the expected JSON format `{"type":"query","sql":"...","explanation":"...","confidence":0.9}`. This caused `extractJSON` to fail because there was no JSON object in the response.

### Changes Made in `/home/z/my-project/src/lib/ai.ts`

1. **Improved `extractJSON`** (lines 12-33):
   - Added clarifying comments about greedy matching for nested objects
   - No functional change needed — the existing regex patterns already handle the JSON extraction cases properly

2. **Added `extractSQLFromPlainText` helper** (lines 35-96):
   - Detects common Z-AI plain text patterns: "Generated SQL:", "SQL:", "Query:", "Here's the SQL:", "The query would be:", etc.
   - Extracts the SQL SELECT statement following the prefix
   - Falls back to finding a bare SELECT statement if no prefix matched
   - Also attempts to extract explanation text from patterns like "Explanation: ..." or "This query ..."
   - Returns a structured object: `{type: 'query', sql: '<extracted>', explanation: '...', confidence: 0.5}` or null

3. **Added `extractVisualizationFromPlainText` helper** (lines 98-160):
   - Detects chart type keywords in plain text: "bar chart", "line graph", "pie chart", "scatter plot", etc.
   - Maps keywords to the 7 supported chart types
   - Attempts to find column name references for xAxis/yAxis
   - Attempts to extract a title from "title: ..." patterns
   - Returns a partial visualization object or null

4. **Updated `createZAICompletion`** (lines 224-242):
   - When `responseFormat === 'json'` and JSON.parse fails, now calls `extractSQLFromPlainText(content)` as fallback
   - Changed `console.error` to `console.warn` for the parse failure (non-critical since we have fallback)
   - Changed raw content logging to `console.debug` (less noisy)
   - If SQL is extracted, sets `result.parsedJson` with the constructed object

5. **Updated unified `createCompletion`** (lines 343-361):
   - Same fallback pattern: when `responseFormat === 'json'` and `parsedJson` is still null after second attempt, tries `extractSQLFromPlainText`
   - Same logging improvements

6. **Updated `suggestVisualization`** (lines 664-669):
   - After `parsedJson` check fails, tries `extractVisualizationFromPlainText(result.content, columns)` as fallback
   - Only falls through to the default table response if both parsed JSON and plain text extraction fail

### Lint Result
0 errors, 1 pre-existing warning (TanStack Table)

## Files Modified
- `/home/z/my-project/src/lib/ai.ts`
- `/home/z/my-project/worklog.md` (appended work record)
