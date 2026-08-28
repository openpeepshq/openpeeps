# Markdown formatting

You can format posts, articles, event descriptions, group descriptions, messages,
and community pages with Markdown. Type the syntax below, then use **Preview** in
the editor to check how it will look.

<div style="height:20px"></div>

## Emphasis

| Type this | To get |
| --------- | ------ |
| `*italic*` or `_italic_` | *italic* |
| `**bold**` or `__bold__` | **bold** |
| `***bold italic***` | ***bold italic*** |
| `~~strikethrough~~` | ~~strikethrough~~ |

<div style="height:20px"></div>

## Headings

Start a line with `#` through `######`. More `#` characters make a smaller heading.

```
# Heading 1
## Heading 2
### Heading 3
```

### Heading 3

Leave a blank line before a heading so it is not read as a hashtag in the
middle of a sentence.

<div style="height:20px"></div>

## Lists

Unordered:

```
- First
- Second
  - Nested
```

- First
- Second
  - Nested

Ordered:

```
1. First
2. Second
3. Third
```

1. First
2. Second
3. Third

<div style="height:20px"></div>

## Links and images

| Type this | To get |
| --------- | ------ |
| `[AllPeep](https://allpeep.com)` | [AllPeep](https://allpeep.com) |
| `![logo](https://example.com/image.png)` | An image with that URL |

Bare URLs in posts also become clickable, and may show a link preview.

To attach photos or files to a post, use the media and document buttons in the
composer rather than Markdown image syntax.

<div style="height:20px"></div>

## Quotes

```
> This is a quoted line.
```

> This is a quoted line.

<div style="height:20px"></div>

## Code

Inline code uses backticks: `` `like this` `` → `like this`.

A fenced block uses three backticks, with an optional language name:

````
```
const greeting = 'hello';
```
````

```
const greeting = 'hello';
```

<div style="height:20px"></div>

## Tables

```
| Column | Column |
| ------ | ------ |
| Cell   | Cell   |
```

| Column | Column |
| ------ | ------ |
| Cell   | Cell   |

<div style="height:20px"></div>

## Mentions and tags

These are AllPeep-specific, not standard Markdown:

- `@handle` links to that person's profile. Start typing `@` in the editor to
  search and insert a mention.
- `#tag` links to the feed for that tag, for example `#welcome`.

<div style="height:20px"></div>

## Line breaks

A blank line starts a new paragraph.

To force a line break inside a paragraph, end the line with two spaces.

<div style="height:20px"></div>

## Horizontal rule

Three or more hyphens on their own line:

```
---
```

---
