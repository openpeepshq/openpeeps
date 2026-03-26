# Email Layout Components

This directory contains reusable email layout components for consistent email design across the platform.

## BaseEmailLayout

A flexible email layout component that provides consistent structure and styling for all email templates.

### Props

- `globals: EmailGlobals` - Required. Global email data including community config and server data
- `previewText?: string` - Optional. Preview text for email clients (defaults to notification text)
- `showLogo?: boolean` - Optional. Whether to show the community logo (default: true)
- `showGreeting?: boolean` - Optional. Whether to show personalized greeting (default: false)
- `showAppLinks?: boolean` - Optional. Whether to show app store download links (default: true)
- `showFooter?: boolean` - Optional. Whether to show the footer section (default: true)
- `recipientProfile?: PublicProfile` - Optional. Required if showGreeting is true
- `headerContent?: Snippet` - Optional. Custom header content
- `mainContent?: Snippet` - Optional. Custom main content (alternative to children)
- `footerContent?: Snippet` - Optional. Custom footer content
- `children?: Snippet` - Optional. Main email content

### Usage Examples

#### Basic Template Email (like ResetPassword)

```svelte
<BaseEmailLayout 
	{globals} 
	previewText="Reset your password"
	showLogo={true}
	showGreeting={false}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>Reset Your Password</Heading>
	<Text style={emailStyles.paragraph}>Email content here...</Text>
	<Button href={resetLink} style={emailStyles.button}>Reset Password</Button>
</BaseEmailLayout>
```

#### Notification Email (like Announcement)

```svelte
<BaseEmailLayout 
	{globals} 
	previewText="New announcement"
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
	recipientProfile={locals.recipientProfile}
>
	<Text style={emailStyles.paragraph}>Notification content...</Text>
	<Button href={actionLink} style={emailStyles.button}>View Announcement</Button>
</BaseEmailLayout>
```

#### Custom Footer

```svelte
<BaseEmailLayout 
	{globals} 
	showFooter={true}
>
	{#snippet footerContent()}
		<Text style={emailStyles.footerText}>Custom footer content</Text>
	{/snippet}
	
	<!-- Main content -->
	<Text style={emailStyles.paragraph}>Email content...</Text>
</BaseEmailLayout>
```

## Benefits

1. **Consistency**: All emails use the same base structure and styling
2. **Maintainability**: Changes to the layout only need to be made in one place
3. **Flexibility**: Configurable sections allow for different email types
4. **Accessibility**: Consistent structure improves email client compatibility
5. **Reusability**: Easy to create new email templates with minimal code

## Migration

To migrate existing email templates:

1. Replace custom HTML structure with `<BaseEmailLayout>`
2. Move content into the component's children or content snippets
3. Configure the component props based on your email's needs
4. Remove duplicate styling and use shared `emailStyles`