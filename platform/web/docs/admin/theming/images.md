# Image Guidelines

This page documents the image assets used for your community's branding —
required dimensions and aspect ratios for each asset type, along with
examples of how they're currently used.

We've included information about the web version of OpenPeeps as 
well as the native mobile app that may be available for your community.

Image settings (other than the App Icon) are part of the [Configuration](/admin/configuration) section.

<div style="height:20px"></div>

## Guidelines

| Image Type                        | Dimensions                                                            | Notes                                                                                                                                                                          | Configuration |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Community Logo**                 | 4:1 aspect ratio. Displayed at 160px x 40px on the web.                 | The logo appears on the light and dark background colors for each theme, and you may choose a different logo to use on dark vs. light.  When used in the mobile app, the logo appears on top of the Page Background image.        | [Theme](/admin/configuration/community/theme) |
| **Browser Icon**                   | 256px x 256px                                                          | Also known as a favicon. Use an opaque background here to maintain icon integrity across multiple browser background colors.                                                                          | [Favicons](/admin/configuration/community/favicons) |
| **App Header / Page Background**   | Square, with no text or high-contrast regions.                          | Used at a few different aspect ratios (portrait to landscape), so a simple image is recommended. In the mobile app, the logo is overlaid on this image, so it should have no text of its own. | [Theme](/admin/configuration/community/theme) |
| **Login Page / About Page Image**  | Portrait aspect ratio with key content focused in the center of the image | Shown to visitors when they're logging in.  Does not appear in the mobile web view / PWA , but does appear on the native mobile app.                                                                                                                                  | [Theme](/admin/configuration/community/theme) |
| **App Icon**                       | 1024px x 1024px                                                        | This is used when you deploy the OpenPeeps mobile application.  It should be a square. Use a 10% margin all around to support automated corner rounding.                                                                                        | This is configured with the app build |
| **Profiles + Groups Icon**         | Square. 500px x 500px recommended.                                     |    These will be rounded into a circle for display.                                                                                                                                                                             | Set per profile/group |
| **Profiles + Groups Banner**       | 670px x 210px (1340px x 420px recommended)                             |                                                                                                                                                                                 | Set per profile/group |
| **Event Image**                    | 16:9 aspect ratio                                                       | Avoid pushing text all the way to the edges — it may get cropped when previews of the image are generated in other posts.                                                    | Set per event |


<div style="height:20px"></div>

## Examples

![Login page labeled with the login page image and light mode logo](/docs/admin/theming/login_page.png)

Login page — login page image and light mode logo.

<div style="height:20px"></div>

![Community feed showing an event image in a post and reply](/docs/admin/theming/community.png)

Community feed (light mode) — event images appear inline in the feed.  There is a colorful background behind the feed.

<div style="height:20px"></div>

![Events page labeled with dark mode logo, profile image, and event image](/docs/admin/theming/events_page.png)

Events page (dark mode) — dark mode logo, profile image, and event image.

<div style="height:20px"></div>

![Group page labeled with the group/profile icon and group/profile banner](/docs/admin/theming/profiles.png)

Group page — profile/group icon and profile/group banner.

<div style="height:20px"></div>


