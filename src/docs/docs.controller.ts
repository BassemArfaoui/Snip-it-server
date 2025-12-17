import { Controller, Get, Res } from '@nestjs/common';
import { type Response } from 'express';

@Controller('docs')
export class DocsController {
  @Get('api')
  getApiDocs(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Snip-it API Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 50px;
        }
        .section-title {
            font-size: 1.8em;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        .endpoint {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 6px;
        }
        .endpoint:hover {
            background: #f0f2f5;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .endpoint-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        .method {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.9em;
            min-width: 60px;
            text-align: center;
            color: white;
        }
        .method.post {
            background: #10b981;
        }
        .method.get {
            background: #3b82f6;
        }
        .method.put {
            background: #f59e0b;
        }
        .method.delete {
            background: #ef4444;
        }
        .path {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 1.05em;
            color: #333;
            font-weight: 600;
            flex: 1;
        }
        .description {
            color: #666;
            margin-bottom: 12px;
            font-size: 0.95em;
        }
        .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        .detail-group {
            background: white;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
        }
        .detail-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .param-list {
            list-style: none;
            font-size: 0.85em;
        }
        .param-list li {
            padding: 6px 0;
            color: #555;
            border-bottom: 1px solid #f0f0f0;
        }
        .param-list li:last-child {
            border-bottom: none;
        }
        .param-name {
            font-family: 'Monaco', monospace;
            color: #667eea;
            font-weight: 600;
        }
        .param-type {
            color: #999;
            font-size: 0.85em;
        }
        .param-required {
            color: #ef4444;
            font-weight: bold;
        }
        .example {
            background: #1f2937;
            color: #e5e7eb;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Monaco', monospace;
            font-size: 0.85em;
            overflow-x: auto;
            margin-top: 10px;
        }
        .note {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            border-radius: 4px;
            color: #92400e;
            font-size: 0.9em;
            margin-top: 15px;
        }
        footer {
            background: #f3f4f6;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            .details {
                grid-template-columns: 1fr;
            }
            header h1 {
                font-size: 1.8em;
            }
            .endpoint-header {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔐 Snip-it API Documentation</h1>
            <p>Complete Authentication & API Reference</p>
        </header>

        <div class="content">
            <!-- Auth Section -->
            <div class="section">
                <h2 class="section-title">Authentication</h2>

                <!-- Register -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method post">POST</span>
                        <span class="path">/auth/register</span>
                    </div>
                    <div class="description">Create a new user account and send OTP to email</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Body</div>
                            <ul class="param-list">
                                <li><span class="param-name">email</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">username</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">password</span> <span class="param-type">(string, min 8)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">fullName</span> <span class="param-type">(string, min 3)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">imageProfile</span> <span class="param-type">(string)</span> (optional)</li>
                                <li><span class="param-name">role</span> <span class="param-type">(string)</span> (optional)</li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Response</div>
                            <div class="example">
{
  "message": "Registration successful. Please verify your email to continue."
}
                            </div>
                        </div>
                    </div>
                    <div class="note">📧 OTP will be sent to email and logged in console during development</div>
                </div>

                <!-- Verify Email -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method post">POST</span>
                        <span class="path">/auth/verify-email</span>
                    </div>
                    <div class="description">Verify email address with OTP code</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Body</div>
                            <ul class="param-list">
                                <li><span class="param-name">email</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">otp</span> <span class="param-type">(string, exactly 6)</span> <span class="param-required">*</span></li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Response</div>
                            <div class="example">
{
  "message": "Email verified successfully.",
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Resend OTP -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method post">POST</span>
                        <span class="path">/auth/resend-otp</span>
                    </div>
                    <div class="description">Request a new OTP code to be sent to email</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Body</div>
                            <ul class="param-list">
                                <li><span class="param-name">email</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Response</div>
                            <div class="example">
{
  "message": "A new OTP has been sent to your email."
}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Login -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method post">POST</span>
                        <span class="path">/auth/login</span>
                    </div>
                    <div class="description">Authenticate user with email/username and password. Requires verified email.</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Body</div>
                            <ul class="param-list">
                                <li><span class="param-name">identifier</span> <span class="param-type">(string: email or username)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">password</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Response</div>
                            <div class="example">
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
                            </div>
                        </div>
                    </div>
                    <div class="note">🔒 Email must be verified before login is allowed</div>
                </div>

                <!-- Refresh Tokens -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method post">POST</span>
                        <span class="path">/auth/refresh</span>
                    </div>
                    <div class="description">Get new access and refresh tokens using refresh token</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Body</div>
                            <ul class="param-list">
                                <li><span class="param-name">refreshToken</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Response</div>
                            <div class="example">
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
                            </div>
                        </div>
                    </div>
                    <div class="note">⏱️ Access token expires in 15 minutes, Refresh token expires in 7 days</div>
                </div>

                <!-- Forgot Password -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method post">POST</span>
                        <span class="path">/auth/forgot-password</span>
                    </div>
                    <div class="description">Request a password reset link. Response is generic to avoid user enumeration.</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Body</div>
                            <ul class="param-list">
                                <li><span class="param-name">email</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Response</div>
                            <div class="example">
{
  "message": "If the email exists, a password reset link has been sent."
}
                            </div>
                        </div>
                    </div>
                    <div class="note">🔑 A reset link is sent via email (logged to console in development).</div>
                </div>

                <!-- Reset Password -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method post">POST</span>
                        <span class="path">/auth/reset-password</span>
                    </div>
                    <div class="description">Reset password using the link token. Invalidates all refresh tokens for security.</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Body</div>
                            <ul class="param-list">
                                <li><span class="param-name">email</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">token</span> <span class="param-type">(string)</span> <span class="param-required">*</span></li>
                                <li><span class="param-name">newPassword</span> <span class="param-type">(string, min 8)</span> <span class="param-required">*</span></li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Response</div>
                            <div class="example">
{
  "message": "Password has been reset successfully"
}
                            </div>
                        </div>
                    </div>
                    <div class="note">🔐 All refresh tokens are invalidated after password reset. Users must login again.</div>
                </div>

                <!-- GitHub OAuth -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method get">GET</span>
                        <span class="path">/auth/github</span>
                    </div>
                    <div class="description">Initiates GitHub OAuth login/signup flow</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Redirect</div>
                            <div class="example">Redirects to GitHub login, then to callback on success</div>
                        </div>
                    </div>
                    <div class="note">🔐 Automatically creates account or links to existing email. Auto-verifies email.</div>
                </div>
            </div>

            <!-- Configuration Section -->
            <div class="section">
                <h2 class="section-title">Configuration</h2>

                <!-- Environment Variables -->
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method get" style="background: #8b5cf6;">ENV</span>
                        <span class="path">.env Settings</span>
                    </div>
                    <div class="description">Required environment variables for authentication</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">JWT Settings</div>
                            <ul class="param-list">
                                <li><span class="param-name">JWT_ACCESS_SECRET</span> - Secret for access tokens</li>
                                <li><span class="param-name">JWT_REFRESH_SECRET</span> - Secret for refresh tokens</li>
                                <li><span class="param-name">JWT_ACCESS_EXPIRES_IN</span> - Default: 15m</li>
                                <li><span class="param-name">JWT_REFRESH_EXPIRES_IN</span> - Default: 7d</li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">OTP Settings</div>
                            <ul class="param-list">
                                <li><span class="param-name">OTP_LENGTH</span> - OTP code length (Default: 6)</li>
                                <li><span class="param-name">OTP_TTL_MINUTES</span> - OTP expiration (Default: 10 min)</li>
                                <li><span class="param-name">BCRYPT_SALT_ROUNDS</span> - Hash rounds (Default: 10)</li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">OAuth - GitHub</div>
                            <ul class="param-list">
                                <li><span class="param-name">GITHUB_CLIENT_ID</span> - Get from GitHub OAuth App</li>
                                <li><span class="param-name">GITHUB_CLIENT_SECRET</span> - Get from GitHub OAuth App</li>
                                <li><span class="param-name">GITHUB_CALLBACK_URL</span> - Default: http://localhost:3000/auth/github/callback</li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">URLs & Frontend</div>
                            <ul class="param-list">
                                <li><span class="param-name">FRONTEND_URL</span> - Frontend origin for OAuth redirects (Default: http://localhost:3001)</li>
                                <li><span class="param-name">PASSWORD_RESET_URL</span> - Password reset page URL</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Headers Section -->
            <div class="section">
                <h2 class="section-title">Authorization</h2>

                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method get" style="background: #6366f1;">HEADER</span>
                        <span class="path">Protected Routes</span>
                    </div>
                    <div class="description">Add Bearer token to Authorization header for protected endpoints</div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Request Header</div>
                            <div class="example">
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                            </div>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Token Payload</div>
                            <ul class="param-list">
                                <li><span class="param-name">sub</span> - User ID</li>
                                <li><span class="param-name">email</span> - User email</li>
                                <li><span class="param-name">username</span> - User username</li>
                                <li><span class="param-name">iat</span> - Issued at</li>
                                <li><span class="param-name">exp</span> - Expiration</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Error Codes Section -->
            <div class="section">
                <h2 class="section-title">Error Codes</h2>

                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method delete">ERROR</span>
                        <span class="path">Common HTTP Responses</span>
                    </div>
                    <div class="details">
                        <div class="detail-group">
                            <div class="detail-title">Error Responses</div>
                            <ul class="param-list">
                                <li><span class="param-name">400</span> - Bad Request (validation/business logic error)</li>
                                <li><span class="param-name">401</span> - Unauthorized (invalid credentials/token)</li>
                                <li><span class="param-name">422</span> - Unprocessable Entity (validation error)</li>
                                <li><span class="param-name">500</span> - Internal Server Error</li>
                            </ul>
                        </div>
                        <div class="detail-group">
                            <div class="detail-title">Error Response Format</div>
                            <div class="example">
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Start Section -->
            <div class="section">
                <h2 class="section-title">Quick Start</h2>
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method get" style="background: #06b6d4;">GUIDE</span>
                        <span class="path">Authentication Flow</span>
                    </div>
                    <ol style="padding: 20px; line-height: 1.8; color: #555;">
                        <li><strong>POST /auth/register</strong> → Create account, receive OTP via email/console</li>
                        <li><strong>POST /auth/verify-email</strong> → Verify with OTP, get access + refresh tokens</li>
                        <li><strong>POST /auth/login</strong> → Login with credentials (requires verified email)</li>
                        <li><strong>Use accessToken</strong> → Add to Authorization header for protected routes</li>
                        <li><strong>POST /auth/refresh</strong> → When access token expires, use refresh token</li>
                    </ol>
                    <div class="note">💡 Tip: Import the Postman collection from /scripts/postman_auth_collection.json for easy testing</div>
                </div>
            </div>
        </div>

        <footer>
            <p>Snip-it API Documentation • Built with NestJS • Last Updated: December 13, 2025</p>
        </footer>
    </div>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
