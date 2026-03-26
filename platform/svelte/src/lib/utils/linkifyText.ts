function linkifyText(text: string) {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.replace(
		urlRegex,
		(url) => `<a href="${url}" target="_blank" class="text-blue-500 underline">${url}</a>`
	);
}

export default linkifyText;
