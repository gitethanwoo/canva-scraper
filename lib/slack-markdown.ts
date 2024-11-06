interface MarkdownToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'strike' | 'link';
  content: string;
  url?: string;
}

function tokenize(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Bold
    if (text.slice(currentIndex).match(/^\*([^*]+)\*/)) {
      const match = text.slice(currentIndex).match(/^\*([^*]+)\*/);
      if (match) {
        tokens.push({ type: 'bold', content: match[1] });
        currentIndex += match[0].length;
        continue;
      }
    }

    // Italic
    if (text.slice(currentIndex).match(/^_([^_]+)_/)) {
      const match = text.slice(currentIndex).match(/^_([^_]+)_/);
      if (match) {
        tokens.push({ type: 'italic', content: match[1] });
        currentIndex += match[0].length;
        continue;
      }
    }

    // Code
    if (text.slice(currentIndex).match(/^`([^`]+)`/)) {
      const match = text.slice(currentIndex).match(/^`([^`]+)`/);
      if (match) {
        tokens.push({ type: 'code', content: match[1] });
        currentIndex += match[0].length;
        continue;
      }
    }

    // Strikethrough
    if (text.slice(currentIndex).match(/^~([^~]+)~/)) {
      const match = text.slice(currentIndex).match(/^~([^~]+)~/);
      if (match) {
        tokens.push({ type: 'strike', content: match[1] });
        currentIndex += match[0].length;
        continue;
      }
    }

    // Links
    if (text.slice(currentIndex).match(/^<([^|>]+)(?:\|([^>]+))?>/)) {
      const match = text.slice(currentIndex).match(/^<([^|>]+)(?:\|([^>]+))?>/);
      if (match) {
        tokens.push({
          type: 'link',
          content: match[2] || match[1],
          url: match[1],
        });
        currentIndex += match[0].length;
        continue;
      }
    }

    // Plain text
    const nextSpecialChar = text.slice(currentIndex).search(/[\*_`~<]/);
    const textContent = nextSpecialChar === -1
      ? text.slice(currentIndex)
      : text.slice(currentIndex, currentIndex + nextSpecialChar);

    if (textContent) {
      tokens.push({ type: 'text', content: textContent });
      currentIndex += textContent.length;
    } else {
      currentIndex += 1;
    }
  }

  return tokens;
}

export function interpretMrkdwn(text: string): string {
  const tokens = tokenize(text);
  
  return tokens.map(token => {
    switch (token.type) {
      case 'bold':
        return `**${token.content}**`;
      case 'italic':
        return `*${token.content}*`;
      case 'code':
        return `\`${token.content}\``;
      case 'strike':
        return `~~${token.content}~~`;
      case 'link':
        return `[${token.content}](${token.url})`;
      default:
        return token.content;
    }
  }).join('');
} 