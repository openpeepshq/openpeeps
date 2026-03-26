export const firstNWords = (markdown: string | undefined, n: number) => {
    if (!markdown) return '';
    // Regular expression to match words and markdown links.
    const regex = /\[.*?\]\(.*?\)|(\w+)/g;

    let wordCount = 0;
    const firstTwelveWords = [];
    let match;

    while ((match = regex.exec(markdown)) !== null) {
        // Check if the match is a link or a regular word.
        if (match[1]) { // It's a regular word
            firstTwelveWords.push(match[1]);
            wordCount++;
        } else { // It's a markdown link - treat it as one word
            firstTwelveWords.push(match[0]);  // Add the entire link string
            wordCount++;
        }

        if (wordCount >= n) {
            break;
        }
    }

    return firstTwelveWords.join(" ");
}