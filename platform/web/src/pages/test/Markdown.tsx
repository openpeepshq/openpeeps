import { useSetPageHeader } from '@openpeeps/react';
import { PostMarkdown } from '@openpeeps/react/components';

const source = `
# Hello World

[Link](https://allpeep.com)

![Image](https://allpeep.com/wp-content/uploads/2024/06/allpeep-pacificblue-logo-300x75.png)

\`\`\`typescript
const a = 1;
\`\`\`

**Bold**

*Italic*

> Blockquote

| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

* List item
  * List item
`;

export function TestMarkdown() {
  useSetPageHeader('Markdown sandbox');
  return (
    <div className="p-4">
      <PostMarkdown source={source} />
    </div>
  );
}
