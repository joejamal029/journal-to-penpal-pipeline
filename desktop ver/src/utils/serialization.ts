/**
 * Recursively serializes a list of BlockNote blocks into clean plain text.
 * Strips all metadata, labels, and badges, and joins paragraphs/blocks with double newlines.
 */
export function serializeToPlainText(blocks: any[]): string {
  if (!Array.isArray(blocks)) return '';

  const lines: string[] = [];

  const processBlock = (block: any) => {
    let text = '';
    if (block.type === 'routedEntry') {
      if (block.content && Array.isArray(block.content)) {
        text = block.content.map((inline: any) => inline.text || '').join('');
      } else {
        text = block.props?.entryContent || '';
      }
    } else if (block.type === 'scaffoldBlock') {
      const label = block.props?.sectionLabel || block.props?.title || 'Scaffold Section';
      const labelText = label ? `[Scaffold: ${label}] ` : '';
      let inlineText = '';
      if (block.content && Array.isArray(block.content)) {
        inlineText = block.content.map((inline: any) => inline.text || '').join('');
      }
      text = labelText + inlineText;
    } else if (block.content && Array.isArray(block.content)) {
      text = block.content.map((inline: any) => inline.text || '').join('');
    } else if (typeof block.content === 'string') {
      text = block.content;
    }
    if (text.trim() !== '') {
      lines.push(text);
    }
    if (block.children && Array.isArray(block.children)) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return lines.join('\n\n');
}
