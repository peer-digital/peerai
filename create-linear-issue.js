// Script to create a Linear issue using the GraphQL API
require('dotenv').config();
const fetch = require('node-fetch');

// Get API key from .env file
const API_KEY = process.env.LINEAR_API_KEY;

if (!API_KEY) {
  console.error('LINEAR_API_KEY not found in .env file');
  process.exit(1);
}

// First, let's get the teams to find the team ID
async function getTeams() {
  const query = `
    query Teams {
      teams {
        nodes {
          id
          name
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('Error fetching teams:', data.errors);
      return null;
    }

    return data.data.teams.nodes;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Create the issue
async function createIssue(teamId) {
  const issueTitle = 'Fix React slotProps warning in EnhancedConfigForm component';
  const issueDescription = `## Description
We're currently experiencing React warnings in the console related to the \`slotProps\` prop being passed to DOM elements. The warning appears as:

\`\`\`
Warning: React does not recognize the \`slotProps\` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase \`slotprops\` instead. If you accidentally passed it from a parent component, remove it from the DOM element.
\`\`\`

This warning is coming from the \`@rjsf/mui\` package (version 5.24.8) that we're using in our \`EnhancedConfigForm\` component. The issue is in the \`BaseInputTemplate\` component of the package, which is incorrectly passing \`slotProps\` directly to DOM elements.

## Steps to Reproduce
1. Navigate to any page that uses the \`EnhancedConfigForm\` component (e.g., the app configuration page)
2. Open the browser console
3. Observe the React warning about \`slotProps\`

## Impact
While this warning doesn't break functionality, it clutters the console and may indicate potential performance issues or future compatibility problems with React.

## Potential Solutions
1. Upgrade \`@rjsf/mui\` to a newer version if a fix is available
2. Create a custom wrapper component that intercepts and fixes the props before they're passed to the Form component
3. Fork and modify the \`BaseInputTemplate\` component to fix the issue
4. Add CSS to hide elements with the \`slotProps\` attribute

## Related Information
- This issue is documented in the RJSF GitHub repository: https://github.com/rjsf-team/react-jsonschema-form/issues/4535
- Our current version of \`@rjsf/mui\` is 5.24.8 (from package.json)
`;

  // GraphQL mutation to create an issue
  const mutation = `
    mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $priority: Int) {
      issueCreate(input: {
        title: $title,
        description: $description,
        teamId: $teamId,
        priority: $priority
      }) {
        success
        issue {
          id
          title
          url
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          title: issueTitle,
          description: issueDescription,
          teamId: teamId,
          priority: 3 // Medium priority
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('Error creating issue:', data.errors);
      return;
    }

    if (data.data.issueCreate.success) {
      const issue = data.data.issueCreate.issue;
      console.log(`Issue created successfully!`);
      console.log(`ID: ${issue.id}`);
      console.log(`Title: ${issue.title}`);
      console.log(`URL: ${issue.url}`);
    } else {
      console.error('Failed to create issue');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Main function
async function main() {
  // Get teams
  const teams = await getTeams();
  
  if (!teams || teams.length === 0) {
    console.error('No teams found or error fetching teams');
    return;
  }

  // Display teams for selection
  console.log('Available teams:');
  teams.forEach((team, index) => {
    console.log(`${index + 1}. ${team.name} (${team.id})`);
  });

  // If there's only one team, use it automatically
  if (teams.length === 1) {
    console.log(`Using the only available team: ${teams[0].name}`);
    await createIssue(teams[0].id);
    return;
  }

  // Otherwise, prompt for team selection
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Enter the number of the team to create the issue in: ', async (answer) => {
    const teamIndex = parseInt(answer) - 1;
    
    if (isNaN(teamIndex) || teamIndex < 0 || teamIndex >= teams.length) {
      console.error('Invalid team selection');
      readline.close();
      return;
    }

    const selectedTeam = teams[teamIndex];
    console.log(`Creating issue in team: ${selectedTeam.name}`);
    
    await createIssue(selectedTeam.id);
    readline.close();
  });
}

main();
