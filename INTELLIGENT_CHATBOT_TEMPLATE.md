# Intelligent Chatbot Template

This document describes the new Intelligent Chatbot template and how to use its configuration options.

## Overview

The Intelligent Chatbot template provides a modern, customizable chatbot interface with a beautiful UI based on the provided design. It's perfect for customer support, knowledge base search, and automated conversations.

![Intelligent Chatbot Template](https://via.placeholder.com/800x500?text=Intelligent+Chatbot+Template)

## Features

- Modern, clean UI with a navigation bar, header section, and content area
- Customizable colors, fonts, and styling
- Quick action buttons for common queries
- Features section with checkmarks
- Responsive design that works on all devices
- Dynamic API URL detection for both preview and public modes
- Detailed error handling and debugging information

## No-Code Configuration Options

The template includes extensive no-code configuration options:

### App Settings

- **App Title**: The title of your chatbot app
- **App Description**: A short description of your chatbot
- **Language**: The language of your chatbot interface (English or Swedish)

### Content

- **Content Title**: The title displayed in the content section
- **Welcome Message**: The initial message displayed by the chatbot
- **Input Placeholder**: Placeholder text for the input field
- **Send Button Text**: Text for the send button
- **Demo Button Text**: Text for the demo button
- **Typing Indicator Text**: Text shown while the AI is generating a response
- **Error Message**: Message shown when an error occurs
- **No Response Text**: Text shown when no response is received

### Navigation

- **Tab 1-3 Text**: Text for the navigation tabs

### Quick Actions

- **Quick Action 1-5**: Text for the quick action buttons

### Features

- **Features Section Title**: Title for the features section
- **Feature 1-4**: Description of the features

### AI Settings

- **Model**: The AI model to use for the chatbot
- **Temperature**: Controls randomness in the response (0-1)
- **System Prompt**: Instructions for the AI model
- **API Key**: API key for accessing the AI model

### Styling

- **Primary Color**: Main color for buttons and accents
- **Secondary Color**: Secondary color for highlights
- **Background Color**: Background color of the page
- **Text Color**: Main text color
- **Light Background Color**: Light background color for sections
- **Border Color**: Color for borders
- **Font Family**: Font family for the app
- **Font Size (Small/Medium/Large)**: Font sizes for different text elements
- **Border Radius**: Roundness of corners (None, Slight, Standard, Medium, Rounded, Very Rounded)

## How to Use

1. Run the seed script to add the template:
   ```
   python backend/scripts/seed_app_templates.py
   ```

   If the template already exists and you want to update it:
   ```
   python backend/scripts/seed_app_templates.py --force-update
   ```

2. Go to the App Templates page in the admin dashboard
3. Find the "Intelligent Chatbot" template
4. Click "Configure & Deploy"
5. Customize the template using the configuration options
6. Deploy the app
7. Access the app via the public URL

## Technical Details

The template uses the Peer AI LLM API to generate responses. It dynamically determines the correct API URL based on the context (preview or public mode) and includes fallback mechanisms to ensure it works in all environments.

The template is built with pure HTML, CSS, and JavaScript, with no external dependencies. It's designed to be lightweight and fast.

## Customization

In addition to the no-code configuration options, you can also customize the template code directly. The template code is written in a clean, modular way that makes it easy to understand and modify.

## Troubleshooting

If you encounter any issues with the template, check the browser console for detailed error information. The template includes extensive logging to help diagnose issues.

## Support

For support with this template, please contact the Peer AI team.
