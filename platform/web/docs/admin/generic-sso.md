# Setting Up Generic SSO

Generic SSO (Single Sign-On) allows you to integrate your AllPeep community with any authentication provider that can provide user profile information via an HTTP API endpoint. This flexible system supports multiple SSO providers simultaneously and can automatically create accounts and profiles for authenticated users.

<div style="height:20px"></div>

## How It Works

The generic SSO flow works as follows:

1. **User Redirect**: Users are redirected to `/auth/sso/generic` with authentication parameters (typically as URL query parameters or hash fragments).

2. **Profile Request**: The system iterates through configured SSO providers and makes an HTTP request to each provider's user profile endpoint, using the provided authentication parameters.

3. **Profile Extraction**: User information (email, handle, avatar, display name) is extracted from the profile response using JSONPath expressions.

4. **Account Matching**: The system looks for an existing account with the extracted email address.

5. **Account/Profile Creation**: If no account exists and `createAccounts` is enabled, a new account is created. If no profile exists and `createProfiles` is enabled, a new profile is created.

6. **Authentication**: Upon successful authentication, the user receives a JWT token and is logged into the community.

<div style="height:20px"></div>

## Directing members to SSO login

When members follow a community link (for example from an email) and are not signed in, they land on `/auth/login`. Each generic SSO provider can expose its own login entry:

1. Set **Id** and **Name** on the provider (the name appears on the login button).
2. Set **LoginLink** to your identity provider's login page (a full `https://` address, or a path on this community).
3. Optionally check **OnlySSO** under **Sso** to hide the password form.

Every configured SSO destination is listed on the login page: each generic provider with a valid **LoginLink**, and each OIDC provider. If **OnlySSO** is on and there is exactly one destination, members are redirected there automatically.

Administrators with a password account can still sign in through a visually hidden **Administrator login** control on that page, or by opening:

```
https://your-community.com/auth/login?local=1
```

<div style="height:20px"></div>

## Configuration Structure

Generic SSO is configured in your core configuration file under the `sso.generic` array. Each entry in the array represents a separate SSO provider.

### Configuration Schema

```typescript
{
  sso: {
    onlySSO?: boolean,           // Optional. Hide the password form; send members to SSO.
    generic: [
      {
        id: string,                 // Short id for the provider (used in UI test ids)
        name: string,               // Label on the login button (“Login with …”)
        loginLink?: string,         // Optional. SSO login URL shown on /auth/login
        userProfileRequest: {
          url: string,              // URL to fetch user profile (supports template interpolation)
          authHeader?: string       // Authorization header value (supports template interpolation)
        },
        userProfilePaths: {
          email: string,            // JSONPath to email (required, supports template interpolation)
          handle?: string,          // JSONPath to handle (optional, supports template interpolation)
          avatar?: string,          // JSONPath to avatar URL (optional, supports template interpolation)
          displayName?: string      // JSONPath to display name (optional, supports template interpolation)
        },
        createAccounts?: boolean,   // Whether to create new accounts (default: true)
        createProfiles?: boolean    // Whether to create new profiles (default: true)
      }
    ]
  }
}
```

<div style="height:20px"></div>

## Template Interpolation

Both the `userProfileRequest` fields and `userProfilePaths` support template string interpolation. Any parameters passed to the SSO endpoint (from URL query parameters or hash fragments) can be referenced using `${parameterName}` syntax.

For example, if a user is redirected to `/auth/sso/generic?token=abc123&userId=456`, you can use:

- `${token}` - will be replaced with `abc123`
- `${userId}` - will be replaced with `456`

### Example with Interpolation

```json
{
  "userProfileRequest": {
    "url": "https://api.example.com/users/${userId}",
    "authHeader": "Bearer ${token}"
  },
  "userProfilePaths": {
    "email": "$.data.email",
    "handle": "$.data.username"
  }
}
```

<div style="height:20px"></div>

## JSONPath Expressions

JSONPath is used to extract data from the profile API response. JSONPath expressions start with `$` to reference the root of the JSON object.

### Common JSONPath Patterns

- `$.email` - Direct property access
- `$.data.user.email` - Nested property access
- `$.users[0].email` - Array element access
- `$.data.account.email` - Deep nested access

### JSONPath with Interpolation

JSONPath expressions can also use template interpolation. For example, if you need to access a dynamic property:

```json
{
  "userProfilePaths": {
    "email": "$.data.${userType}.email"
  }
}
```

<div style="height:20px"></div>

## Configuration Examples

### Example 1: Simple OAuth Provider

This example shows a basic OAuth provider that returns user information in a standard format:

```json
{
  "sso": {
    "generic": [
      {
        "id": "provider",
        "name": "Provider",
        "loginLink": "https://api.provider.com/oauth/authorize",
        "userProfileRequest": {
          "url": "https://api.provider.com/userinfo",
          "authHeader": "Bearer ${access_token}"
        },
        "userProfilePaths": {
          "email": "$.email",
          "displayName": "$.name",
          "avatar": "$.picture"
        },
        "createAccounts": true,
        "createProfiles": true
      }
    ]
  }
}
```

**Profile Response Example:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://api.provider.com/avatars/user123.jpg"
}
```

<div style="height:20px"></div>

### Example 2: Custom API with Nested Structure

This example shows a provider with a more complex nested response structure:

```json
{
  "sso": {
    "generic": [
      {
        "id": "example-api",
        "name": "Example API",
        "loginLink": "https://api.example.com/login",
        "userProfileRequest": {
          "url": "https://api.example.com/v1/users/${userId}",
          "authHeader": "Authorization: Bearer ${apiKey}"
        },
        "userProfilePaths": {
          "email": "$.data.account.email",
          "handle": "$.data.account.username",
          "displayName": "$.data.profile.displayName",
          "avatar": "$.data.profile.avatarUrl"
        },
        "createAccounts": true,
        "createProfiles": true
      }
    ]
  }
}
```

**Profile Response Example:**

```json
{
  "data": {
    "account": {
      "email": "user@example.com",
      "username": "johndoe"
    },
    "profile": {
      "displayName": "John Doe",
      "avatarUrl": "https://cdn.example.com/avatars/johndoe.png"
    }
  }
}
```

<div style="height:20px"></div>

### Example 3: Multiple SSO Providers

You can configure multiple SSO providers. The system will try each one in order until one succeeds:

```json
{
  "sso": {
    "generic": [
      {
        "id": "provider1",
        "name": "Provider One",
        "loginLink": "https://provider1.com/login",
        "userProfileRequest": {
          "url": "https://provider1.com/api/user",
          "authHeader": "Bearer ${token1}"
        },
        "userProfilePaths": {
          "email": "$.email"
        }
      },
      {
        "id": "provider2",
        "name": "Provider Two",
        "loginLink": "https://provider2.com/login",
        "userProfileRequest": {
          "url": "https://provider2.com/users/me",
          "authHeader": "Token ${token2}"
        },
        "userProfilePaths": {
          "email": "$.user.email",
          "displayName": "$.user.fullName"
        }
      }
    ]
  }
}
```

<div style="height:20px"></div>

## Account and Profile Creation

### Automatic Account Creation

When `createAccounts` is set to `true` (the default), the system will automatically create new accounts for users who don't already exist. The account will be created with:

- Email address from the profile response
- A randomly generated password (users won't need to use this)
- Email validation automatically set to `true`

### Automatic Profile Creation

When `createProfiles` is set to `true` (the default), the system will automatically create profiles for new accounts. If an account exists but has no profile, a profile will be created if this option is enabled.

**Profile Data Extracted:**

- **Handle**: Extracted from profile response if configured, otherwise generated from email username
- **Avatar**: Extracted from profile response if configured
- **Display Name**: Extracted from profile response if configured

### Existing Accounts

If an account with the email address already exists:

- The user will be logged in to that existing account
- If the account has no profile and `createProfiles` is enabled, a profile will be created
- If the account already has a profile, no new profile will be created

<div style="height:20px"></div>

## Authentication Flow

### Redirect URL Format

Users should be redirected to your AllPeep community's SSO endpoint:

```
https://your-community.com/auth/sso/generic?param1=value1&param2=value2
```

Or using hash fragments:

```
https://your-community.com/auth/sso/generic#param1=value1&param2=value2
```

### Required Parameters

The parameters you need to pass depend on your SSO provider configuration. Common parameters include:

- `access_token` or `token` - OAuth access token
- `apiKey` - API key for authentication
- `userId` - User identifier
- Any other parameters your profile endpoint requires

### Success Flow

1. User is redirected to `/auth/sso/generic` with parameters
2. System fetches user profile from configured endpoint
3. System extracts email and other profile data
4. System creates or matches account
5. System creates profile if needed
6. User receives JWT token
7. User is redirected to `/feeds/local`

### Error Handling

If authentication fails:

- The system will try the next configured SSO provider (if multiple are configured)
- If all providers fail, an error message is displayed
- Error messages include details about what failed (e.g., "Email at $.email" if email extraction failed)

<div style="height:20px"></div>

## Best Practices

### Security Considerations

1. **HTTPS Only**: Always use HTTPS for profile endpoints to protect authentication tokens
2. **Token Validation**: Ensure your profile endpoint validates tokens properly
3. **Email Verification**: The system automatically marks SSO-created accounts as email-validated, but ensure your SSO provider verifies emails

### Configuration Tips

1. **Test JSONPath Expressions**: Use a JSONPath tester to verify your expressions work with your API's response format
2. **Handle Optional Fields**: Make sure optional fields (handle, avatar, displayName) can handle cases where they're not present in the response
3. **Multiple Providers**: When using multiple providers, order them by priority (most common first)
4. **Error Messages**: Check server logs if authentication fails - they contain detailed error information

### Testing

1. **Test with Real Tokens**: Use actual authentication tokens from your SSO provider when testing
2. **Verify Email Extraction**: Ensure the email path correctly extracts a valid email address
3. **Test Account Creation**: Test both new account creation and existing account login
4. **Test Profile Creation**: Verify profiles are created correctly with all configured fields

<div style="height:20px"></div>

## Troubleshooting

### Common Issues

**"No valid authentication found"**

- Check that your profile endpoint URL is correct
- Verify that the authentication header format matches your provider's requirements
- Ensure the parameters passed in the URL match what your configuration expects

**"Email at [path]" error**

- Verify the JSONPath expression correctly extracts the email
- Ensure the email field exists in the profile response
- Check that the email is in a valid format

**Profile request fails**

- Check server logs for detailed error messages
- Verify the authentication token is valid
- Ensure the profile endpoint is accessible from your server
- Check that the Authorization header format is correct

**Account not created**

- Verify `createAccounts` is set to `true` (or omitted, as it defaults to true)
- Check that the email extraction is working correctly
- Ensure the email doesn't already exist if you want to test account creation

<div style="height:20px"></div>

## Additional Resources

- [JSONPath Documentation](https://goessner.net/articles/JsonPath/)
- [Template String Interpolation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
