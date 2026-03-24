import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import { WebView } from 'react-native-webview';

interface MarkdownPreviewProps {
  markdown: string;
}

const MARKDOWN_CSS = `
  body {
    margin: 0;
    padding: 0;
    background: #111D2B;
    color: #EAF1FB;
    font-family: Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 15px;
    line-height: 1.72;
    letter-spacing: 0.01em;
    text-rendering: optimizeLegibility;
  }
  * { box-sizing: border-box; }
  a {
    color: #8BC4FF;
    text-decoration-thickness: 1.2px;
    text-underline-offset: 2px;
  }
  a:hover { color: #A3D3FF; }
  h1, h2, h3, h4, h5, h6 {
    color: #F1F8FF;
    margin: 0 0 12px;
    line-height: 1.35;
    letter-spacing: 0.01em;
  }
  h1 { font-size: 1.75em; margin-top: 0; }
  h2 { font-size: 1.42em; margin-top: 4px; }
  h3 { font-size: 1.22em; margin-top: 4px; }
  p {
    margin: 0 0 12px;
    color: #D7E6F7;
  }
  pre {
    margin: 0 0 12px;
    border: 1px solid #30455F;
    border-radius: 10px;
    background: #0D1724;
    color: #CDE5FF;
    padding: 12px;
    overflow-x: auto;
  }
  code {
    color: #CDE5FF;
    background: #1A3048;
    border-radius: 4px;
    padding: 2px 5px;
    font-family: 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace;
    font-size: 0.92em;
  }
  pre code {
    background: transparent;
    padding: 0;
    font-size: 0.95em;
  }
  blockquote {
    margin: 0 0 12px;
    border-left: 3px solid #4F83B1;
    background: rgba(29, 49, 73, 0.35);
    border-radius: 0 8px 8px 0;
    padding: 8px 12px;
    color: #C8DDF4;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 14px;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid #30455F;
  }
  th, td {
    border: 1px solid #30455F;
    padding: 9px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #132338;
    color: #EAF6FF;
    font-weight: 700;
  }
  tr:nth-child(even) td {
    background: rgba(23, 39, 58, 0.55);
  }
  td {
    background: #111D2B;
    color: #D7E6F7;
  }
  ul, ol {
    margin: 0 0 12px;
    padding-left: 22px;
    color: #D7E6F7;
  }
  li { margin-bottom: 4px; }
  li p { margin-bottom: 6px; }
  hr {
    border: none;
    border-top: 1px solid #30455F;
    margin: 14px 0;
  }
  img {
    max-width: 100%;
    border-radius: 8px;
  }
  math { color: #EAF1FB; }
`;

function makeHtml(markdown: string): string {
  const parser = new Marked({
    gfm: true,
    breaks: true,
  });

  parser.use(
    markedKatex({
      throwOnError: false,
      output: 'mathml',
    })
  );

  const rendered = parser.parse(markdown || '') as string;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  ${MARKDOWN_CSS}
</style>
</head>
<body>
${rendered || '<p><em>Empty content.</em></p>'}
</body>
</html>`;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const html = useMemo(() => makeHtml(markdown), [markdown]);
  const rendered = useMemo(() => {
    const parser = new Marked({
      gfm: true,
      breaks: true,
    });

    parser.use(
      markedKatex({
        throwOnError: false,
        output: 'mathml',
      })
    );

    return (parser.parse(markdown || '') as string) || '<p><em>Empty content.</em></p>';
  }, [markdown]);

  const webFallbackHtml = useMemo(() => {
    return `<style>${MARKDOWN_CSS}</style>${rendered}`;
  }, [rendered]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.root}>
        {React.createElement('div', {
          style: styles.webFallback,
          dangerouslySetInnerHTML: { __html: webFallbackHtml },
        })}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url ?? '';
          if (url.startsWith('about:blank')) {
            return true;
          }
          void Linking.openURL(url);
          return false;
        }}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#111D2B',
  },
  webFallback: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    backgroundColor: '#111D2B',
    color: '#EAF1FB',
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
  } as any,
});
