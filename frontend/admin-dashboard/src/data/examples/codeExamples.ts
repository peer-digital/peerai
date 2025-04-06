// Code examples for the Documentation page

export const completionsExample = {
  curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/completions \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Explain quantum computing",
    "max_tokens": 100,
    "temperature": 0.7,
    "model": "mistral-small-latest"
  }'`,
  response: `{
  "content": "Quantum computing is a form of computing that harnesses quantum mechanics...",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 150,
    "prompt_tokens": 50,
    "completion_tokens": 100
  },
  "latency_ms": 1234
}`
};

export const chatExample = {
  curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/completions \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "model": "mistral-small-latest",
    "temperature": 0.7
  }'`,
  response: `{
  "content": "The capital of France is Paris.",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 120,
    "prompt_tokens": 40,
    "completion_tokens": 80
  },
  "latency_ms": 890
}`
};

export const visionExample = {
  curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/vision \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/image.jpg",
    "prompt": "Describe this image",
    "model": "mistral-small-latest"
  }'`,
  response: `{
  "content": "The image shows a scenic mountain landscape...",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 100
  },
  "latency_ms": 2345
}`
};

export const audioExample = {
  curl: `# Note: In production, store your API key in environment variables or secrets management
# export PEERAI_API_KEY=your-api-key
# curl ... -H "X-API-Key: $PEERAI_API_KEY"

curl -X POST https://peerai-be.onrender.com/api/v1/llm/audio \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "audio_url": "https://example.com/audio.mp3",
    "model": "mistral-small-latest"
  }'`,
  response: `{
  "content": "This is a transcription of the audio file...",
  "model": "mistral-small-latest",
  "provider": "mistral",
  "usage": {
    "total_tokens": 80
  },
  "latency_ms": 1890
}`
};
