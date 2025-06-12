# LLM Integration Setup

The AI chat feature relies on environment variables configured on the server. Add the following keys to your `.env` file:

```
OPENAI_API_KEY=your-openai-key
OPENAI_API_BASE=https://api.openai.com/v1
HUGGINGFACE_API_KEY=your-huggingface-key
HUGGINGFACE_API_BASE=https://api-inference.huggingface.co/models/your-model
LOCAL_LLM_API_BASE=http://localhost:11434
LOCAL_LLM_MODEL=your-model-name
```

Only providers with valid configuration will be offered to the client.
