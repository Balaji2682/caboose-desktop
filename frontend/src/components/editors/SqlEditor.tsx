import { memo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import type { editor, languages } from 'monaco-editor';

export interface SqlEditorRef {
  formatSql: () => void;
  uppercaseSelection: () => void;
  toggleComment: () => void;
  focus: () => void;
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  isPrimaryKey?: boolean;
  isNullable?: boolean;
  comment?: string;
  default?: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  comment?: string;
  rowCount?: number;
}

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  schema?: TableSchema[];
  disabled?: boolean;
  height?: string | number;
  placeholder?: string;
}

// SQL keywords organized by context
const SQL_KEYWORDS = {
  clauses: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
            'OUTER JOIN', 'CROSS JOIN', 'ON', 'AND', 'OR', 'ORDER BY', 'GROUP BY',
            'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT'],
  dml: ['INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'],
  ddl: ['CREATE TABLE', 'CREATE INDEX', 'CREATE VIEW', 'DROP TABLE', 'DROP INDEX',
        'ALTER TABLE', 'ADD COLUMN', 'DROP COLUMN', 'RENAME TO'],
  operators: ['IN', 'NOT IN', 'LIKE', 'NOT LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL',
              'EXISTS', 'NOT EXISTS', 'ANY', 'ALL'],
  modifiers: ['AS', 'ASC', 'DESC', 'DISTINCT', 'ALL', 'UNIQUE', 'PRIMARY KEY',
              'FOREIGN KEY', 'REFERENCES', 'DEFAULT', 'NOT NULL', 'AUTO_INCREMENT'],
  logic: ['CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'IFNULL', 'NULLIF', 'COALESCE'],
  misc: ['TRUE', 'FALSE', 'NULL', 'EXPLAIN', 'ANALYZE', 'DESCRIBE', 'SHOW TABLES',
         'SHOW COLUMNS', 'USE', 'DATABASE'],
};

// SQL functions with signatures
const SQL_FUNCTIONS: Record<string, { signature: string; description: string }> = {
  // Aggregate functions
  COUNT: { signature: 'COUNT(expression)', description: 'Returns the count of rows' },
  SUM: { signature: 'SUM(expression)', description: 'Returns the sum of values' },
  AVG: { signature: 'AVG(expression)', description: 'Returns the average value' },
  MIN: { signature: 'MIN(expression)', description: 'Returns the minimum value' },
  MAX: { signature: 'MAX(expression)', description: 'Returns the maximum value' },
  GROUP_CONCAT: { signature: 'GROUP_CONCAT(expression [SEPARATOR str])', description: 'Concatenates values from a group' },

  // String functions
  CONCAT: { signature: 'CONCAT(str1, str2, ...)', description: 'Concatenates strings' },
  CONCAT_WS: { signature: 'CONCAT_WS(separator, str1, str2, ...)', description: 'Concatenates with separator' },
  SUBSTRING: { signature: 'SUBSTRING(str, pos, [len])', description: 'Extracts a substring' },
  LEFT: { signature: 'LEFT(str, len)', description: 'Returns leftmost characters' },
  RIGHT: { signature: 'RIGHT(str, len)', description: 'Returns rightmost characters' },
  LENGTH: { signature: 'LENGTH(str)', description: 'Returns string length' },
  CHAR_LENGTH: { signature: 'CHAR_LENGTH(str)', description: 'Returns character count' },
  UPPER: { signature: 'UPPER(str)', description: 'Converts to uppercase' },
  LOWER: { signature: 'LOWER(str)', description: 'Converts to lowercase' },
  TRIM: { signature: 'TRIM([BOTH|LEADING|TRAILING] [char] FROM str)', description: 'Removes whitespace' },
  LTRIM: { signature: 'LTRIM(str)', description: 'Removes leading whitespace' },
  RTRIM: { signature: 'RTRIM(str)', description: 'Removes trailing whitespace' },
  REPLACE: { signature: 'REPLACE(str, from, to)', description: 'Replaces occurrences' },
  REVERSE: { signature: 'REVERSE(str)', description: 'Reverses string' },
  LPAD: { signature: 'LPAD(str, len, padstr)', description: 'Left-pads string' },
  RPAD: { signature: 'RPAD(str, len, padstr)', description: 'Right-pads string' },

  // Numeric functions
  ROUND: { signature: 'ROUND(number, [decimals])', description: 'Rounds to specified decimals' },
  FLOOR: { signature: 'FLOOR(number)', description: 'Rounds down to integer' },
  CEIL: { signature: 'CEIL(number)', description: 'Rounds up to integer' },
  CEILING: { signature: 'CEILING(number)', description: 'Rounds up to integer' },
  ABS: { signature: 'ABS(number)', description: 'Returns absolute value' },
  MOD: { signature: 'MOD(n, m)', description: 'Returns remainder' },
  POWER: { signature: 'POWER(base, exp)', description: 'Returns base raised to power' },
  SQRT: { signature: 'SQRT(number)', description: 'Returns square root' },

  // Date functions
  NOW: { signature: 'NOW()', description: 'Returns current datetime' },
  CURDATE: { signature: 'CURDATE()', description: 'Returns current date' },
  CURTIME: { signature: 'CURTIME()', description: 'Returns current time' },
  DATE: { signature: 'DATE(expr)', description: 'Extracts date part' },
  TIME: { signature: 'TIME(expr)', description: 'Extracts time part' },
  YEAR: { signature: 'YEAR(date)', description: 'Extracts year' },
  MONTH: { signature: 'MONTH(date)', description: 'Extracts month' },
  DAY: { signature: 'DAY(date)', description: 'Extracts day' },
  HOUR: { signature: 'HOUR(time)', description: 'Extracts hour' },
  MINUTE: { signature: 'MINUTE(time)', description: 'Extracts minute' },
  SECOND: { signature: 'SECOND(time)', description: 'Extracts second' },
  DATEDIFF: { signature: 'DATEDIFF(date1, date2)', description: 'Returns days between dates' },
  DATE_ADD: { signature: 'DATE_ADD(date, INTERVAL expr unit)', description: 'Adds interval to date' },
  DATE_SUB: { signature: 'DATE_SUB(date, INTERVAL expr unit)', description: 'Subtracts interval from date' },
  DATE_FORMAT: { signature: 'DATE_FORMAT(date, format)', description: 'Formats date' },
  STR_TO_DATE: { signature: 'STR_TO_DATE(str, format)', description: 'Parses string to date' },
  TIMESTAMPDIFF: { signature: 'TIMESTAMPDIFF(unit, datetime1, datetime2)', description: 'Returns difference in units' },

  // Conditional functions
  IF: { signature: 'IF(condition, true_value, false_value)', description: 'Conditional expression' },
  IFNULL: { signature: 'IFNULL(expr, value)', description: 'Returns value if expr is NULL' },
  NULLIF: { signature: 'NULLIF(expr1, expr2)', description: 'Returns NULL if equal' },
  COALESCE: { signature: 'COALESCE(value1, value2, ...)', description: 'Returns first non-NULL' },

  // Type conversion
  CAST: { signature: 'CAST(expr AS type)', description: 'Converts to specified type' },
  CONVERT: { signature: 'CONVERT(expr, type)', description: 'Converts expression type' },

  // JSON functions (MySQL 5.7+)
  JSON_EXTRACT: { signature: 'JSON_EXTRACT(json, path)', description: 'Extracts value from JSON' },
  JSON_UNQUOTE: { signature: 'JSON_UNQUOTE(json)', description: 'Unquotes JSON value' },
  JSON_ARRAY: { signature: 'JSON_ARRAY(val1, val2, ...)', description: 'Creates JSON array' },
  JSON_OBJECT: { signature: 'JSON_OBJECT(key1, val1, ...)', description: 'Creates JSON object' },
};

// Smart SQL snippets
const SQL_SNIPPETS = [
  {
    label: 'select',
    insertText: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:condition}',
    description: 'Basic SELECT statement',
  },
  {
    label: 'select-join',
    insertText: 'SELECT ${1:columns}\nFROM ${2:table1} t1\nJOIN ${3:table2} t2 ON t1.${4:id} = t2.${5:foreign_id}\nWHERE ${6:condition}',
    description: 'SELECT with JOIN',
  },
  {
    label: 'select-left-join',
    insertText: 'SELECT ${1:columns}\nFROM ${2:table1} t1\nLEFT JOIN ${3:table2} t2 ON t1.${4:id} = t2.${5:foreign_id}\nWHERE ${6:condition}',
    description: 'SELECT with LEFT JOIN',
  },
  {
    label: 'select-count',
    insertText: 'SELECT COUNT(*) AS count\nFROM ${1:table}\nWHERE ${2:condition}',
    description: 'Count rows',
  },
  {
    label: 'select-group',
    insertText: 'SELECT ${1:column}, COUNT(*) AS count\nFROM ${2:table}\nGROUP BY ${1:column}\nORDER BY count DESC',
    description: 'GROUP BY with count',
  },
  {
    label: 'select-pagination',
    insertText: 'SELECT ${1:*}\nFROM ${2:table}\nORDER BY ${3:id}\nLIMIT ${4:10} OFFSET ${5:0}',
    description: 'SELECT with pagination',
  },
  {
    label: 'insert',
    insertText: 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values})',
    description: 'INSERT statement',
  },
  {
    label: 'insert-select',
    insertText: 'INSERT INTO ${1:target_table} (${2:columns})\nSELECT ${3:columns}\nFROM ${4:source_table}\nWHERE ${5:condition}',
    description: 'INSERT from SELECT',
  },
  {
    label: 'update',
    insertText: 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition}',
    description: 'UPDATE statement',
  },
  {
    label: 'delete',
    insertText: 'DELETE FROM ${1:table}\nWHERE ${2:condition}',
    description: 'DELETE statement',
  },
  {
    label: 'create-table',
    insertText: 'CREATE TABLE ${1:table_name} (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  ${2:column_name} ${3:VARCHAR(255)} NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n)',
    description: 'CREATE TABLE statement',
  },
  {
    label: 'alter-add',
    insertText: 'ALTER TABLE ${1:table}\nADD COLUMN ${2:column_name} ${3:VARCHAR(255)}',
    description: 'Add column to table',
  },
  {
    label: 'case',
    insertText: 'CASE\n  WHEN ${1:condition} THEN ${2:result}\n  ELSE ${3:default}\nEND',
    description: 'CASE expression',
  },
  {
    label: 'subquery',
    insertText: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:column} IN (\n  SELECT ${4:column}\n  FROM ${5:other_table}\n  WHERE ${6:condition}\n)',
    description: 'Subquery in WHERE',
  },
  {
    label: 'cte',
    insertText: 'WITH ${1:cte_name} AS (\n  SELECT ${2:columns}\n  FROM ${3:table}\n  WHERE ${4:condition}\n)\nSELECT *\nFROM ${1:cte_name}',
    description: 'Common Table Expression',
  },
  {
    label: 'exists',
    insertText: 'SELECT ${1:*}\nFROM ${2:table1} t1\nWHERE EXISTS (\n  SELECT 1\n  FROM ${3:table2} t2\n  WHERE t2.${4:foreign_id} = t1.${5:id}\n)',
    description: 'EXISTS subquery',
  },
];

// Parse table aliases from query
function parseTableAliases(text: string): Map<string, string> {
  const aliases = new Map<string, string>();

  // Match patterns like: FROM table AS alias, FROM table alias, JOIN table AS alias
  const patterns = [
    /(?:FROM|JOIN)\s+(\w+)\s+(?:AS\s+)?(\w+)(?:\s|,|$)/gi,
    /(?:FROM|JOIN)\s+(\w+)\s*$/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const tableName = match[1];
      const alias = match[2] || tableName;
      if (alias && alias.toUpperCase() !== 'WHERE' &&
          alias.toUpperCase() !== 'ON' &&
          alias.toUpperCase() !== 'JOIN' &&
          alias.toUpperCase() !== 'LEFT' &&
          alias.toUpperCase() !== 'RIGHT' &&
          alias.toUpperCase() !== 'INNER') {
        aliases.set(alias.toLowerCase(), tableName.toLowerCase());
      }
    }
  }

  return aliases;
}

// Detect current SQL context
function detectContext(textBeforeCursor: string): {
  context: 'select' | 'from' | 'where' | 'join' | 'on' | 'orderby' | 'groupby' | 'insert' | 'update' | 'set' | 'values' | 'general';
  lastKeyword: string;
  inFunction: boolean;
  afterDot: string | null;
} {
  const trimmed = textBeforeCursor.toUpperCase().trim();

  // Check if we're after a dot (table.column)
  const dotMatch = textBeforeCursor.match(/(\w+)\.\s*$/);
  const afterDot = dotMatch ? dotMatch[1].toLowerCase() : null;

  // Check if we're inside a function call
  const openParens = (textBeforeCursor.match(/\(/g) || []).length;
  const closeParens = (textBeforeCursor.match(/\)/g) || []).length;
  const inFunction = openParens > closeParens;

  // Determine context based on last keyword
  type ContextType = 'select' | 'from' | 'where' | 'join' | 'on' | 'orderby' | 'groupby' | 'insert' | 'update' | 'set' | 'values' | 'general';
  let context: ContextType = 'general';
  let lastKeyword = '';

  // Find the last significant keyword
  const keywordPatterns: { pattern: RegExp; context: ContextType; keyword: string }[] = [
    { pattern: /\bVALUES\s*\([^)]*$/i, context: 'values', keyword: 'VALUES' },
    { pattern: /\bSET\s+\w*$/i, context: 'set', keyword: 'SET' },
    { pattern: /\bUPDATE\s+\w*$/i, context: 'update', keyword: 'UPDATE' },
    { pattern: /\bINSERT\s+INTO\s+\w*$/i, context: 'insert', keyword: 'INSERT INTO' },
    { pattern: /\bORDER\s+BY\s+\w*$/i, context: 'orderby', keyword: 'ORDER BY' },
    { pattern: /\bGROUP\s+BY\s+\w*$/i, context: 'groupby', keyword: 'GROUP BY' },
    { pattern: /\bON\s+\w*$/i, context: 'on', keyword: 'ON' },
    { pattern: /\b(LEFT\s+|RIGHT\s+|INNER\s+|OUTER\s+|CROSS\s+)?JOIN\s+\w*$/i, context: 'join', keyword: 'JOIN' },
    { pattern: /\bWHERE\s+[\w\s.=<>!]*$/i, context: 'where', keyword: 'WHERE' },
    { pattern: /\bFROM\s+\w*$/i, context: 'from', keyword: 'FROM' },
    { pattern: /\bSELECT\s+[\w\s,.*()]+$/i, context: 'select', keyword: 'SELECT' },
  ];

  for (const { pattern, context: ctx, keyword } of keywordPatterns) {
    if (pattern.test(trimmed)) {
      context = ctx;
      lastKeyword = keyword;
      break;
    }
  }

  return { context, lastKeyword, inFunction, afterDot };
}

// Simple SQL formatter
function formatSqlQuery(sql: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'INNER JOIN', 'OUTER JOIN', 'ON', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT',
    'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
    'ALTER TABLE', 'DROP TABLE', 'UNION', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ];

  let formatted = sql.trim();

  // Uppercase SQL keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword.replace(/ /g, '\\s+')}\\b`, 'gi');
    formatted = formatted.replace(regex, keyword);
  });

  // Add newlines before major clauses
  const newlineKeywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN',
    'RIGHT JOIN', 'INNER JOIN', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'UNION'];
  newlineKeywords.forEach(keyword => {
    const regex = new RegExp(`\\s+(${keyword})\\b`, 'g');
    formatted = formatted.replace(regex, `\n${keyword}`);
  });

  // Indent after SELECT/FROM/WHERE
  formatted = formatted.replace(/\nAND\b/g, '\n  AND');
  formatted = formatted.replace(/\nOR\b/g, '\n  OR');

  return formatted;
}

export const SqlEditor = memo(forwardRef<SqlEditorRef, SqlEditorProps>(({
  value,
  onChange,
  onExecute,
  schema = [],
  disabled = false,
  height = '200px',
}, ref) => {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<{ dispose: () => void }[]>([]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    formatSql: () => {
      if (editorRef.current) {
        const formatted = formatSqlQuery(value);
        onChange(formatted);
      }
    },
    uppercaseSelection: () => {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection && !selection.isEmpty()) {
          const selectedText = editorRef.current.getModel()?.getValueInRange(selection);
          if (selectedText) {
            editorRef.current.executeEdits('uppercase', [{
              range: selection,
              text: selectedText.toUpperCase(),
            }]);
          }
        } else {
          // No selection - uppercase current word
          const position = editorRef.current.getPosition();
          if (position) {
            const wordInfo = editorRef.current.getModel()?.getWordAtPosition(position);
            if (wordInfo) {
              const wordRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: wordInfo.startColumn,
                endColumn: wordInfo.endColumn,
              };
              editorRef.current.executeEdits('uppercase', [{
                range: wordRange,
                text: wordInfo.word.toUpperCase(),
              }]);
            }
          }
        }
      }
    },
    toggleComment: () => {
      if (editorRef.current) {
        editorRef.current.trigger('keyboard', 'editor.action.commentLine', {});
      }
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }), [value, onChange]);

  // Register custom SQL completion provider
  useEffect(() => {
    if (!monaco) return;

    // Dispose previous providers
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];

    // Register completion provider for SQL
    const completionProvider = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', ',', '(', '\n'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Get all text and text before cursor
        const fullText = model.getValue();
        const textBeforeCursor = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const suggestions: languages.CompletionItem[] = [];
        const { context, inFunction, afterDot } = detectContext(textBeforeCursor);
        const tableAliases = parseTableAliases(fullText);

        // Helper to add suggestion with priority
        const addSuggestion = (
          label: string,
          kind: languages.CompletionItemKind,
          insertText: string,
          detail: string,
          documentation?: string,
          sortText?: string,
          insertTextRules?: languages.CompletionItemInsertTextRule
        ) => {
          suggestions.push({
            label,
            kind,
            insertText,
            detail,
            documentation,
            range,
            sortText: sortText || label,
            insertTextRules,
          });
        };

        // 1. Handle dot completion (table.column or alias.column)
        if (afterDot) {
          // Check if it's a table name or alias
          const resolvedTable = tableAliases.get(afterDot) || afterDot;
          const table = schema.find(t => t.name.toLowerCase() === resolvedTable);

          if (table) {
            table.columns.forEach((col, idx) => {
              const pkIcon = col.isPrimaryKey ? '🔑 ' : '';
              const nullIcon = col.isNullable ? '' : '!';
              addSuggestion(
                col.name,
                col.isPrimaryKey
                  ? monaco.languages.CompletionItemKind.Property
                  : monaco.languages.CompletionItemKind.Field,
                col.name,
                `${pkIcon}${col.dataType}${nullIcon}`,
                col.comment || `Column from ${table.name}`,
                String(idx).padStart(3, '0')
              );
            });

            // Also add * for all columns
            addSuggestion(
              '*',
              monaco.languages.CompletionItemKind.Operator,
              '*',
              'All columns',
              undefined,
              '000'
            );

            return { suggestions };
          }
        }

        // 2. Context-specific suggestions
        switch (context) {
          case 'select':
            // In SELECT, suggest columns and functions
            schema.forEach(table => {
              const alias = [...tableAliases.entries()].find(([, t]) => t === table.name.toLowerCase())?.[0];
              const prefix = alias || table.name;

              table.columns.forEach(col => {
                addSuggestion(
                  `${prefix}.${col.name}`,
                  monaco.languages.CompletionItemKind.Field,
                  `${prefix}.${col.name}`,
                  col.dataType,
                  `Column from ${table.name}`,
                  `1_${table.name}_${col.name}`
                );
              });
            });

            // Add aggregate functions prominently
            ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].forEach((fn, idx) => {
              const info = SQL_FUNCTIONS[fn];
              addSuggestion(
                fn,
                monaco.languages.CompletionItemKind.Function,
                `${fn}(\${1:*})`,
                info.signature,
                info.description,
                `0_${idx}`,
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              );
            });
            break;

          case 'from':
          case 'join':
          case 'update':
          case 'insert':
            // In FROM/JOIN/UPDATE/INSERT, suggest tables
            schema.forEach((table, idx) => {
              const colCount = table.columns.length;
              const rowInfo = table.rowCount ? ` (~${table.rowCount.toLocaleString()} rows)` : '';
              addSuggestion(
                table.name,
                monaco.languages.CompletionItemKind.Class,
                table.name,
                `Table (${colCount} columns)${rowInfo}`,
                table.comment || `Columns: ${table.columns.map(c => c.name).join(', ')}`,
                String(idx).padStart(3, '0')
              );
            });
            break;

          case 'where':
          case 'on':
          case 'set':
            // In WHERE/ON/SET, suggest columns from tables in query
            schema.forEach(table => {
              const alias = [...tableAliases.entries()].find(([, t]) => t === table.name.toLowerCase())?.[0];
              const prefix = alias || table.name;

              table.columns.forEach(col => {
                addSuggestion(
                  `${prefix}.${col.name}`,
                  col.isPrimaryKey
                    ? monaco.languages.CompletionItemKind.Property
                    : monaco.languages.CompletionItemKind.Field,
                  `${prefix}.${col.name}`,
                  col.dataType,
                  col.comment || undefined,
                  `0_${table.name}_${col.name}`
                );
              });
            });

            // Add comparison operators
            ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'].forEach((op, idx) => {
              addSuggestion(
                op,
                monaco.languages.CompletionItemKind.Operator,
                op + ' ',
                'Operator',
                undefined,
                `1_${String(idx).padStart(2, '0')}`
              );
            });
            break;

          case 'orderby':
          case 'groupby':
            // Suggest columns and ASC/DESC
            schema.forEach(table => {
              const alias = [...tableAliases.entries()].find(([, t]) => t === table.name.toLowerCase())?.[0];
              const prefix = alias || table.name;

              table.columns.forEach(col => {
                addSuggestion(
                  `${prefix}.${col.name}`,
                  monaco.languages.CompletionItemKind.Field,
                  `${prefix}.${col.name}`,
                  col.dataType,
                  undefined,
                  `0_${table.name}_${col.name}`
                );
              });
            });

            if (context === 'orderby') {
              addSuggestion('ASC', monaco.languages.CompletionItemKind.Keyword, 'ASC', 'Ascending order', undefined, '1_0');
              addSuggestion('DESC', monaco.languages.CompletionItemKind.Keyword, 'DESC', 'Descending order', undefined, '1_1');
            }
            break;
        }

        // 3. Add SQL snippets (when starting fresh or after newline)
        if (context === 'general' || textBeforeCursor.trim() === '' || textBeforeCursor.endsWith('\n')) {
          SQL_SNIPPETS.forEach((snippet, idx) => {
            addSuggestion(
              snippet.label,
              monaco.languages.CompletionItemKind.Snippet,
              snippet.insertText,
              'Snippet',
              snippet.description,
              `0_${String(idx).padStart(2, '0')}`,
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            );
          });
        }

        // 4. Add SQL functions with signatures
        if (!afterDot && (context === 'select' || context === 'where' || inFunction)) {
          Object.entries(SQL_FUNCTIONS).forEach(([name, info], idx) => {
            addSuggestion(
              name,
              monaco.languages.CompletionItemKind.Function,
              `${name}(\${1})`,
              info.signature,
              info.description,
              `2_${String(idx).padStart(3, '0')}`,
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            );
          });
        }

        // 5. Add SQL keywords
        if (!afterDot && context !== 'values') {
          Object.values(SQL_KEYWORDS).flat().forEach((keyword, idx) => {
            addSuggestion(
              keyword,
              monaco.languages.CompletionItemKind.Keyword,
              keyword.includes(' ') ? keyword + ' ' : keyword,
              'SQL Keyword',
              undefined,
              `3_${String(idx).padStart(3, '0')}`
            );
          });
        }

        // 6. Add table names (general context)
        if (!afterDot && context === 'general') {
          schema.forEach((table, idx) => {
            addSuggestion(
              table.name,
              monaco.languages.CompletionItemKind.Class,
              table.name,
              `Table (${table.columns.length} columns)`,
              table.comment || `Columns: ${table.columns.slice(0, 5).map(c => c.name).join(', ')}${table.columns.length > 5 ? '...' : ''}`,
              `4_${String(idx).padStart(3, '0')}`
            );
          });
        }

        return { suggestions };
      },
    });

    // Register hover provider for function signatures
    const hoverProvider = monaco.languages.registerHoverProvider('sql', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const upperWord = word.word.toUpperCase();
        const funcInfo = SQL_FUNCTIONS[upperWord];

        if (funcInfo) {
          return {
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            },
            contents: [
              { value: `**${upperWord}**` },
              { value: `\`${funcInfo.signature}\`` },
              { value: funcInfo.description },
            ],
          };
        }

        // Check if it's a table name
        const tableName = word.word.toLowerCase();
        const table = schema.find(t => t.name.toLowerCase() === tableName);
        if (table) {
          const columns = table.columns.map(c => {
            const pk = c.isPrimaryKey ? '🔑 ' : '';
            const nullable = c.isNullable ? '?' : '';
            return `- ${pk}**${c.name}**: ${c.dataType}${nullable}`;
          }).join('\n');

          return {
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            },
            contents: [
              { value: `**Table: ${table.name}**` },
              { value: table.comment || '' },
              { value: `${table.columns.length} columns${table.rowCount ? ` • ~${table.rowCount.toLocaleString()} rows` : ''}` },
              { value: columns },
            ],
          };
        }

        return null;
      },
    });

    disposablesRef.current.push(completionProvider, hoverProvider);

    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
    };
  }, [monaco, schema]);

  const handleEditorMount: OnMount = useCallback((editor, monacoInstance) => {
    editorRef.current = editor;

    // Add Ctrl+Enter keybinding for execute
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      onExecute?.();
    });

    // Add Ctrl+Shift+F for format SQL
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF,
      () => {
        const currentValue = editor.getValue();
        const formatted = formatSqlQuery(currentValue);
        editor.setValue(formatted);
        onChange(formatted);
      }
    );

    // Add Ctrl+Shift+U for uppercase selection
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyU,
      () => {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
          const selectedText = editor.getModel()?.getValueInRange(selection);
          if (selectedText) {
            editor.executeEdits('uppercase', [{
              range: selection,
              text: selectedText.toUpperCase(),
            }]);
          }
        } else {
          // No selection - uppercase current word
          const position = editor.getPosition();
          if (position) {
            const wordInfo = editor.getModel()?.getWordAtPosition(position);
            if (wordInfo) {
              const wordRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: wordInfo.startColumn,
                endColumn: wordInfo.endColumn,
              };
              editor.executeEdits('uppercase', [{
                range: wordRange,
                text: wordInfo.word.toUpperCase(),
              }]);
            }
          }
        }
      }
    );

    // Ctrl+/ for toggle comment is built into Monaco

    // Focus the editor
    editor.focus();
  }, [onExecute, onChange]);

  const handleChange = useCallback((newValue: string | undefined) => {
    onChange(newValue || '');
  }, [onChange]);

  return (
    <div className="relative">
      <Editor
        height={height}
        language="sql"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          readOnly: disabled,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'off',
          parameterHints: { enabled: true },
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          contextmenu: true,
          snippetSuggestions: 'top',
          suggestSelection: 'first',
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showClasses: true,
            showFields: true,
            insertMode: 'replace',
            filterGraceful: true,
            localityBonus: true,
            shareSuggestSelections: true,
            showIcons: true,
          },
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'multiline',
            seedSearchStringFromSelection: 'selection',
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading editor...
          </div>
        }
      />
      {disabled && (
        <div className="absolute inset-0 bg-black/30 cursor-not-allowed" />
      )}
    </div>
  );
}));

SqlEditor.displayName = 'SqlEditor';
